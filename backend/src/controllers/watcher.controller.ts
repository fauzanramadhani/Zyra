import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List watchers for an issue
export const listWatchers = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const watchers = await prisma.issueWatcher.findMany({
      where: { issueId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } } },
    });
    res.json({ data: watchers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch watchers' });
  }
};

// Watch an issue
export const watchIssue = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const userId = (req as any).user.id;

    const existing = await prisma.issueWatcher.findUnique({
      where: { issueId_userId: { issueId, userId } },
    });
    if (existing) { res.status(200).json({ data: existing, message: 'Already watching' }); return; }

    const watcher = await prisma.issueWatcher.create({
      data: { issueId, userId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true } } },
    });

    res.status(201).json({ data: watcher });
  } catch (err) {
    res.status(500).json({ error: 'Failed to watch issue' });
  }
};

// Unwatch an issue
export const unwatchIssue = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const userId = (req as any).user.id;

    await prisma.issueWatcher.deleteMany({ where: { issueId, userId } });
    res.json({ message: 'Unwatched successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unwatch issue' });
  }
};

// Check if current user is watching
export const isWatching = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const userId = (req as any).user.id;

    const watcher = await prisma.issueWatcher.findUnique({
      where: { issueId_userId: { issueId, userId } },
    });
    res.json({ data: { watching: !!watcher } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check watch status' });
  }
};

// Notify watchers (utility - called internally)
export const notifyWatchers = async (issueId: string, excludeUserId: string, title: string, message: string, link?: string) => {
  try {
    const watchers = await prisma.issueWatcher.findMany({
      where: { issueId, userId: { not: excludeUserId } },
    });

    if (watchers.length > 0) {
      await prisma.notification.createMany({
        data: watchers.map((w) => ({
          userId: w.userId,
          title,
          message,
          link: link || null,
          type: 'COMMENT',
        })),
      });
    }
  } catch (err) {
    console.error('Failed to notify watchers:', err);
  }
};
