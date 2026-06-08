import { Worker, Job } from 'bullmq';
import * as fs from 'fs';
import { parse } from 'csv-parse';
import * as bcrypt from 'bcryptjs';
import prisma from '../db';
import { redisConnection } from '../services/import.queue';
import { emitToUser } from '../services/websocket.service';
import { IssueService } from '../services/issue.service';

interface ImportJobData {
  jobId: string;
  filePath: string;
  projectId: string;
  mappings: { [key: string]: string }; // CSV Header -> Standard Field Key
  options: {
    autoCreateUsers: boolean;
    autoCreateStatuses: boolean;
    autoCreateLabels: boolean;
    duplicateHandling: 'skip' | 'overwrite' | 'create_new';
  };
  userId: string;
}

// Cleaner helpers for priority and type fuzzy normalization
function mapPriority(val: string): string {
  const p = val.toUpperCase().trim();
  if (['1', 'CRITICAL', 'HIGHEST', 'BLOCKER', 'P0', 'P1'].includes(p)) return 'HIGHEST';
  if (['2', 'HIGH', 'MAJOR', 'P2'].includes(p)) return 'HIGH';
  if (['3', 'MEDIUM', 'NORMAL', 'P3', 'MINOR'].includes(p)) return 'MEDIUM';
  return 'LOW';
}

function mapType(val: string): string {
  const t = val.toUpperCase().trim();
  if (t.includes('BUG') || t.includes('DEFECT') || t.includes('ERROR')) return 'BUG';
  if (t.includes('STORY') || t.includes('FEATURE')) return 'STORY';
  if (t.includes('EPIC')) return 'EPIC';
  return 'TASK';
}

export function parseJiraDate(val: string): Date | null {
  if (!val) return null;
  
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Handle "26/May/26 4:34 PM" or "30/May/26 12:00 AM" format
  const parts = val.split(/[\/\s:]+/);
  if (parts.length >= 5) {
    const day = parseInt(parts[0]);
    const monthStr = parts[1];
    const yearStr = parts[2];
    let hour = parseInt(parts[3]);
    const minute = parseInt(parts[4]);
    const ampm = parts[5] ? parts[5].toUpperCase() : '';

    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    const month = months[monthStr.toLowerCase().slice(0, 3)];

    if (month !== undefined) {
      let year = parseInt(yearStr);
      if (yearStr.length === 2) {
        year += year < 50 ? 2000 : 1900;
      }
      
      if (ampm === 'PM' && hour < 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      const d = new Date(year, month, day, hour, minute);
      if (!isNaN(d.getTime())) return d;
    }
  }

  return null;
}

export function guessCategory(statusName: string): string {
  const name = statusName.toUpperCase();
  if (['DONE', 'RESOLVED', 'CLOSED', 'COMPLETED', 'FINISHED'].some(word => name.includes(word))) {
    return 'DONE';
  }
  if (['PROGRESS', 'REVIEW', 'TESTING', 'DEVELOPMENT', 'ACTIVE', 'IN WORK'].some(word => name.includes(word))) {
    return 'IN_PROGRESS';
  }
  return 'TODO';
}

export function startImportWorker() {
  const worker = new Worker(
    'importQueue',
    async (job: Job<ImportJobData>) => {
      const { jobId, filePath, projectId, mappings, options, userId } = job.data;

      console.log(`Starting CSV Import Job: ${jobId} for project: ${projectId}`);

      // 1. Mark job as running
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'PROCESSING',
          startedAt: new Date(),
        },
      });

      // 2. Fetch project details & default board
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          boards: {
            include: { columns: { orderBy: { position: 'asc' } } },
          },
        },
      });

      if (!project) throw new Error('Project not found');

      const board = project.boards[0];
      if (!board) throw new Error('Project does not have a default board');

      // First column is default status fallback
      let defaultStatusId = board.columns[0]?.id;
      if (!defaultStatusId) {
        const newCol = await prisma.boardColumn.create({
          data: { name: 'To Do', position: 0, boardId: board.id },
        });
        defaultStatusId = newCol.id;
        board.columns.push(newCol);
      }

      // 2b. Pre-scan unique statuses from the CSV file
      const uniqueStatuses = new Set<string>();
      const statusHeader = Object.keys(mappings).find(key => mappings[key] === 'status');
      if (statusHeader) {
        const preParser = fs.createReadStream(filePath).pipe(
          parse({
            columns: true,
            trim: true,
            skip_empty_lines: true,
            bom: true,
          })
        );
        for await (const record of preParser) {
          const val = (record[statusHeader] || '').trim();
          if (val) {
            uniqueStatuses.add(val);
          }
        }
      }

      // Find or create the active/default workflow for the project
      let workflow = await prisma.workflow.findFirst({
        where: { projectId, deletedAt: null, isDefault: true },
        include: { states: true },
      });
      if (!workflow) {
        workflow = await prisma.workflow.findFirst({
          where: { projectId, deletedAt: null },
          include: { states: true },
        });
      }
      if (!workflow) {
        workflow = await prisma.workflow.create({
          data: {
            name: `${project.name} Workflow`,
            projectId,
            isDefault: true,
          },
          include: { states: true },
        });
      }

      // Sync unique statuses with WorkflowState and BoardColumn
      for (const statusVal of uniqueStatuses) {
        const normalizedName = statusVal.charAt(0).toUpperCase() + statusVal.slice(1);
        
        let state = workflow.states.find(s => s.name.toLowerCase() === statusVal.toLowerCase());
        if (!state) {
          const category = guessCategory(statusVal);
          const color = category === 'DONE' ? '#10B981' : category === 'IN_PROGRESS' ? '#3B82F6' : '#6B7280';
          const maxPos = workflow.states.reduce((max, s) => Math.max(max, s.position), -1);
          state = await prisma.workflowState.create({
            data: {
              workflowId: workflow.id,
              name: normalizedName,
              category,
              color,
              position: maxPos + 1,
            }
          });
          workflow.states.push(state);
        }

        let column = board.columns.find(c => c.name.toLowerCase() === statusVal.toLowerCase());
        if (!column && options.autoCreateStatuses) {
          const maxPosCol = board.columns.reduce((max, c) => Math.max(max, c.position), -1);
          column = await prisma.boardColumn.create({
            data: {
              name: normalizedName,
              position: maxPosCol + 1,
              boardId: board.id,
              workflowStateId: state.id,
            }
          });
          board.columns.push(column);
        } else if (column && !column.workflowStateId) {
          const updatedCol = await prisma.boardColumn.update({
            where: { id: column.id },
            data: { workflowStateId: state.id },
          });
          const idx = board.columns.findIndex(c => c.id === updatedCol.id);
          if (idx !== -1) board.columns[idx] = updatedCol;
        }
      }

      // 3. Read & Stream CSV
      const fileStream = fs.createReadStream(filePath);
      const parser = fileStream.pipe(
        parse({
          columns: true, // Uses first row as header keys in record objects
          trim: true,
          skip_empty_lines: true,
          bom: true,
        })
      );

      let successRows = 0;
      let failedRows = 0;
      let rowNumber = 1; // Row 1 is usually header

      // Fetch sequential issue count baseline
      let currentIssueCount = await prisma.issue.count({ where: { projectId } });
      const defaultPassword = await bcrypt.hash('welcome123', 10);

      // Fetch total rows once from database to calculate progress without repeated db reads
      const importJobRecord = await prisma.importJob.findUnique({ where: { id: jobId } });
      const totalRowsCount = importJobRecord?.totalRows || 1;

      // Track parent-child relations
      const parentRelations: { childId: string; parentKey: string }[] = [];

      // We read records row-by-row
      for await (const record of parser) {
        rowNumber++;
        try {
          // Resolve standard mappings
          let issueKeyVal = '';
          let summaryVal = '';
          let descriptionVal = '';
          let statusVal = '';
          let priorityVal = 'MEDIUM';
          let typeVal = 'TASK';
          let storyPointsVal: number | null = null;
          let assigneeEmailVal = '';
          let labelsVal = '';
          let parentKeyVal = '';
          let sprintVal = '';
          let dueDateVal: Date | null = null;
          const customFieldsVal: { [key: string]: string } = {};

          // Map CSV columns based on header mappings
          for (const [csvHeader, standardField] of Object.entries(mappings)) {
            const cellValue = (record[csvHeader] || '').trim();
            if (!cellValue) continue;

            const isExactHeader = (field: string) => csvHeader.toLowerCase() === field || csvHeader.toLowerCase().replace(/[^a-z0-9]/g, '') === field.replace(/[^a-z0-9]/g, '');

            if (standardField === 'issueKey') {
              if (!issueKeyVal || isExactHeader('issuekey') || isExactHeader('key')) {
                issueKeyVal = cellValue;
              }
            } else if (standardField === 'summary') {
              if (!summaryVal || isExactHeader('summary')) {
                summaryVal = cellValue;
              }
            } else if (standardField === 'description') {
              if (!descriptionVal || isExactHeader('description')) {
                descriptionVal = cellValue;
              }
            } else if (standardField === 'status') {
              if (!statusVal || isExactHeader('status')) {
                statusVal = cellValue;
              }
            } else if (standardField === 'priority') {
              if (priorityVal === 'MEDIUM' || isExactHeader('priority')) {
                priorityVal = mapPriority(cellValue);
              }
            } else if (standardField === 'type') {
              if (typeVal === 'TASK' || isExactHeader('type') || isExactHeader('issuetype')) {
                typeVal = mapType(cellValue);
              }
            } else if (standardField === 'storyPoints') {
              const parsedPts = parseFloat(cellValue);
              if (!isNaN(parsedPts)) {
                if (storyPointsVal === null || isExactHeader('storypoints')) {
                  storyPointsVal = parsedPts;
                }
              }
            } else if (standardField === 'assignee') {
              if (!assigneeEmailVal || isExactHeader('assignee')) {
                assigneeEmailVal = cellValue;
              }
            } else if (standardField === 'labels') {
              if (!labelsVal || isExactHeader('labels')) {
                labelsVal = cellValue;
              }
            } else if (standardField === 'parentKey') {
              if (!parentKeyVal || isExactHeader('parentkey') || isExactHeader('parent')) {
                parentKeyVal = cellValue;
              }
            } else if (standardField === 'sprint') {
              if (!sprintVal || isExactHeader('sprint')) {
                sprintVal = cellValue;
              }
            } else if (standardField === 'dueDate') {
              const d = parseJiraDate(cellValue);
              if (d) {
                dueDateVal = d;
              }
            } else {
              // Custom fields mapping
              customFieldsVal[standardField || csvHeader] = cellValue;
            }
          }

          // Validation Check
          if (!summaryVal) {
            throw new Error('Mandatory field "Summary" is missing or empty.');
          }

          // Resolve Assignee User
          let assigneeId: string | null = null;
          if (assigneeEmailVal) {
            const isEmail = assigneeEmailVal.includes('@');
            const nameParts = assigneeEmailVal.split(/\s+/).filter(Boolean);
            let user = await prisma.user.findFirst({
              where: isEmail
                ? { email: assigneeEmailVal }
                : {
                    AND: nameParts.map((part) => ({
                      OR: [
                        { firstName: { contains: part, mode: 'insensitive' } },
                        { lastName: { contains: part, mode: 'insensitive' } },
                      ],
                    })),
                  },
            });

            if (!user && options.autoCreateUsers && isEmail) {
              const nameParts = assigneeEmailVal.split('@')[0].split(/[._-]/);
              const first = nameParts[0] || 'User';
              const last = nameParts[1] || 'Imported';
              user = await prisma.user.create({
                data: {
                  email: assigneeEmailVal,
                  firstName: first.charAt(0).toUpperCase() + first.slice(1),
                  lastName: last.charAt(0).toUpperCase() + last.slice(1),
                  passwordHash: defaultPassword,
                  avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${first}`,
                },
              });

              await prisma.workspaceMember.create({
                data: {
                  workspaceId: project.workspaceId,
                  userId: user.id,
                  role: 'MEMBER',
                },
              });
            }

            if (user) {
              assigneeId = user.id;

              const isProjectMember = await prisma.projectMember.findUnique({
                where: { projectId_userId: { projectId, userId: user.id } },
              });
              if (!isProjectMember) {
                await prisma.projectMember.create({
                  data: { projectId, userId: user.id, role: 'MEMBER' },
                });
              }
            }
          }

          // Resolve statusId column
          let statusId = defaultStatusId;
          if (statusVal) {
            const column = board.columns.find(
              (c) => c.name.toLowerCase() === statusVal.toLowerCase()
            );
            if (column) {
              statusId = column.id;
            }
          }

          // Resolve Sprint
          let sprintId: string | null = null;
          if (sprintVal) {
            let sprint = await prisma.sprint.findFirst({
              where: { projectId, name: sprintVal, deletedAt: null },
            });
            if (!sprint) {
              sprint = await prisma.sprint.create({
                data: {
                  name: sprintVal,
                  projectId,
                  status: 'FUTURE',
                },
              });
            }
            sprintId = sprint.id;
          }

          // Store labels in metadata customFields if provided
          if (labelsVal) {
            customFieldsVal['labels'] = labelsVal;
          }

          // Resolve Duplicate / Key Assignment
          let resolvedKey = '';
          let existingIssueId: string | null = null;

          if (issueKeyVal) {
            const existing = await prisma.issue.findUnique({
              where: { key: issueKeyVal },
            });
            if (existing) {
              if (options.duplicateHandling === 'skip') {
                continue;
              } else if (options.duplicateHandling === 'overwrite') {
                existingIssueId = existing.id;
                resolvedKey = existing.key;
              }
            } else {
              resolvedKey = issueKeyVal;
            }
          }

          if (!resolvedKey) {
            currentIssueCount++;
            resolvedKey = `${project.key}-${currentIssueCount}`;
          }

          // Insert or Update the Issue record
          await prisma.$transaction(async (tx) => {
            let issueId = '';

            if (existingIssueId) {
              await tx.issue.update({
                where: { id: existingIssueId },
                data: {
                  summary: summaryVal,
                  description: descriptionVal,
                  statusId,
                  priority: priorityVal,
                  type: typeVal,
                  storyPoints: storyPointsVal,
                  assigneeId,
                  dueDate: dueDateVal,
                  sprintId,
                },
              });
              issueId = existingIssueId;
            } else {
              const created = await IssueService.createIssue({
                key: resolvedKey,
                summary: summaryVal,
                description: descriptionVal,
                statusId,
                priority: priorityVal,
                type: typeVal,
                storyPoints: storyPointsVal,
                projectId,
                reporterId: userId,
                assigneeId,
                dueDate: dueDateVal,
                sprintId,
              }, {
                skipWebsocket: true,
                skipAutomation: true,
                skipGoalSync: false,
              }, tx);
              issueId = created.id;
            }

            // Create activity for updates (IssueService handles creation logs)
            if (existingIssueId) {
              await tx.activity.create({
                data: {
                  issueId,
                  userId,
                  action: 'CREATE',
                  details: JSON.stringify({ summary: summaryVal, type: typeVal, note: 'Imported from Jira CSV (Updated)' }),
                },
              });
            }

            // Parse and import comments
            const commentCols = Object.keys(record).filter(k => k.toLowerCase().startsWith('comment'));
            for (const col of commentCols) {
              const val = (record[col] || '').trim();
              if (val) {
                let authorId = userId;
                let body = val;
                const semicoIdx = val.indexOf(';');
                if (semicoIdx > 0) {
                  const parts = val.split(';');
                  if (parts.length >= 3) {
                    const emailOrUser = parts[1];
                    const commentBody = parts.slice(2).join(';');
                    const commentUser = await tx.user.findFirst({
                      where: { OR: [{ email: emailOrUser }, { username: emailOrUser }] }
                    });
                    if (commentUser) authorId = commentUser.id;
                    body = commentBody;
                  }
                }
                await tx.comment.create({
                  data: {
                    issueId,
                    authorId,
                    body,
                  }
                });
              }
            }

            // Parse and import attachments
            const attachmentCols = Object.keys(record).filter(k => k.toLowerCase().startsWith('attachment'));
            for (const col of attachmentCols) {
              const val = (record[col] || '').trim();
              if (val) {
                await tx.attachment.create({
                  data: {
                    issueId,
                    filename: val.substring(val.lastIndexOf('/') + 1) || val,
                    fileUrl: val,
                    mimeType: 'application/octet-stream',
                    size: 0,
                    uploadedById: userId,
                  }
                });
              }
            }

            if (parentKeyVal) {
              parentRelations.push({ childId: issueId, parentKey: parentKeyVal });
            }

            // Create/overwrite custom fields
            if (Object.keys(customFieldsVal).length > 0) {
              for (const [name, val] of Object.entries(customFieldsVal)) {
                await tx.issueCustomField.upsert({
                  where: {
                    issueId_fieldName: { issueId, fieldName: name },
                  },
                  update: { fieldValue: val },
                  create: { issueId, fieldName: name, fieldValue: val },
                });
              }
            }
          });

          successRows++;
        } catch (rowErr: any) {
          failedRows++;
          console.error(`Error processing row ${rowNumber}:`, rowErr.message);

          await prisma.importError.create({
            data: {
              jobId,
              rowNumber,
              rawData: JSON.stringify(record),
              errorMessage: rowErr.message || 'Row import validation failed',
            },
          });
        }

        const totalProcessed = successRows + failedRows;
        const computedProgress = Math.min(100, Math.round((totalProcessed / totalRowsCount) * 100));

        await prisma.importJob.update({
          where: { id: jobId },
          data: {
            progress: computedProgress,
            successRows,
            failedRows,
          },
        });

        emitToUser(userId, 'import:progress', {
          jobId,
          progress: computedProgress,
          successRows,
          failedRows,
          totalRows: totalRowsCount,
        });
      }

      // 4b. Resolve parent-child relations
      console.log(`Resolving parent-child relations for ${parentRelations.length} entries...`);
      for (const rel of parentRelations) {
        const parentIssue = await prisma.issue.findFirst({
          where: { projectId, key: rel.parentKey, deletedAt: null },
          select: { id: true },
        });
        if (parentIssue) {
          await prisma.issue.update({
            where: { id: rel.childId },
            data: { parentId: parentIssue.id },
          });
        }
      }

      // 5. Send Notification
      await prisma.notification.create({
        data: {
          userId,
          title: 'Import CSV Selesai',
          message: `Berhasil mengimport ${successRows} issue ke project ${project.name}.`,
          type: 'SYSTEM',
        },
      });

      // 6. Complete the job
      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      emitToUser(userId, 'import:completed', {
        jobId,
        successRows,
        failedRows,
      });

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      console.log(`CSV Import Job ${jobId} Completed. Success: ${successRows}, Failed: ${failedRows}`);
      return { successRows, failedRows };
    },
    {
      connection: redisConnection as any,
      concurrency: 1,
    }
  );

  worker.on('failed', async (job, err) => {
    if (job) {
      const { jobId, filePath } = job.data;
      console.error(`CSV Import Job ${jobId} failed completely:`, err);

      await prisma.importJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });

      if (filePath && fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  });

  return worker;
}
