"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listIssues = listIssues;
exports.createIssue = createIssue;
exports.getIssue = getIssue;
exports.updateIssue = updateIssue;
exports.moveIssue = moveIssue;
exports.deleteIssue = deleteIssue;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
const websocket_service_1 = require("../services/websocket.service");
// ─── Fractional Indexing Helpers ──────────────────────────────────────────────
const MIN_GAP = 1e-9; // If gap below this, trigger rebalance
const DEFAULT_SPACING = 1000.0;
/** Rebalances all issues in a column to sequential 1000, 2000, 3000 ... spacing */
async function rebalanceColumn(statusId) {
    const issues = await db_1.default.issue.findMany({
        where: { statusId, deletedAt: null },
        orderBy: { order: 'asc' },
        select: { id: true },
    });
    for (let i = 0; i < issues.length; i++) {
        await db_1.default.issue.update({
            where: { id: issues[i].id },
            data: { order: (i + 1) * DEFAULT_SPACING },
        });
    }
}
/** Calculates the new order value given neighbors */
async function computeNewOrder(statusId, beforeIssueId, afterIssueId) {
    let prevOrder = null;
    let nextOrder = null;
    // afterIssueId = the card ABOVE the drop position (smaller order)
    // beforeIssueId = the card BELOW the drop position (larger order)
    if (afterIssueId) {
        const after = await db_1.default.issue.findUnique({
            where: { id: afterIssueId },
            select: { order: true },
        });
        if (after)
            prevOrder = after.order;
    }
    if (beforeIssueId) {
        const before = await db_1.default.issue.findUnique({
            where: { id: beforeIssueId },
            select: { order: true },
        });
        if (before)
            nextOrder = before.order;
    }
    // If no neighbors, find max order in the column
    if (prevOrder === null && nextOrder === null) {
        const last = await db_1.default.issue.findFirst({
            where: { statusId, deletedAt: null },
            orderBy: { order: 'desc' },
            select: { order: true },
        });
        return (last?.order ?? 0) + DEFAULT_SPACING;
    }
    // Drop at top (no card above)
    if (prevOrder === null && nextOrder !== null) {
        return nextOrder - DEFAULT_SPACING;
    }
    // Drop at bottom (no card below)
    if (prevOrder !== null && nextOrder === null) {
        return prevOrder + DEFAULT_SPACING;
    }
    // Insert between two cards
    const gap = nextOrder - prevOrder;
    if (gap < MIN_GAP) {
        // Will rebalance after setting
        return prevOrder + gap / 2;
    }
    return prevOrder + gap / 2;
}
// ─── Controllers ──────────────────────────────────────────────────────────────
async function listIssues(req, res) {
    const { projectId } = req.params;
    const { search, statusId, assigneeId, type, priority, sprintId } = req.query;
    try {
        const filter = {
            projectId,
            deletedAt: null,
        };
        if (search) {
            filter.OR = [
                { summary: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { key: { contains: search, mode: 'insensitive' } },
            ];
        }
        if (statusId)
            filter.statusId = statusId;
        if (assigneeId)
            filter.assigneeId = assigneeId === 'null' ? null : assigneeId;
        if (type)
            filter.type = type;
        if (priority)
            filter.priority = priority;
        if (sprintId) {
            filter.sprintId = sprintId === 'null' ? null : sprintId;
        }
        const issues = await db_1.default.issue.findMany({
            where: filter,
            include: {
                assignee: {
                    select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
                },
                reporter: {
                    select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
                },
                status: true,
                sprint: true,
            },
            orderBy: { order: 'asc' }, // Sort by fractional order
        });
        return (0, response_1.sendSuccess)(res, 'Issues loaded', issues);
    }
    catch (error) {
        console.error('List issues error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to load issues');
    }
}
async function createIssue(req, res) {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { summary, description, statusId, priority, type, storyPoints, dueDate, sprintId, assigneeId, parentId, customFields, } = req.body;
    if (!summary || !statusId || !type) {
        return (0, response_1.sendError)(res, 400, 'Summary, statusId, and type are required');
    }
    try {
        const project = await db_1.default.project.findUnique({ where: { id: projectId } });
        if (!project)
            return (0, response_1.sendError)(res, 404, 'Project not found');
        const count = await db_1.default.issue.count({ where: { projectId } });
        const key = `${project.key}-${count + 1}`;
        // Find the max order in the target column so new issues go to the bottom
        const lastInColumn = await db_1.default.issue.findFirst({
            where: { statusId, deletedAt: null },
            orderBy: { order: 'desc' },
            select: { order: true },
        });
        const newOrder = (lastInColumn?.order ?? 0) + DEFAULT_SPACING;
        const issue = await db_1.default.$transaction(async (tx) => {
            const created = await tx.issue.create({
                data: {
                    key,
                    summary,
                    description,
                    statusId,
                    priority: priority || 'MEDIUM',
                    type,
                    storyPoints: storyPoints ? parseFloat(storyPoints) : null,
                    dueDate: dueDate ? new Date(dueDate) : null,
                    projectId,
                    sprintId: sprintId || null,
                    assigneeId: assigneeId || null,
                    reporterId: userId,
                    parentId: parentId || null,
                    order: newOrder,
                },
                include: {
                    assignee: {
                        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                    },
                    status: true,
                },
            });
            if (customFields && typeof customFields === 'object') {
                const customFieldData = Object.entries(customFields).map(([name, val]) => ({
                    issueId: created.id,
                    fieldName: name,
                    fieldValue: typeof val === 'string' ? val : JSON.stringify(val),
                }));
                if (customFieldData.length > 0) {
                    await tx.issueCustomField.createMany({ data: customFieldData });
                }
            }
            return created;
        });
        await db_1.default.activity.create({
            data: {
                issueId: issue.id,
                userId: userId,
                action: 'CREATE',
                details: JSON.stringify({ summary: issue.summary, type: issue.type }),
            },
        });
        (0, websocket_service_1.emitToProject)(projectId, 'issue:created', issue);
        return (0, response_1.sendCreated)(res, 'Issue created successfully', issue);
    }
    catch (error) {
        console.error('Create issue error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to create issue');
    }
}
async function getIssue(req, res) {
    const { issueId } = req.params;
    try {
        const issue = await db_1.default.issue.findUnique({
            where: { id: issueId, deletedAt: null },
            include: {
                assignee: {
                    select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
                },
                reporter: {
                    select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true },
                },
                status: true,
                sprint: true,
                subtasks: {
                    where: { deletedAt: null },
                    include: {
                        assignee: { select: { id: true, firstName: true, avatarUrl: true } },
                        status: true,
                    },
                },
                customFields: true,
                comments: {
                    where: { deletedAt: null },
                    orderBy: { createdAt: 'desc' },
                    include: {
                        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                    },
                },
                attachments: {
                    include: {
                        uploadedBy: { select: { id: true, firstName: true } },
                    },
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        user: { select: { id: true, firstName: true, lastName: true } },
                    },
                },
            },
        });
        if (!issue)
            return (0, response_1.sendError)(res, 404, 'Issue not found');
        return (0, response_1.sendSuccess)(res, 'Issue loaded successfully', issue);
    }
    catch (error) {
        console.error('Get issue error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to retrieve issue details');
    }
}
async function updateIssue(req, res) {
    const userId = req.user?.id;
    const { issueId } = req.params;
    const { summary, description, statusId, priority, type, storyPoints, dueDate, sprintId, assigneeId, customFields, } = req.body;
    try {
        const original = await db_1.default.issue.findUnique({ where: { id: issueId } });
        if (!original)
            return (0, response_1.sendError)(res, 404, 'Issue not found');
        const changes = {};
        if (summary !== undefined && summary !== original.summary)
            changes.summary = { from: original.summary, to: summary };
        if (statusId !== undefined && statusId !== original.statusId)
            changes.statusId = { from: original.statusId, to: statusId };
        if (priority !== undefined && priority !== original.priority)
            changes.priority = { from: original.priority, to: priority };
        if (type !== undefined && type !== original.type)
            changes.type = { from: original.type, to: type };
        if (storyPoints !== undefined && original.storyPoints !== (storyPoints ? parseFloat(storyPoints) : null)) {
            changes.storyPoints = { from: original.storyPoints, to: storyPoints };
        }
        if (assigneeId !== undefined && assigneeId !== original.assigneeId)
            changes.assigneeId = { from: original.assigneeId, to: assigneeId };
        if (sprintId !== undefined && sprintId !== original.sprintId)
            changes.sprintId = { from: original.sprintId, to: sprintId };
        const updated = await db_1.default.$transaction(async (tx) => {
            const u = await tx.issue.update({
                where: { id: issueId },
                data: {
                    summary: summary !== undefined ? summary : undefined,
                    description: description !== undefined ? description : undefined,
                    statusId: statusId !== undefined ? statusId : undefined,
                    priority: priority !== undefined ? priority : undefined,
                    type: type !== undefined ? type : undefined,
                    storyPoints: storyPoints !== undefined ? (storyPoints ? parseFloat(storyPoints) : null) : undefined,
                    dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
                    sprintId: sprintId !== undefined ? (sprintId || null) : undefined,
                    assigneeId: assigneeId !== undefined ? (assigneeId || null) : undefined,
                },
                include: {
                    assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                    status: true,
                    sprint: true,
                },
            });
            if (customFields && typeof customFields === 'object') {
                for (const [name, val] of Object.entries(customFields)) {
                    const valString = typeof val === 'string' ? val : JSON.stringify(val);
                    await tx.issueCustomField.upsert({
                        where: { issueId_fieldName: { issueId, fieldName: name } },
                        update: { fieldValue: valString },
                        create: { issueId, fieldName: name, fieldValue: valString },
                    });
                }
            }
            return u;
        });
        if (Object.keys(changes).length > 0) {
            await db_1.default.activity.create({
                data: {
                    issueId: updated.id,
                    userId: userId,
                    action: 'UPDATE',
                    details: JSON.stringify(changes),
                },
            });
        }
        (0, websocket_service_1.emitToProject)(updated.projectId, 'issue:updated', updated);
        return (0, response_1.sendSuccess)(res, 'Issue updated successfully', updated);
    }
    catch (error) {
        console.error('Update issue error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update issue');
    }
}
async function moveIssue(req, res) {
    const userId = req.user?.id;
    const { issueId } = req.params;
    // beforeIssueId = card directly below the drop slot (larger order)
    // afterIssueId  = card directly above the drop slot (smaller order)
    const { statusId, beforeIssueId, afterIssueId } = req.body;
    if (!statusId) {
        return (0, response_1.sendError)(res, 400, 'Destination statusId is required');
    }
    try {
        const original = await db_1.default.issue.findUnique({
            where: { id: issueId },
            include: { status: true },
        });
        if (!original)
            return (0, response_1.sendError)(res, 404, 'Issue not found');
        // Compute the fractional order for the new position
        const newOrder = await computeNewOrder(statusId, beforeIssueId, afterIssueId);
        const updated = await db_1.default.issue.update({
            where: { id: issueId },
            data: { statusId, order: newOrder },
            include: {
                assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                status: true,
            },
        });
        // Check if gap is too small and rebalance the column
        if (beforeIssueId && afterIssueId) {
            const [before, after] = await Promise.all([
                db_1.default.issue.findUnique({ where: { id: beforeIssueId }, select: { order: true } }),
                db_1.default.issue.findUnique({ where: { id: afterIssueId }, select: { order: true } }),
            ]);
            if (before && after && Math.abs(before.order - after.order) < MIN_GAP * 10) {
                await rebalanceColumn(statusId);
                // Re-fetch updated issue with fresh order after rebalance
                const rebalanced = await db_1.default.issue.findUnique({
                    where: { id: issueId },
                    include: {
                        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
                        status: true,
                    },
                });
                if (rebalanced) {
                    const destCol = await db_1.default.boardColumn.findUnique({ where: { id: statusId } });
                    await db_1.default.activity.create({
                        data: {
                            issueId,
                            userId: userId,
                            action: 'UPDATE_STATUS',
                            details: JSON.stringify({ from: original.status.name, to: destCol?.name || 'Unknown' }),
                        },
                    });
                    (0, websocket_service_1.emitToProject)(rebalanced.projectId, 'board:updated', {
                        issueId,
                        fromStatusId: original.statusId,
                        toStatusId: statusId,
                        issue: rebalanced,
                    });
                    return (0, response_1.sendSuccess)(res, 'Issue moved and column rebalanced', rebalanced);
                }
            }
        }
        const destCol = await db_1.default.boardColumn.findUnique({ where: { id: statusId } });
        // Write activity only if status actually changed
        if (original.statusId !== statusId) {
            await db_1.default.activity.create({
                data: {
                    issueId,
                    userId: userId,
                    action: 'UPDATE_STATUS',
                    details: JSON.stringify({ from: original.status.name, to: destCol?.name || 'Unknown' }),
                },
            });
        }
        (0, websocket_service_1.emitToProject)(updated.projectId, 'board:updated', {
            issueId,
            fromStatusId: original.statusId,
            toStatusId: statusId,
            issue: updated,
        });
        return (0, response_1.sendSuccess)(res, 'Issue moved successfully', updated);
    }
    catch (error) {
        console.error('Move issue error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to relocate issue card');
    }
}
async function deleteIssue(req, res) {
    const userId = req.user?.id;
    const { issueId } = req.params;
    try {
        const issue = await db_1.default.issue.update({
            where: { id: issueId },
            data: { deletedAt: new Date() },
        });
        await db_1.default.activity.create({
            data: {
                issueId,
                userId: userId,
                action: 'DELETE',
                details: JSON.stringify({ key: issue.key }),
            },
        });
        (0, websocket_service_1.emitToProject)(issue.projectId, 'issue:deleted', { issueId });
        return (0, response_1.sendSuccess)(res, 'Issue soft-deleted successfully');
    }
    catch (error) {
        console.error('Delete issue error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to delete issue');
    }
}
