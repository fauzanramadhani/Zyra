import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';
import { IssueService } from '../services/issue.service';
import { scheduleRecurringJob, removeRecurringJob } from '../services/recurring.service';

export const listRecurringIssues = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const items = await prisma.recurringIssue.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, items);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createRecurringIssue = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.id;
    const { templateData, schedule, timezone, enabled } = req.body;

    // Calculate next run
    const nextRunAt = calculateNextRun(schedule, timezone);

    const item = await prisma.recurringIssue.create({
      data: {
        projectId,
        templateData: JSON.stringify(templateData),
        schedule,
        timezone: timezone || 'UTC',
        enabled: enabled !== false,
        nextRunAt,
        createdBy: userId,
      },
    });

    // CRUD Integration: Schedule the delayed execution job
    await scheduleRecurringJob(item.id);

    return success(res, item, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateRecurringIssue = async (req: Request, res: Response) => {
  try {
    const { recurringId } = req.params;
    const { templateData, schedule, timezone, enabled } = req.body;
    const data: any = {};
    if (templateData) data.templateData = JSON.stringify(templateData);
    if (schedule) {
      data.schedule = schedule;
      data.nextRunAt = calculateNextRun(schedule, timezone);
    }
    if (timezone) data.timezone = timezone;
    if (enabled !== undefined) data.enabled = enabled;

    const item = await prisma.recurringIssue.update({ where: { id: recurringId }, data });

    // CRUD Integration: Reschedule if timing properties or active flags changed
    if (schedule !== undefined || timezone !== undefined || enabled !== undefined) {
      await removeRecurringJob(recurringId);
      if (item.enabled && !item.deletedAt) {
        await scheduleRecurringJob(recurringId);
      }
    }

    return success(res, item);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteRecurringIssue = async (req: Request, res: Response) => {
  try {
    const { recurringId } = req.params;
    await prisma.recurringIssue.update({ where: { id: recurringId }, data: { deletedAt: new Date() } });

    // CRUD Integration: Remove the scheduled delayed job
    await removeRecurringJob(recurringId);

    return success(res, { message: 'Recurring issue deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};


export const triggerRecurringIssue = async (req: Request, res: Response) => {
  try {
    const { recurringId } = req.params;
    const recurring = await prisma.recurringIssue.findUnique({ where: { id: recurringId } });
    if (!recurring) return error(res, 'Not found', 404);

    let template: any = {};
    try {
      template = JSON.parse(recurring.templateData || '{}');
    } catch {
      template = {};
    }
    const project = await prisma.project.findUnique({ where: { id: recurring.projectId }, include: { boards: { include: { columns: true } } } });
    if (!project) return error(res, 'Project not found', 404);

    const todoCol = project.boards[0]?.columns.find(c => c.position === 0);
    if (!todoCol) return error(res, 'No board column found', 400);

    const issue = await IssueService.createIssue({
      projectId: project.id,
      summary: template.summary,
      type: template.type || 'TASK',
      statusId: todoCol.id,
      description: template.description || null,
      priority: template.priority || 'MEDIUM',
      storyPoints: template.storyPoints || null,
      reporterId: recurring.createdBy,
      assigneeId: template.assigneeId || null,
    });

    await prisma.recurringIssue.update({
      where: { id: recurringId },
      data: { lastRunAt: new Date(), nextRunAt: calculateNextRun(recurring.schedule, recurring.timezone) },
    });

    return success(res, issue, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export function calculateNextRun(schedule: string, _timezone?: string): Date {
  const now = new Date();
  switch (schedule) {
    case 'DAILY':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'WEEKLY':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    case 'BIWEEKLY':
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    case 'MONTHLY':
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      return next;
    default:
      // Treat as cron - default to next day
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}
