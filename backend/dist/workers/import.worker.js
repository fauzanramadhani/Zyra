"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startImportWorker = startImportWorker;
const bullmq_1 = require("bullmq");
const fs = __importStar(require("fs"));
const csv_parse_1 = require("csv-parse");
const bcrypt = __importStar(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const import_queue_1 = require("../services/import.queue");
const websocket_service_1 = require("../services/websocket.service");
// Cleaner helpers for priority and type fuzzy normalization
function mapPriority(val) {
    const p = val.toUpperCase().trim();
    if (['1', 'CRITICAL', 'HIGHEST', 'BLOCKER', 'P0', 'P1'].includes(p))
        return 'HIGHEST';
    if (['2', 'HIGH', 'MAJOR', 'P2'].includes(p))
        return 'HIGH';
    if (['3', 'MEDIUM', 'NORMAL', 'P3', 'MINOR'].includes(p))
        return 'MEDIUM';
    return 'LOW';
}
function mapType(val) {
    const t = val.toUpperCase().trim();
    if (t.includes('BUG') || t.includes('DEFECT') || t.includes('ERROR'))
        return 'BUG';
    if (t.includes('STORY') || t.includes('FEATURE'))
        return 'STORY';
    if (t.includes('EPIC'))
        return 'EPIC';
    return 'TASK';
}
function startImportWorker() {
    const worker = new bullmq_1.Worker('importQueue', async (job) => {
        const { jobId, filePath, projectId, mappings, options, userId } = job.data;
        console.log(`Starting CSV Import Job: ${jobId} for project: ${projectId}`);
        // 1. Mark job as running
        await db_1.default.importJob.update({
            where: { id: jobId },
            data: {
                status: 'PROCESSING',
                startedAt: new Date(),
            },
        });
        // 2. Fetch project details & default board
        const project = await db_1.default.project.findUnique({
            where: { id: projectId },
            include: {
                boards: {
                    include: { columns: { orderBy: { position: 'asc' } } },
                },
            },
        });
        if (!project)
            throw new Error('Project not found');
        const board = project.boards[0];
        if (!board)
            throw new Error('Project does not have a default board');
        // First column is default status fallback
        let defaultStatusId = board.columns[0]?.id;
        if (!defaultStatusId) {
            // Create a default "To Do" column if none exist
            const newCol = await db_1.default.boardColumn.create({
                data: { name: 'To Do', position: 0, boardId: board.id },
            });
            defaultStatusId = newCol.id;
        }
        // 3. Read & Stream CSV
        const fileStream = fs.createReadStream(filePath);
        const parser = fileStream.pipe((0, csv_parse_1.parse)({
            columns: true, // Uses first row as header keys in record objects
            trim: true,
            skip_empty_lines: true,
            bom: true,
        }));
        let successRows = 0;
        let failedRows = 0;
        let rowNumber = 1; // Row 1 is usually header
        // Fetch sequential issue count baseline
        let currentIssueCount = await db_1.default.issue.count({ where: { projectId } });
        const defaultPassword = await bcrypt.hash('welcome123', 10);
        // Fetch total rows once from database to calculate progress without repeated db reads
        const importJobRecord = await db_1.default.importJob.findUnique({ where: { id: jobId } });
        const totalRowsCount = importJobRecord?.totalRows || 1;
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
                let storyPointsVal = null;
                let assigneeEmailVal = '';
                let labelsVal = '';
                const customFieldsVal = {};
                // Map CSV columns based on header mappings
                for (const [csvHeader, standardField] of Object.entries(mappings)) {
                    const cellValue = (record[csvHeader] || '').trim();
                    if (!cellValue)
                        continue;
                    const isExactHeader = (field) => csvHeader.toLowerCase() === field || csvHeader.toLowerCase().replace(/[^a-z0-9]/g, '') === field.replace(/[^a-z0-9]/g, '');
                    if (standardField === 'issueKey') {
                        if (!issueKeyVal || isExactHeader('issuekey') || isExactHeader('key')) {
                            issueKeyVal = cellValue;
                        }
                    }
                    else if (standardField === 'summary') {
                        if (!summaryVal || isExactHeader('summary')) {
                            summaryVal = cellValue;
                        }
                    }
                    else if (standardField === 'description') {
                        if (!descriptionVal || isExactHeader('description')) {
                            descriptionVal = cellValue;
                        }
                    }
                    else if (standardField === 'status') {
                        if (!statusVal || isExactHeader('status')) {
                            statusVal = cellValue;
                        }
                    }
                    else if (standardField === 'priority') {
                        if (priorityVal === 'MEDIUM' || isExactHeader('priority')) {
                            priorityVal = mapPriority(cellValue);
                        }
                    }
                    else if (standardField === 'type') {
                        if (typeVal === 'TASK' || isExactHeader('type') || isExactHeader('issuetype')) {
                            typeVal = mapType(cellValue);
                        }
                    }
                    else if (standardField === 'storyPoints') {
                        const parsedPts = parseFloat(cellValue);
                        if (!isNaN(parsedPts)) {
                            if (storyPointsVal === null || isExactHeader('storypoints')) {
                                storyPointsVal = parsedPts;
                            }
                        }
                    }
                    else if (standardField === 'assignee') {
                        if (!assigneeEmailVal || isExactHeader('assignee')) {
                            assigneeEmailVal = cellValue;
                        }
                    }
                    else if (standardField === 'labels') {
                        if (!labelsVal || isExactHeader('labels')) {
                            labelsVal = cellValue;
                        }
                    }
                    else {
                        // Custom fields mapping
                        customFieldsVal[standardField || csvHeader] = cellValue;
                    }
                }
                // Validation Check
                if (!summaryVal) {
                    throw new Error('Mandatory field "Summary" is missing or empty.');
                }
                // Resolve Assignee User
                let assigneeId = null;
                if (assigneeEmailVal) {
                    // Check if matches email format
                    const isEmail = assigneeEmailVal.includes('@');
                    const nameParts = assigneeEmailVal.split(/\s+/).filter(Boolean);
                    let user = await db_1.default.user.findFirst({
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
                        user = await db_1.default.user.create({
                            data: {
                                email: assigneeEmailVal,
                                firstName: first.charAt(0).toUpperCase() + first.slice(1),
                                lastName: last.charAt(0).toUpperCase() + last.slice(1),
                                passwordHash: defaultPassword,
                                avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${first}`,
                            },
                        });
                        // Add to workspace member automatically
                        await db_1.default.workspaceMember.create({
                            data: {
                                workspaceId: project.workspaceId,
                                userId: user.id,
                                role: 'MEMBER',
                            },
                        });
                    }
                    if (user) {
                        assigneeId = user.id;
                        // Ensure they belong to ProjectMember
                        const isProjectMember = await db_1.default.projectMember.findUnique({
                            where: { projectId_userId: { projectId, userId: user.id } },
                        });
                        if (!isProjectMember) {
                            await db_1.default.projectMember.create({
                                data: { projectId, userId: user.id, role: 'MEMBER' },
                            });
                        }
                    }
                }
                // Resolve statusId column
                let statusId = defaultStatusId;
                if (statusVal) {
                    let column = board.columns.find((c) => c.name.toLowerCase() === statusVal.toLowerCase());
                    if (!column && options.autoCreateStatuses) {
                        const maxPosCol = board.columns[board.columns.length - 1];
                        const nextPos = maxPosCol ? maxPosCol.position + 1 : 0;
                        column = await db_1.default.boardColumn.create({
                            data: {
                                name: statusVal.charAt(0).toUpperCase() + statusVal.slice(1),
                                position: nextPos,
                                boardId: board.id,
                            },
                        });
                        // Update memory representation of columns
                        board.columns.push(column);
                    }
                    if (column) {
                        statusId = column.id;
                    }
                }
                // Store labels in metadata customFields if provided
                if (labelsVal) {
                    customFieldsVal['labels'] = labelsVal;
                }
                // Resolve Duplicate / Key Assignment
                let resolvedKey = '';
                let existingIssueId = null;
                if (issueKeyVal) {
                    const existing = await db_1.default.issue.findUnique({
                        where: { key: issueKeyVal },
                    });
                    if (existing) {
                        if (options.duplicateHandling === 'skip') {
                            // Skip processing row
                            continue;
                        }
                        else if (options.duplicateHandling === 'overwrite') {
                            existingIssueId = existing.id;
                            resolvedKey = existing.key;
                        }
                    }
                    else {
                        resolvedKey = issueKeyVal;
                    }
                }
                if (!resolvedKey) {
                    currentIssueCount++;
                    resolvedKey = `${project.key}-${currentIssueCount}`;
                }
                // Insert or Update the Issue record
                await db_1.default.$transaction(async (tx) => {
                    let issueId = '';
                    if (existingIssueId) {
                        // Overwrite/Update existing issue
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
                            },
                        });
                        issueId = existingIssueId;
                    }
                    else {
                        // Create new issue
                        const created = await tx.issue.create({
                            data: {
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
                            },
                        });
                        issueId = created.id;
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
            }
            catch (rowErr) {
                failedRows++;
                console.error(`Error processing row ${rowNumber}:`, rowErr.message);
                // Save error detail logs
                await db_1.default.importError.create({
                    data: {
                        jobId,
                        rowNumber,
                        rawData: JSON.stringify(record),
                        errorMessage: rowErr.message || 'Row import validation failed',
                    },
                });
            }
            // 4. Update Job Progress and Emit WebSocket Updates
            const totalProcessed = successRows + failedRows;
            const computedProgress = Math.min(100, Math.round((totalProcessed / totalRowsCount) * 100));
            await db_1.default.importJob.update({
                where: { id: jobId },
                data: {
                    progress: computedProgress,
                    successRows,
                    failedRows,
                },
            });
            // Broadcast progress updates via socket.io
            (0, websocket_service_1.emitToUser)(userId, 'import:progress', {
                jobId,
                progress: computedProgress,
                successRows,
                failedRows,
                totalRows: totalRowsCount,
            });
        }
        // 5. Complete the job
        await db_1.default.importJob.update({
            where: { id: jobId },
            data: {
                status: 'COMPLETED',
                completedAt: new Date(),
            },
        });
        (0, websocket_service_1.emitToUser)(userId, 'import:completed', {
            jobId,
            successRows,
            failedRows,
        });
        // Cleanup CSV file on completion
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        console.log(`CSV Import Job ${jobId} Completed. Success: ${successRows}, Failed: ${failedRows}`);
        return { successRows, failedRows };
    }, {
        connection: import_queue_1.redisConnection,
        concurrency: 1, // Only process one heavy import job at a time
    });
    worker.on('failed', async (job, err) => {
        if (job) {
            const { jobId, filePath } = job.data;
            console.error(`CSV Import Job ${jobId} failed completely:`, err);
            await db_1.default.importJob.update({
                where: { id: jobId },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                },
            });
            // Clean up file if still exists
            if (filePath && fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    });
    return worker;
}
