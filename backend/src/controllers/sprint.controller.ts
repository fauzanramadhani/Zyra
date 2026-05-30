import { Request, Response } from 'express';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { emitToProject } from '../services/websocket.service';
import { dispatchAutomationEvent } from '../services/automation.engine';

export async function listSprints(req: Request, res: Response) {
  const { projectId } = req.params;
  const { includeArchived } = req.query;

  try {
    const sprints = await prisma.sprint.findMany({
      where: {
        projectId,
        ...(includeArchived !== 'true' ? { status: { not: 'ARCHIVED' } } : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      include: {
        issues: {
          where: { deletedAt: null },
          select: {
            id: true,
            key: true,
            summary: true,
            type: true,
            priority: true,
            storyPoints: true,
            statusId: true,
            assigneeId: true,
            sprintId: true,
            createdAt: true,
            status: { select: { id: true, name: true } },
            assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });

    return sendSuccess(res, 'Sprints loaded', sprints);
  } catch (error: any) {
    console.error('List sprints error:', error);
    return sendError(res, 500, 'Failed to load sprints');
  }
}

export async function createSprint(req: Request, res: Response) {
  const { projectId } = req.params;
  const { name, goal, startDate, endDate } = req.body;

  if (!name) {
    return sendError(res, 400, 'Sprint name is required');
  }

  try {
    const sprint = await prisma.sprint.create({
      data: {
        name,
        goal,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        projectId,
      },
    });

    emitToProject(projectId, 'sprint:created', sprint);
    return sendCreated(res, 'Sprint created successfully', sprint);
  } catch (error: any) {
    console.error('Create sprint error:', error);
    return sendError(res, 500, 'Failed to create sprint');
  }
}

export async function updateSprint(req: Request, res: Response) {
  const { sprintId } = req.params;
  const { name, goal, startDate, endDate, status } = req.body;

  try {
    // Validate: only one active sprint per project
    if (status === 'ACTIVE') {
      const existing = await prisma.sprint.findFirst({ where: { id: sprintId } });
      if (!existing) return sendError(res, 404, 'Sprint not found');

      const activeSprint = await prisma.sprint.findFirst({
        where: { projectId: existing.projectId, status: 'ACTIVE', id: { not: sprintId } },
      });
      if (activeSprint) {
        return sendError(res, 409, `Another sprint is already active: "${activeSprint.name}". Complete it first.`);
      }
    }

    const sprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...(name !== undefined && { name }),
        ...(goal !== undefined && { goal }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status !== undefined && { status }),
      },
    });

    emitToProject(sprint.projectId, 'sprint:updated', sprint);
    return sendSuccess(res, 'Sprint updated successfully', sprint);
  } catch (error: any) {
    console.error('Update sprint error:', error);
    return sendError(res, 500, 'Failed to update sprint');
  }
}

export async function startSprint(req: Request, res: Response) {
  const { sprintId } = req.params;
  const { startDate, endDate, duration } = req.body;

  try {
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) return sendError(res, 404, 'Sprint not found');
    if (sprint.status !== 'FUTURE') return sendError(res, 400, 'Only FUTURE sprints can be started');

    // Validate: only one active sprint per project
    const activeSprint = await prisma.sprint.findFirst({
      where: { projectId: sprint.projectId, status: 'ACTIVE' },
    });
    if (activeSprint) {
      return sendError(res, 409, `Another sprint is already active: "${activeSprint.name}". Complete it first.`);
    }

    const start = startDate ? new Date(startDate) : new Date();
    const durationDays = duration || 14;
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: { status: 'ACTIVE', startDate: start, endDate: end },
    });

    emitToProject(sprint.projectId, 'sprint:started', updated);
    dispatchAutomationEvent('sprint_started', { projectId: sprint.projectId, userId: (req as any).user?.id, sprintId, sprint: updated });
    return sendSuccess(res, 'Sprint started', updated);
  } catch (error: any) {
    console.error('Start sprint error:', error);
    return sendError(res, 500, 'Failed to start sprint');
  }
}

export async function completeSprint(req: Request, res: Response) {
  const { sprintId } = req.params;
  const { targetSprintId } = req.body; // Unfinished tickets go here, if null they go to backlog (sprintId = null)

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            boards: {
              include: {
                columns: true,
              },
            },
          },
        },
      },
    });

    if (!sprint) return sendError(res, 404, 'Sprint not found');

    // Find the 'Done' status column
    const defaultBoard = sprint.project.boards[0];
    const doneColumn = defaultBoard?.columns.find(
      (col) => col.name.toLowerCase() === 'done'
    );

    if (!doneColumn) {
      return sendError(res, 500, "Done column not defined on this project's board");
    }

    // Identify unfinished issues
    const unfinishedIssues = await prisma.issue.findMany({
      where: {
        sprintId,
        statusId: { not: doneColumn.id },
        deletedAt: null,
      },
    });

    await prisma.$transaction(async (tx) => {
      // 1. Move unfinished issues
      if (unfinishedIssues.length > 0) {
        const issueIds = unfinishedIssues.map((i) => i.id);
        await tx.issue.updateMany({
          where: { id: { in: issueIds } },
          data: { sprintId: targetSprintId || null },
        });
      }

      // 2. Mark sprint as completed
      await tx.sprint.update({
        where: { id: sprintId },
        data: { status: 'COMPLETED' },
      });
    });

    emitToProject(sprint.project.id || sprint.projectId, 'sprint:completed', { sprintId, movedIssuesCount: unfinishedIssues.length });
    dispatchAutomationEvent('sprint_completed', { projectId: sprint.project.id || sprint.projectId, userId: (req as any).user?.id, sprintId, sprint });
    return sendSuccess(res, 'Sprint completed successfully', {
      completedSprintId: sprintId,
      movedIssuesCount: unfinishedIssues.length,
    });
  } catch (error: any) {
    console.error('Complete sprint error:', error);
    return sendError(res, 500, 'Failed to complete sprint');
  }
}

export async function reopenSprint(req: Request, res: Response) {
  const { sprintId } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) return sendError(res, 404, 'Sprint not found');
    if (sprint.status !== 'COMPLETED') return sendError(res, 400, 'Only COMPLETED sprints can be reopened');

    // Validate: only one active sprint per project
    const activeSprint = await prisma.sprint.findFirst({
      where: { projectId: sprint.projectId, status: 'ACTIVE' },
    });
    if (activeSprint) {
      return sendError(res, 409, `Cannot reopen: "${activeSprint.name}" is currently active. Complete it first.`);
    }

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: { status: 'ACTIVE' },
    });

    emitToProject(sprint.projectId, 'sprint:reopened', updated);
    return sendSuccess(res, 'Sprint reopened', updated);
  } catch (error: any) {
    console.error('Reopen sprint error:', error);
    return sendError(res, 500, 'Failed to reopen sprint');
  }
}

export async function archiveSprint(req: Request, res: Response) {
  const { sprintId } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) return sendError(res, 404, 'Sprint not found');
    if (sprint.status === 'ACTIVE') return sendError(res, 400, 'Cannot archive an active sprint. Complete it first.');
    if (sprint.status === 'ARCHIVED') return sendError(res, 400, 'Sprint is already archived');

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: { status: 'ARCHIVED', archivedAt: new Date() },
    });

    emitToProject(sprint.projectId, 'sprint:archived', updated);
    return sendSuccess(res, 'Sprint archived', updated);
  } catch (error: any) {
    console.error('Archive sprint error:', error);
    return sendError(res, 500, 'Failed to archive sprint');
  }
}

export async function restoreSprint(req: Request, res: Response) {
  const { sprintId } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) return sendError(res, 404, 'Sprint not found');
    if (sprint.status !== 'ARCHIVED') return sendError(res, 400, 'Only ARCHIVED sprints can be restored');

    const updated = await prisma.sprint.update({
      where: { id: sprintId },
      data: { status: 'COMPLETED', archivedAt: null },
    });

    emitToProject(sprint.projectId, 'sprint:restored', updated);
    return sendSuccess(res, 'Sprint restored', updated);
  } catch (error: any) {
    console.error('Restore sprint error:', error);
    return sendError(res, 500, 'Failed to restore sprint');
  }
}

export async function getSprintStats(req: Request, res: Response) {
  const { sprintId } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            boards: { include: { columns: true } },
          },
        },
        issues: {
          where: { deletedAt: null },
          select: {
            id: true,
            type: true,
            priority: true,
            storyPoints: true,
            statusId: true,
            assigneeId: true,
            status: { select: { id: true, name: true } },
            assignee: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!sprint) return sendError(res, 404, 'Sprint not found');

    const issues = sprint.issues;
    const totalIssues = issues.length;
    const totalPoints = issues.reduce((sum: number, i) => sum + (i.storyPoints || 0), 0);

    // Find done column
    const defaultBoard = sprint.project.boards[0];
    const doneColumn = defaultBoard?.columns.find((col: any) => col.name.toLowerCase() === 'done');
    const doneIssues = doneColumn ? issues.filter((i) => i.statusId === doneColumn.id) : [];
    const completedPoints = doneIssues.reduce((sum: number, i) => sum + (i.storyPoints || 0), 0);

    // Status distribution
    const statusDistribution: Record<string, number> = {};
    issues.forEach((i) => {
      const name = i.status?.name || 'Unknown';
      statusDistribution[name] = (statusDistribution[name] || 0) + 1;
    });

    // Type distribution
    const typeDistribution: Record<string, number> = {};
    issues.forEach((i) => {
      typeDistribution[i.type] = (typeDistribution[i.type] || 0) + 1;
    });

    // Assignee workload
    const assigneeWorkload: Record<string, { name: string; count: number; points: number }> = {};
    issues.forEach((i) => {
      const key = i.assigneeId || 'unassigned';
      if (!assigneeWorkload[key]) {
        const displayName = i.assignee ? `${i.assignee.firstName} ${i.assignee.lastName}` : 'Unassigned';
        assigneeWorkload[key] = { name: displayName, count: 0, points: 0 };
      }
      assigneeWorkload[key].count++;
      assigneeWorkload[key].points += i.storyPoints || 0;
    });

    // Progress percentage
    const progress = totalIssues > 0 ? Math.round((doneIssues.length / totalIssues) * 100) : 0;

    // Days remaining
    let daysRemaining: number | null = null;
    if (sprint.endDate && sprint.status === 'ACTIVE') {
      daysRemaining = Math.max(0, Math.ceil((new Date(sprint.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    }

    return sendSuccess(res, 'Sprint stats', {
      sprintId: sprint.id,
      name: sprint.name,
      status: sprint.status,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      totalIssues,
      completedIssues: doneIssues.length,
      totalPoints,
      completedPoints,
      progress,
      daysRemaining,
      statusDistribution,
      typeDistribution,
      assigneeWorkload: Object.values(assigneeWorkload),
    });
  } catch (error: any) {
    console.error('Sprint stats error:', error);
    return sendError(res, 500, 'Failed to get sprint stats');
  }
}

export async function deleteSprint(req: Request, res: Response) {
  const { sprintId } = req.params;

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { issues: { where: { deletedAt: null }, select: { id: true } } },
    });
    if (!sprint) return sendError(res, 404, 'Sprint not found');
    if (sprint.status === 'ACTIVE') return sendError(res, 400, 'Cannot delete an active sprint. Complete it first.');

    await prisma.$transaction(async (tx) => {
      // Move all issues to backlog
      if (sprint.issues.length > 0) {
        await tx.issue.updateMany({
          where: { sprintId },
          data: { sprintId: null },
        });
      }
      // Soft delete
      await tx.sprint.update({
        where: { id: sprintId },
        data: { deletedAt: new Date() },
      });
    });

    emitToProject(sprint.projectId, 'sprint:deleted', { sprintId, movedIssues: sprint.issues.length });
    return sendSuccess(res, 'Sprint deleted', { movedIssues: sprint.issues.length });
  } catch (error: any) {
    console.error('Delete sprint error:', error);
    return sendError(res, 500, 'Failed to delete sprint');
  }
}

export async function reorderSprints(req: Request, res: Response) {
  const { projectId } = req.params;
  const { sprintIds } = req.body;

  if (!Array.isArray(sprintIds) || sprintIds.length === 0) {
    return sendError(res, 400, 'sprintIds array is required');
  }

  try {
    // We use updatedAt as a proxy for ordering since there's no explicit order field
    // Just validate they belong to the project
    const sprints = await prisma.sprint.findMany({
      where: { projectId, id: { in: sprintIds } },
    });

    if (sprints.length !== sprintIds.length) {
      return sendError(res, 400, 'Some sprint IDs do not belong to this project');
    }

    return sendSuccess(res, 'Sprint order acknowledged', { order: sprintIds });
  } catch (error: any) {
    console.error('Reorder sprints error:', error);
    return sendError(res, 500, 'Failed to reorder sprints');
  }
}
