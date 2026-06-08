import prisma from '../db';
import { emitToProject } from './websocket.service';
import { dispatchAutomationEvent } from './automation.engine';
import { syncGoalProgressOnIssueChange } from './goal.service';

export interface CreateIssueInput {
  projectId: string;
  summary: string;
  type: string;
  statusId: string;
  description?: string | null;
  priority?: string;
  storyPoints?: number | null;
  dueDate?: Date | null;
  sprintId?: string | null;
  assigneeId?: string | null;
  reporterId: string;
  parentId?: string | null;
  epicId?: string | null;
  customFields?: Record<string, any> | null;
  key?: string; // Optional: If provided, use it (e.g. from CSV import)
}

export interface CreateIssueOptions {
  skipWebsocket?: boolean;
  skipAutomation?: boolean;
  skipGoalSync?: boolean;
}

export class IssueService {
  /**
   * Centerpiece function for creating issues in Zyra.
   * Ensures transaction safety, key sequence formatting, layout sorting, custom fields, and all side effects.
   */
  static async createIssue(input: CreateIssueInput, options: CreateIssueOptions = {}, tx?: any) {
    const { projectId, statusId, summary, type, priority, reporterId } = input;

    if (!summary || !statusId || !type) {
      throw new Error('Summary, statusId, and type are required');
    }

    const execute = async (txClient: any) => {
      // 1. Validate Project & Board Column
      const project = await txClient.project.findUnique({ where: { id: projectId } });
      if (!project) throw new Error('Project not found');

      const status = await txClient.boardColumn.findUnique({ 
        where: { id: statusId },
        include: { board: true }
      });
      if (!status || status.board.projectId !== projectId) {
        throw new Error('Invalid statusId for this project');
      }

      // 2. Resolve or Generate Issue Key
      let key = input.key;
      if (!key) {
        const count = await txClient.issue.count({ where: { projectId } });
        key = `${project.key}-${count + 1}`;
      }

      // 3. Compute placement order (bottom of column)
      const lastInColumn = await txClient.issue.findFirst({
        where: { statusId, deletedAt: null },
        orderBy: { order: 'desc' },
        select: { order: true },
      });
      const newOrder = (lastInColumn?.order ?? 0) + 1000.0;

      // 4. Create Issue
      const created = await txClient.issue.create({
        data: {
          key,
          summary,
          description: input.description ?? null,
          statusId,
          priority: priority || 'MEDIUM',
          type,
          storyPoints: input.storyPoints ?? null,
          dueDate: input.dueDate ?? null,
          projectId,
          sprintId: input.sprintId ?? null,
          assigneeId: input.assigneeId ?? null,
          reporterId,
          parentId: input.parentId ?? null,
          epicId: input.epicId ?? null,
          order: newOrder,
        },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, avatarUrl: true },
          },
          status: true,
        },
      });

      // 5. Create Custom Fields
      if (input.customFields && typeof input.customFields === 'object') {
        const customFieldData = Object.entries(input.customFields).map(([name, val]) => ({
          issueId: created.id,
          fieldName: name,
          fieldValue: typeof val === 'string' ? val : JSON.stringify(val),
        }));
        if (customFieldData.length > 0) {
          await txClient.issueCustomField.createMany({ data: customFieldData });
        }
      }

      // 6. Create Activity Log
      await txClient.activity.create({
        data: {
          issueId: created.id,
          userId: reporterId,
          action: 'CREATE',
          details: JSON.stringify({ summary: created.summary, type: created.type }),
        },
      });

      return created;
    };

    const issue = tx 
      ? await execute(tx)
      : await prisma.$transaction(async (txClient) => await execute(txClient));

    // --- Side Effects ---
    if (!options.skipWebsocket) {
      emitToProject(projectId, 'issue:created', issue);
    }

    if (!options.skipAutomation) {
      dispatchAutomationEvent('issue_created', { 
        projectId, 
        userId: reporterId, 
        issueId: issue.id, 
        issue 
      });
    }

    if (!options.skipGoalSync) {
      // Runs async and safe from blocking response
      syncGoalProgressOnIssueChange(issue.id, projectId, issue.epicId, issue.parentId);
    }

    return issue;
  }
}
