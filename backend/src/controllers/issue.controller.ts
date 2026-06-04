import { Response } from 'express';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { emitToProject } from '../services/websocket.service';
import { dispatchAutomationEvent } from '../services/automation.engine';
import { syncGoalProgressOnIssueChange } from '../services/goal.service';

// ─── Fractional Indexing Helpers ──────────────────────────────────────────────

const MIN_GAP = 1e-9; // If gap below this, trigger rebalance
const DEFAULT_SPACING = 1000.0;

/** Rebalances all issues in a column to sequential 1000, 2000, 3000 ... spacing */
async function rebalanceColumn(statusId: string): Promise<void> {
  const issues = await prisma.issue.findMany({
    where: { statusId, deletedAt: null },
    orderBy: { order: 'asc' },
    select: { id: true },
  });
  for (let i = 0; i < issues.length; i++) {
    await prisma.issue.update({
      where: { id: issues[i].id },
      data: { order: (i + 1) * DEFAULT_SPACING },
    });
  }
}

/** Calculates the new order value given neighbors */
async function computeNewOrder(
  statusId: string,
  beforeIssueId?: string | null,
  afterIssueId?: string | null,
): Promise<number> {
  let prevOrder: number | null = null;
  let nextOrder: number | null = null;

  // afterIssueId = the card ABOVE the drop position (smaller order)
  // beforeIssueId = the card BELOW the drop position (larger order)
  if (afterIssueId) {
    const after = await prisma.issue.findUnique({
      where: { id: afterIssueId },
      select: { order: true },
    });
    if (after) prevOrder = after.order;
  }

  if (beforeIssueId) {
    const before = await prisma.issue.findUnique({
      where: { id: beforeIssueId },
      select: { order: true },
    });
    if (before) nextOrder = before.order;
  }

  // If no neighbors, find max order in the column
  if (prevOrder === null && nextOrder === null) {
    const last = await prisma.issue.findFirst({
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
  const gap = nextOrder! - prevOrder!;
  if (gap < MIN_GAP) {
    // Will rebalance after setting
    return prevOrder! + gap / 2;
  }
  return prevOrder! + gap / 2;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export async function listIssues(req: AuthenticatedRequest, res: Response) {
  const { projectId } = req.params;
  const { search, statusId, assigneeId, type, priority, sprintId } = req.query;

  try {
    const filter: any = {
      projectId,
      deletedAt: null,
    };

    if (search) {
      filter.OR = [
        { summary: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
        { key: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (statusId) filter.statusId = statusId as string;
    if (assigneeId) filter.assigneeId = assigneeId === 'null' ? null : (assigneeId as string);
    if (type) filter.type = type as string;
    if (priority) filter.priority = priority as string;

    if (sprintId) {
      filter.sprintId = sprintId === 'null' ? null : (sprintId as string);
    }

    const issues = await prisma.issue.findMany({
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

    return sendSuccess(res, 'Issues loaded', issues);
  } catch (error: any) {
    console.error('List issues error:', error);
    return sendError(res, 500, 'Failed to load issues');
  }
}

export async function createIssue(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { projectId } = req.params;
  const {
    summary,
    description,
    statusId,
    priority,
    type,
    storyPoints,
    dueDate,
    sprintId,
    assigneeId,
    parentId,
    customFields,
    epicId,
  } = req.body;

  if (!summary || !statusId || !type) {
    return sendError(res, 400, 'Summary, statusId, and type are required');
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return sendError(res, 404, 'Project not found');

    const status = await prisma.boardColumn.findUnique({ where: { id: statusId }, include: { board: true } });
    if (!status || status.board.projectId !== projectId) {
      return sendError(res, 400, 'Invalid statusId for this project');
    }

    const count = await prisma.issue.count({ where: { projectId } });
    const key = `${project.key}-${count + 1}`;

    // Find the max order in the target column so new issues go to the bottom
    const lastInColumn = await prisma.issue.findFirst({
      where: { statusId, deletedAt: null },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const newOrder = (lastInColumn?.order ?? 0) + DEFAULT_SPACING;

    const issue = await prisma.$transaction(async (tx) => {
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
          reporterId: userId!,
          parentId: parentId || null,
          epicId: epicId || null,
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

    await prisma.activity.create({
      data: {
        issueId: issue.id,
        userId: userId!,
        action: 'CREATE',
        details: JSON.stringify({ summary: issue.summary, type: issue.type }),
      },
    });

    emitToProject(projectId, 'issue:created', issue);
    dispatchAutomationEvent('issue_created', { projectId, userId, issueId: issue.id, issue });
    
    syncGoalProgressOnIssueChange(issue.id, projectId, issue.epicId, issue.parentId);

    return sendCreated(res, 'Issue created successfully', issue);
  } catch (error: any) {
    console.error('Create issue error:', error);
    return sendError(res, 500, 'Failed to create issue');
  }
}

export async function getIssue(req: AuthenticatedRequest, res: Response) {
  const { issueId } = req.params;

  try {
    const issue = await prisma.issue.findUnique({
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

    if (!issue) return sendError(res, 404, 'Issue not found');
    return sendSuccess(res, 'Issue loaded successfully', issue);
  } catch (error: any) {
    console.error('Get issue error:', error);
    return sendError(res, 500, 'Failed to retrieve issue details');
  }
}

export async function updateIssue(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { issueId } = req.params;
  const {
    summary,
    description,
    statusId,
    priority,
    type,
    storyPoints,
    dueDate,
    sprintId,
    assigneeId,
    customFields,
    epicId,
  } = req.body;

  try {
    const original = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!original) return sendError(res, 404, 'Issue not found');

    const changes: any = {};
    if (summary !== undefined && summary !== original.summary) changes.summary = { from: original.summary, to: summary };
    if (statusId !== undefined && statusId !== original.statusId) changes.statusId = { from: original.statusId, to: statusId };
    if (priority !== undefined && priority !== original.priority) changes.priority = { from: original.priority, to: priority };
    if (type !== undefined && type !== original.type) changes.type = { from: original.type, to: type };
    if (storyPoints !== undefined && original.storyPoints !== (storyPoints ? parseFloat(storyPoints) : null)) {
      changes.storyPoints = { from: original.storyPoints, to: storyPoints };
    }
    if (assigneeId !== undefined && assigneeId !== original.assigneeId) changes.assigneeId = { from: original.assigneeId, to: assigneeId };
    if (sprintId !== undefined && sprintId !== original.sprintId) changes.sprintId = { from: original.sprintId, to: sprintId };
    if (epicId !== undefined && epicId !== original.epicId) changes.epicId = { from: original.epicId, to: epicId };

    const updated = await prisma.$transaction(async (tx) => {
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
          epicId: epicId !== undefined ? (epicId || null) : undefined,
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
      await prisma.activity.create({
        data: {
          issueId: updated.id,
          userId: userId!,
          action: 'UPDATE',
          details: JSON.stringify(changes),
        },
      });
    }

    emitToProject(updated.projectId, 'issue:updated', updated);

    // Dispatch automation events
    if (Object.keys(changes).length > 0) {
      dispatchAutomationEvent('issue_updated', { projectId: updated.projectId, userId, issueId: updated.id, issue: updated, changes });
    }
    if (changes.statusId) {
      dispatchAutomationEvent('issue_status_changed', {
        projectId: updated.projectId, userId, issueId: updated.id, issue: updated,
        fromStatusId: changes.statusId.from, toStatusId: changes.statusId.to,
      });
    }
    if (changes.assigneeId) {
      dispatchAutomationEvent('issue_assigned', {
        projectId: updated.projectId, userId, issueId: updated.id, issue: updated,
        fromAssigneeId: changes.assigneeId.from, toAssigneeId: changes.assigneeId.to,
      });
    }
    if (changes.priority) {
      dispatchAutomationEvent('issue_priority_changed', {
        projectId: updated.projectId, userId, issueId: updated.id, issue: updated,
        fromPriority: changes.priority.from, toPriority: changes.priority.to,
      });
    }

    // Sync Goal Progress
    syncGoalProgressOnIssueChange(updated.id, updated.projectId, updated.epicId, updated.parentId);
    if (original.epicId && original.epicId !== updated.epicId) {
      syncGoalProgressOnIssueChange(updated.id, updated.projectId, original.epicId, original.parentId);
    }
    if (original.parentId && original.parentId !== updated.parentId) {
      syncGoalProgressOnIssueChange(updated.id, updated.projectId, original.epicId, original.parentId);
    }

    return sendSuccess(res, 'Issue updated successfully', updated);
  } catch (error: any) {
    console.error('Update issue error:', error);
    return sendError(res, 500, 'Failed to update issue');
  }
}

export async function moveIssue(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { issueId } = req.params;
  // beforeIssueId = card directly below the drop slot (larger order)
  // afterIssueId  = card directly above the drop slot (smaller order)
  const { statusId, beforeIssueId, afterIssueId, messageId } = req.body;

  if (!statusId) {
    return sendError(res, 400, 'Destination statusId is required');
  }

  try {
    const original = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { status: true },
    });
    if (!original) return sendError(res, 404, 'Issue not found');

    // Compute the fractional order for the new position
    const newOrder = await computeNewOrder(statusId, beforeIssueId, afterIssueId);

    const updated = await prisma.issue.update({
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
        prisma.issue.findUnique({ where: { id: beforeIssueId }, select: { order: true } }),
        prisma.issue.findUnique({ where: { id: afterIssueId }, select: { order: true } }),
      ]);
      if (before && after && Math.abs(before.order - after.order) < MIN_GAP * 10) {
        await rebalanceColumn(statusId);
        // Re-fetch updated issue with fresh order after rebalance
        const rebalanced = await prisma.issue.findUnique({
          where: { id: issueId },
          include: {
            assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            status: true,
          },
        });
        if (rebalanced) {
          const destCol = await prisma.boardColumn.findUnique({ where: { id: statusId } });
          await prisma.activity.create({
            data: {
              issueId,
              userId: userId!,
              action: 'UPDATE_STATUS',
              details: JSON.stringify({ from: original.status.name, to: destCol?.name || 'Unknown' }),
            },
          });
          emitToProject(rebalanced.projectId, 'board:updated', {
            issueId,
            fromStatusId: original.statusId,
            toStatusId: statusId,
            issue: rebalanced,
            messageId,
          });
          if (original.statusId !== statusId) {
            dispatchAutomationEvent('issue_status_changed', {
              projectId: rebalanced.projectId, userId, issueId, issue: rebalanced,
              fromStatusId: original.statusId, toStatusId: statusId,
            });
          }
          return sendSuccess(res, 'Issue moved and column rebalanced', rebalanced);
        }
      }
    }

    const destCol = await prisma.boardColumn.findUnique({ where: { id: statusId } });

    // Write activity only if status actually changed
    if (original.statusId !== statusId) {
      await prisma.activity.create({
        data: {
          issueId,
          userId: userId!,
          action: 'UPDATE_STATUS',
          details: JSON.stringify({ from: original.status.name, to: destCol?.name || 'Unknown' }),
        },
      });
    }

    emitToProject(updated.projectId, 'board:updated', {
      issueId,
      fromStatusId: original.statusId,
      toStatusId: statusId,
      issue: updated,
      messageId,
    });

    if (original.statusId !== statusId) {
      dispatchAutomationEvent('issue_status_changed', {
        projectId: updated.projectId, userId, issueId, issue: updated,
        fromStatusId: original.statusId, toStatusId: statusId,
      });
    }

    syncGoalProgressOnIssueChange(updated.id, updated.projectId, updated.epicId, updated.parentId);

    return sendSuccess(res, 'Issue moved successfully', updated);
  } catch (error: any) {
    console.error('Move issue error:', error);
    return sendError(res, 500, 'Failed to relocate issue card');
  }
}

export async function deleteIssue(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { issueId } = req.params;

  try {
    const issue = await prisma.issue.update({
      where: { id: issueId },
      data: { deletedAt: new Date() },
    });

    await prisma.activity.create({
      data: {
        issueId,
        userId: userId!,
        action: 'DELETE',
        details: JSON.stringify({ key: issue.key }),
      },
    });

    emitToProject(issue.projectId, 'issue:deleted', { issueId });
    dispatchAutomationEvent('issue_deleted', { projectId: issue.projectId, userId, issueId, issue });

    syncGoalProgressOnIssueChange(issue.id, issue.projectId, issue.epicId, issue.parentId);

    return sendSuccess(res, 'Issue soft-deleted successfully');
  } catch (error: any) {
    console.error('Delete issue error:', error);
    return sendError(res, 500, 'Failed to delete issue');
  }
}
