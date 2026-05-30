import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List work logs for an issue
export const listWorkLogs = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const logs = await prisma.workLog.findMany({
      where: { issueId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { loggedAt: 'desc' },
    });
    res.json({ data: logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch work logs' });
  }
};

// Add a work log
export const addWorkLog = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const userId = (req as any).user.id;
    const { timeSpent, description, startedAt } = req.body;

    if (!timeSpent || timeSpent <= 0) {
      res.status(400).json({ error: 'timeSpent must be a positive number (minutes)' });
      return;
    }

    const log = await prisma.workLog.create({
      data: {
        issueId,
        userId,
        timeSpent: parseInt(timeSpent),
        description: description || null,
        startedAt: startedAt ? new Date(startedAt) : null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });

    res.status(201).json({ data: log });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add work log' });
  }
};

// Update a work log
export const updateWorkLog = async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const userId = (req as any).user.id;
    const { timeSpent, description, startedAt } = req.body;

    const existing = await prisma.workLog.findUnique({ where: { id: logId } });
    if (!existing) { res.status(404).json({ error: 'Work log not found' }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: 'Not authorized' }); return; }

    const log = await prisma.workLog.update({
      where: { id: logId },
      data: {
        ...(timeSpent !== undefined && { timeSpent: parseInt(timeSpent) }),
        ...(description !== undefined && { description }),
        ...(startedAt !== undefined && { startedAt: startedAt ? new Date(startedAt) : null }),
      },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });

    res.json({ data: log });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update work log' });
  }
};

// Delete a work log
export const deleteWorkLog = async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;
    const userId = (req as any).user.id;

    const existing = await prisma.workLog.findUnique({ where: { id: logId } });
    if (!existing) { res.status(404).json({ error: 'Work log not found' }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: 'Not authorized' }); return; }

    await prisma.workLog.delete({ where: { id: logId } });
    res.json({ message: 'Work log deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete work log' });
  }
};

// Get time tracking summary for an issue
export const getIssueTimeSummary = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const logs = await prisma.workLog.findMany({ where: { issueId } });
    const totalMinutes = logs.reduce((sum, l) => sum + l.timeSpent, 0);
    
    const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { storyPoints: true } });
    
    res.json({
      data: {
        totalMinutes,
        totalHours: Math.round((totalMinutes / 60) * 100) / 100,
        logCount: logs.length,
        estimatedPoints: issue?.storyPoints || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get time summary' });
  }
};
