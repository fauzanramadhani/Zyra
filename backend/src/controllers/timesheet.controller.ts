import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- Timesheets ---
export const getMyTimesheet = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { weekStart } = req.query;

    let weekDate: Date;
    if (weekStart) {
      weekDate = new Date(weekStart as string);
    } else {
      // Get current week's Monday
      const now = new Date();
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      weekDate = new Date(now.setDate(diff));
      weekDate.setHours(0, 0, 0, 0);
    }

    let timesheet = await prisma.timesheet.findUnique({
      where: { userId_weekStart: { userId, weekStart: weekDate } },
      include: { entries: { orderBy: { date: 'asc' } } },
    });

    if (!timesheet) {
      timesheet = await prisma.timesheet.create({
        data: { userId, weekStart: weekDate },
        include: { entries: { orderBy: { date: 'asc' } } },
      });
    }

    return success(res, timesheet);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const addTimesheetEntry = async (req: Request, res: Response) => {
  try {
    const { timesheetId } = req.params;
    const { issueId, projectId, date, minutes, description, billable } = req.body;

    const entry = await prisma.timesheetEntry.create({
      data: {
        timesheetId,
        issueId,
        projectId,
        date: new Date(date),
        minutes,
        description,
        billable: billable !== false,
      },
    });

    // Update total
    const entries = await prisma.timesheetEntry.findMany({ where: { timesheetId } });
    const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
    await prisma.timesheet.update({ where: { id: timesheetId }, data: { totalMinutes } });

    return success(res, entry, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateTimesheetEntry = async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const data = req.body;
    if (data.date) data.date = new Date(data.date);

    const entry = await prisma.timesheetEntry.update({ where: { id: entryId }, data });

    // Recalculate total
    const entries = await prisma.timesheetEntry.findMany({ where: { timesheetId: entry.timesheetId } });
    const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
    await prisma.timesheet.update({ where: { id: entry.timesheetId }, data: { totalMinutes } });

    return success(res, entry);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteTimesheetEntry = async (req: Request, res: Response) => {
  try {
    const { entryId } = req.params;
    const entry = await prisma.timesheetEntry.findUnique({ where: { id: entryId } });
    if (!entry) return error(res, 'Entry not found', 404);

    await prisma.timesheetEntry.delete({ where: { id: entryId } });

    // Recalculate total
    const entries = await prisma.timesheetEntry.findMany({ where: { timesheetId: entry.timesheetId } });
    const totalMinutes = entries.reduce((sum, e) => sum + e.minutes, 0);
    await prisma.timesheet.update({ where: { id: entry.timesheetId }, data: { totalMinutes } });

    return success(res, { message: 'Entry deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const submitTimesheet = async (req: Request, res: Response) => {
  try {
    const { timesheetId } = req.params;
    const timesheet = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: { status: 'SUBMITTED' },
    });
    return success(res, timesheet);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const approveTimesheet = async (req: Request, res: Response) => {
  try {
    const { timesheetId } = req.params;
    const userId = (req as any).user.id;
    const { decision } = req.body; // "APPROVED" or "REJECTED"

    const timesheet = await prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: decision,
        approvedBy: decision === 'APPROVED' ? userId : null,
        approvedAt: decision === 'APPROVED' ? new Date() : null,
      },
    });
    return success(res, timesheet);
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Time Reports ---
export const getTimeReport = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { startDate, endDate, userId } = req.query;

    const where: any = { projectId };
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }

    const entries = await prisma.timesheetEntry.findMany({
      where,
      include: {
        timesheet: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
      orderBy: { date: 'asc' },
    });

    // Filter by user if specified
    const filtered = userId
      ? entries.filter(e => e.timesheet.userId === userId)
      : entries;

    const totalMinutes = filtered.reduce((sum, e) => sum + e.minutes, 0);
    const billableMinutes = filtered.filter(e => e.billable).reduce((sum, e) => sum + e.minutes, 0);

    // Group by user
    const byUser: Record<string, { user: any; totalMinutes: number; billableMinutes: number }> = {};
    filtered.forEach(e => {
      const uid = e.timesheet.userId;
      if (!byUser[uid]) {
        byUser[uid] = { user: e.timesheet.user, totalMinutes: 0, billableMinutes: 0 };
      }
      byUser[uid].totalMinutes += e.minutes;
      if (e.billable) byUser[uid].billableMinutes += e.minutes;
    });

    return success(res, {
      totalMinutes,
      billableMinutes,
      nonBillableMinutes: totalMinutes - billableMinutes,
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      byUser: Object.values(byUser),
      entries: filtered,
    });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- User Time Summary ---
export const getUserTimeSummary = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { weeks } = req.query;
    const numWeeks = parseInt(weeks as string) || 4;

    const timesheets = await prisma.timesheet.findMany({
      where: { userId },
      include: { entries: true },
      orderBy: { weekStart: 'desc' },
      take: numWeeks,
    });

    return success(res, timesheets);
  } catch (e: any) {
    return error(res, e.message);
  }
};
