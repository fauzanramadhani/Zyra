import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- Goals CRUD ---
export const listGoals = async (req: Request, res: Response) => {
  try {
    const { cycle, status, ownerId } = req.query;
    const where: any = { workspaceId: undefined, deletedAt: null };
    // Goals are linked via owner's workspace membership
    if (cycle) where.cycle = cycle;
    if (status) where.status = status;
    if (ownerId) where.ownerId = ownerId;

    const goals = await prisma.goal.findMany({
      where: { ...where, parentId: null }, // Top-level goals only
      include: {
        owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        children: {
          include: {
            owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            linkedItems: true,
          },
        },
        linkedItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, goals);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createGoal = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { title, description, workspaceId, parentId, type, targetValue, unit, startDate, dueDate, cycle } = req.body;
    const goal = await prisma.goal.create({
      data: {
        title,
        description,
        workspaceId,
        ownerId: userId,
        parentId,
        type: type || 'OBJECTIVE',
        targetValue,
        unit,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        cycle,
      },
    });
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
          include: {
            owner: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
            linkedItems: true,
          },
        },
        linkedItems: true,
        parent: true,
      },
    });
    if (!goal) return error(res, 'Goal not found', 404);
    return success(res, goal);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateGoal = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
    const { title, description, status, progress, currentValue, targetValue, unit, startDate, dueDate, cycle } = req.body;
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
    if (cycle) data.cycle = cycle;

    const goal = await prisma.goal.update({ where: { id: goalId }, data });

    // Auto-calculate parent progress if this is a key result
    if (goal.parentId) {
      const siblings = await prisma.goal.findMany({ where: { parentId: goal.parentId, deletedAt: null } });
      const avgProgress = siblings.reduce((sum, s) => sum + s.progress, 0) / siblings.length;
      await prisma.goal.update({ where: { id: goal.parentId }, data: { progress: Math.round(avgProgress) } });
    }

    return success(res, goal);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteGoal = async (req: Request, res: Response) => {
  try {
    const { goalId } = req.params;
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
    const link = await prisma.goalLink.create({
      data: { goalId, entityType, entityId },
    });
    return success(res, link, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const unlinkEntity = async (req: Request, res: Response) => {
  try {
    const { linkId } = req.params;
    await prisma.goalLink.delete({ where: { id: linkId } });
    return success(res, { message: 'Link removed' });
  } catch (e: any) {
    return error(res, e.message);
  }
};
