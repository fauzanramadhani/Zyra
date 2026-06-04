import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';
import { recalculateGoalProgress } from '../services/goal.service';

const checkArchived = async (goalId: string) => {
  const goal = await prisma.goal.findUnique({
    where: { id: goalId, deletedAt: null }
  });
  return goal?.archivedAt !== null && goal?.archivedAt !== undefined;
};

// --- Goals CRUD ---
export const listGoals = async (req: Request, res: Response) => {
  try {
    const { cycle, status, ownerId, projectId, workspaceId, includeArchived } = req.query;
    const where: any = { deletedAt: null };

    if (cycle) where.cycle = cycle as string;
    if (status) where.status = status as string;
    if (ownerId) where.ownerId = ownerId as string;

    if (includeArchived !== 'true') {
      where.archivedAt = null;
    }

    let targetWorkspaceId = workspaceId as string;
    let linkedGoalIds: string[] = [];
    let allTargetGoalIds: string[] = [];

    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId as string },
        select: { workspaceId: true },
      });
      if (project) {
        targetWorkspaceId = project.workspaceId;

        // Find all Epics in the project
        const epics = await prisma.issue.findMany({
          where: { projectId: projectId as string, type: 'EPIC', deletedAt: null },
          select: { id: true }
        });
        const epicIds = epics.map(e => e.id);

        // Find GoalLink records pointing to this project or its epics
        const links = await prisma.goalLink.findMany({
          where: {
            OR: [
              { entityType: 'PROJECT', entityId: projectId as string },
              { entityType: 'EPIC', entityId: { in: epicIds } }
            ]
          },
          select: { goalId: true }
        });
        linkedGoalIds = Array.from(new Set(links.map(l => l.goalId)));

        // Find parent goals of the linked Key Results
        const linkedGoals = await prisma.goal.findMany({
          where: { id: { in: linkedGoalIds }, deletedAt: null },
          select: { id: true, parentId: true }
        });

        const targetIdsSet = new Set<string>();
        linkedGoals.forEach(g => {
          targetIdsSet.add(g.id);
          if (g.parentId) {
            targetIdsSet.add(g.parentId);
          }
        });
        allTargetGoalIds = Array.from(targetIdsSet);
        where.id = { in: allTargetGoalIds };
      }
    }

    if (targetWorkspaceId) {
      where.workspaceId = targetWorkspaceId;
    }

    const goals = await prisma.goal.findMany({
      where: { ...where, parentId: null }, // Top-level goals only
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        children: {
          where: projectId ? { id: { in: linkedGoalIds }, deletedAt: null } : { deletedAt: null },
          include: {
            owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            linkedItems: true,
          },
        },
        linkedItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map dynamic isCompleted and displayStatus
    const mapGoal = (g: any) => {
      const isCompleted = g.progress === 100;
      const displayStatus = isCompleted ? 'COMPLETED' : g.status;
      return {
        ...g,
        isCompleted,
        displayStatus,
        children: g.children ? g.children.map((c: any) => ({
          ...c,
          isCompleted: c.progress === 100,
          displayStatus: c.progress === 100 ? 'COMPLETED' : c.status
        })) : []
      };
    };

    return success(res, goals.map(mapGoal));
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, description, workspaceId, projectId, parentId, type, targetValue, currentValue, unit, startDate, dueDate, cycle, trackingMethod, automaticSource, linkedEpicId, ownerId } = req.body;

    const actualOwnerId = ownerId || userId;
    if (!title || !actualOwnerId || !cycle) {
      return error(res, 'title, ownerId, and cycle are required fields', 400);
    }

    const cycleRegex = /^\d{4}-Q[1-4]$/;
    if (!cycleRegex.test(cycle)) {
      return error(res, 'cycle must be in YYYY-QN format (e.g., 2026-Q2)', 400);
    }

    let targetWorkspaceId = workspaceId;
    if (!targetWorkspaceId && projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { workspaceId: true },
      });
      if (project) {
        targetWorkspaceId = project.workspaceId;
      }
    }

    if (!targetWorkspaceId) {
      return error(res, 'workspaceId or projectId is required', 400);
    }

    const actualType = type || 'OBJECTIVE';

    const goal = await prisma.goal.create({
      data: {
        title,
        description,
        workspaceId: targetWorkspaceId,
        ownerId: actualOwnerId,
        parentId,
        type: actualType,
        targetValue: actualType === 'KEY_RESULT' ? (targetValue !== undefined ? targetValue : 100) : null,
        currentValue: actualType === 'KEY_RESULT' ? (currentValue || 0) : null,
        unit: actualType === 'KEY_RESULT' ? (unit || '') : null,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        cycle,
        trackingMethod: actualType === 'KEY_RESULT' ? (trackingMethod || 'MANUAL') : 'MANUAL',
        automaticSource: actualType === 'KEY_RESULT' && trackingMethod === 'AUTOMATIC' ? (automaticSource || 'PROJECT') : null,
      },
    });

    // Create automatically required link if created inside project context for Key Result
    if (projectId && actualType === 'KEY_RESULT') {
      if (trackingMethod === 'AUTOMATIC' && automaticSource === 'EPIC' && linkedEpicId) {
        await prisma.goalLink.create({
          data: { goalId: goal.id, entityType: 'EPIC', entityId: linkedEpicId }
        });
      } else {
        await prisma.goalLink.create({
          data: { goalId: goal.id, entityType: 'PROJECT', entityId: projectId }
        });
      }
      await recalculateGoalProgress(goal.id);
    }

    return success(res, goal, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const getGoal = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        children: {
          where: { deletedAt: null },
          include: {
            owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            linkedItems: true,
          },
        },
        linkedItems: true,
        parent: true,
        history: {
          include: {
            changedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
    });
    if (!goal) return error(res, 'Goal not found', 404);

    // Calculate individual progress for each linked item
    const linkedItemsWithProgress = [];
    for (const link of goal.linkedItems) {
      let progress = 0;
      if (link.entityType === 'PROJECT') {
        const total = await prisma.issue.count({ where: { projectId: link.entityId, deletedAt: null } });
        const done = await prisma.issue.count({
          where: {
            projectId: link.entityId,
            status: { name: { equals: 'Done', mode: 'insensitive' } },
            deletedAt: null
          }
        });
        progress = total > 0 ? Math.round((done / total) * 100) : 0;
      } else if (link.entityType === 'EPIC') {
        const total = await prisma.issue.count({
          where: {
            OR: [
              { epicId: link.entityId },
              { parentId: link.entityId }
            ],
            deletedAt: null
          }
        });
        if (total === 0) {
          const epicObj = await prisma.issue.findUnique({
            where: { id: link.entityId },
            include: { status: true }
          });
          const isEpicDone = epicObj?.status?.name?.toLowerCase() === 'done';
          progress = isEpicDone ? 100 : 0;
        } else {
          const done = await prisma.issue.count({
            where: {
              OR: [
                { epicId: link.entityId },
                { parentId: link.entityId }
              ],
              status: { name: { equals: 'Done', mode: 'insensitive' } },
              deletedAt: null
            }
          });
          progress = Math.round((done / total) * 100);
        }
      }
      linkedItemsWithProgress.push({
        ...link,
        progress
      });
    }

    const isCompleted = goal.progress === 100;
    const displayStatus = isCompleted ? 'COMPLETED' : goal.status;

    return success(res, {
      ...goal,
      isCompleted,
      displayStatus,
      linkedItems: linkedItemsWithProgress,
      children: goal.children ? goal.children.map((c: any) => ({
        ...c,
        isCompleted: c.progress === 100,
        displayStatus: c.progress === 100 ? 'COMPLETED' : c.status
      })) : []
    });
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateGoal = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { title, description, status, progress, currentValue, targetValue, unit, startDate, dueDate, cycle, trackingMethod, automaticSource, ownerId } = req.body;

    if (await checkArchived(goalId)) {
      return error(res, 'Goal is archived and read-only', 400);
    }

    const data: any = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (status) data.status = status;
    if (progress !== undefined) data.progress = progress;
    if (currentValue !== undefined) data.currentValue = currentValue;
    if (targetValue !== undefined) data.targetValue = targetValue;
    if (unit) data.unit = unit;
    if (startDate) data.startDate = new Date(startDate);
    if (dueDate) data.dueDate = new Date(dueDate);

    if (cycle !== undefined) {
      if (!cycle) {
        return error(res, 'cycle is required', 400);
      }
      const cycleRegex = /^\d{4}-Q[1-4]$/;
      if (!cycleRegex.test(cycle)) {
        return error(res, 'cycle must be in YYYY-QN format (e.g., 2026-Q2)', 400);
      }
      data.cycle = cycle;
    }

    if (ownerId !== undefined) {
      if (!ownerId) {
        return error(res, 'ownerId is required', 400);
      }
      data.ownerId = ownerId;
    }

    if (trackingMethod !== undefined) data.trackingMethod = trackingMethod;
    if (automaticSource !== undefined) data.automaticSource = automaticSource;

    const goal = await prisma.goal.update({ where: { id: goalId }, data });

    await recalculateGoalProgress(goal.id);

    return success(res, goal);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteGoal = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const userId = (req as any).user.id;

    const goal = await prisma.goal.findUnique({
      where: { id: goalId }
    });

    if (!goal) return error(res, 'Goal not found', 404);

    if (goal.archivedAt !== null) {
      return error(res, 'Goal is archived and read-only', 400);
    }

    // Role Restriction: Owner/Admin only
    const member = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: goal.workspaceId,
          userId: userId
        }
      }
    });

    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      return error(res, 'Only Workspace Owners or Admins are permitted to delete goals', 403);
    }

    // Objective deletion restriction: Cannot delete Objective if it has active child Key Results
    if (goal.type === 'OBJECTIVE') {
      const activeChildren = await prisma.goal.count({
        where: { parentId: goalId, type: 'KEY_RESULT', deletedAt: null }
      });
      if (activeChildren > 0) {
        return error(res, 'Objective still has child Key Results and cannot be deleted', 400);
      }
    }

    await prisma.goal.update({ where: { id: goalId }, data: { deletedAt: new Date() } });
    return success(res, { message: 'Goal deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Goal Links ---
export const linkEntity = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { entityType, entityId } = req.body;

    const goal = await prisma.goal.findUnique({ where: { id: goalId, deletedAt: null } });
    if (!goal) return error(res, 'Goal not found', 404);

    if (goal.archivedAt !== null) {
      return error(res, 'Goal is archived and read-only', 400);
    }

    if (goal.type === 'OBJECTIVE') {
      return error(res, 'Objectives cannot link directly to Projects or Epics. Key Results must be used instead.', 400);
    }

    const link = await prisma.goalLink.create({
      data: { goalId, entityType, entityId },
    });
    await recalculateGoalProgress(goalId);
    return success(res, link, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const unlinkEntity = async (req: Request, res: Response) => {
  try {
    const { linkId } = req.params;
    const link = await prisma.goalLink.findUnique({
      where: { id: linkId }
    });
    if (!link) return error(res, 'Link not found', 404);

    if (await checkArchived(link.goalId)) {
      return error(res, 'Goal is archived and read-only', 400);
    }

    await prisma.goalLink.delete({ where: { id: linkId } });
    await recalculateGoalProgress(link.goalId);
    return success(res, { message: 'Link removed' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateGoalProgressManual = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const userId = (req as any).user.id;
    const { currentValue, note } = req.body;

    if (await checkArchived(goalId)) {
      return error(res, 'Goal is archived and read-only', 400);
    }

    if (currentValue === undefined) {
      return error(res, 'currentValue is required', 400);
    }

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, deletedAt: null }
    });

    if (!goal) return error(res, 'Goal not found', 404);

    const oldValue = goal.currentValue || 0;
    const targetVal = goal.targetValue || 100;
    const calculatedProgress = Math.min(100, Math.max(0, (currentValue / targetVal) * 100));

    const updated = await prisma.$transaction(async (tx) => {
      await tx.goalProgressHistory.create({
        data: {
          goalId,
          changedById: userId,
          oldValue,
          newValue: currentValue,
          progress: calculatedProgress,
          note: note || null,
        }
      });

      const u = await tx.goal.update({
        where: { id: goalId },
        data: {
          currentValue,
          progress: calculatedProgress,
        }
      });

      return u;
    });

    await recalculateGoalProgress(goalId);

    return success(res, updated);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const archiveGoal = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: { archivedAt: new Date() }
    });
    return success(res, goal);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const unarchiveGoal = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const goal = await prisma.goal.update({
      where: { id: goalId },
      data: { archivedAt: null }
    });
    return success(res, goal);
  } catch (e: any) {
    return error(res, e.message);
  }
};

