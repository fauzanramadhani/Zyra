import { Response } from 'express';
import prisma from '../db';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export async function listNotifications(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false, deletedAt: null }
    });

    return sendSuccess(res, 'Notifications loaded', {
      notifications,
      unreadCount,
      page,
      limit
    });
  } catch (error: any) {
    console.error('List notifications error:', error);
    return sendError(res, 500, 'Failed to load notifications');
  }
}

export async function readNotification(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return sendError(res, 404, 'Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    return sendSuccess(res, 'Notification marked as read', updated);
  } catch (error: any) {
    console.error('Read notification error:', error);
    return sendError(res, 500, 'Failed to update notification');
  }
}

export async function readAllNotifications(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true }
    });

    return sendSuccess(res, 'All notifications marked as read', null);
  } catch (error: any) {
    console.error('Read all notifications error:', error);
    return sendError(res, 500, 'Failed to update notifications');
  }
}

export async function deleteNotification(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const notification = await prisma.notification.findFirst({
      where: { id, userId }
    });

    if (!notification) {
      return sendError(res, 404, 'Notification not found');
    }

    const deleted = await prisma.notification.update({
      where: { id },
      data: { deletedAt: new Date() }
    });

    return sendSuccess(res, 'Notification deleted successfully', deleted);
  } catch (error: any) {
    console.error('Delete notification error:', error);
    return sendError(res, 500, 'Failed to delete notification');
  }
}
