import { Response } from 'express';
import prisma from '../db';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export async function listTrash(req: AuthenticatedRequest, res: Response) {
  const { workspaceId } = req.query;

  if (!workspaceId) {
    return sendError(res, 400, 'Workspace ID is required');
  }

  try {
    // 1. Fetch deleted/archived projects
    const projects = await prisma.project.findMany({
      where: {
        workspaceId: workspaceId as string,
        OR: [
          { deletedAt: { not: null } },
          { archivedAt: { not: null } }
        ]
      }
    });

    // 2. Fetch deleted/archived issues
    const issues = await prisma.issue.findMany({
      where: {
        project: { workspaceId: workspaceId as string },
        OR: [
          { deletedAt: { not: null } },
          { archivedAt: { not: null } }
        ]
      },
      include: { project: true }
    });

    // 3. Fetch deleted/archived sprints
    const sprints = await prisma.sprint.findMany({
      where: {
        project: { workspaceId: workspaceId as string },
        OR: [
          { deletedAt: { not: null } },
          { archivedAt: { not: null } }
        ]
      },
      include: { project: true }
    });

    // 4. Fetch deleted/archived boards
    const boards = await prisma.board.findMany({
      where: {
        project: { workspaceId: workspaceId as string },
        OR: [
          { deletedAt: { not: null } },
          { archivedAt: { not: null } }
        ]
      },
      include: { project: true }
    });

    // 5. Fetch deleted/archived comments
    const comments = await prisma.comment.findMany({
      where: {
        issue: { project: { workspaceId: workspaceId as string } },
        OR: [
          { deletedAt: { not: null } },
          { archivedAt: { not: null } }
        ]
      },
      include: { issue: true }
    });

    return sendSuccess(res, 'Trash items loaded successfully', {
      projects,
      issues,
      sprints,
      boards,
      comments
    });
  } catch (error: any) {
    console.error('List trash error:', error);
    return sendError(res, 500, 'Failed to load trash items');
  }
}

export async function archiveItem(req: AuthenticatedRequest, res: Response) {
  const { type, id } = req.body;
  const userId = req.user?.id;

  if (!type || !id) {
    return sendError(res, 400, 'Type and ID are required');
  }

  try {
    let result: any;
    const now = new Date();

    switch (type.toLowerCase()) {
      case 'project':
        result = await prisma.project.update({ where: { id }, data: { archivedAt: now } });
        break;
      case 'issue':
        result = await prisma.issue.update({ where: { id }, data: { archivedAt: now } });
        break;
      case 'sprint':
        result = await prisma.sprint.update({ where: { id }, data: { archivedAt: now } });
        break;
      case 'board':
        result = await prisma.board.update({ where: { id }, data: { archivedAt: now } });
        break;
      case 'comment':
        result = await prisma.comment.update({ where: { id }, data: { archivedAt: now } });
        break;
      case 'workspace':
        result = await prisma.workspace.update({ where: { id }, data: { archivedAt: now } });
        break;
      default:
        return sendError(res, 400, 'Unsupported entity type for archiving');
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: `${type.toUpperCase()}_ARCHIVE`,
        details: JSON.stringify({ id }),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, `${type} archived successfully`, result);
  } catch (error: any) {
    console.error('Archive item error:', error);
    return sendError(res, 500, 'Failed to archive item');
  }
}

export async function restoreItem(req: AuthenticatedRequest, res: Response) {
  const { type, id } = req.body;
  const userId = req.user?.id;

  if (!type || !id) {
    return sendError(res, 400, 'Type and ID are required');
  }

  try {
    let result: any;

    switch (type.toLowerCase()) {
      case 'project':
        result = await prisma.project.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
        break;
      case 'issue':
        result = await prisma.issue.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
        break;
      case 'sprint':
        result = await prisma.sprint.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
        break;
      case 'board':
        result = await prisma.board.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
        break;
      case 'comment':
        result = await prisma.comment.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
        break;
      case 'workspace':
        result = await prisma.workspace.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
        break;
      default:
        return sendError(res, 400, 'Unsupported entity type for restoration');
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: `${type.toUpperCase()}_RESTORE`,
        details: JSON.stringify({ id }),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, `${type} restored successfully`, result);
  } catch (error: any) {
    console.error('Restore item error:', error);
    return sendError(res, 500, 'Failed to restore item');
  }
}

export async function purgeItem(req: AuthenticatedRequest, res: Response) {
  const { type, id } = req.body;
  const userId = req.user?.id;

  if (!type || !id) {
    return sendError(res, 400, 'Type and ID are required');
  }

  try {
    let result: any;

    switch (type.toLowerCase()) {
      case 'project':
        result = await prisma.project.delete({ where: { id } });
        break;
      case 'issue':
        result = await prisma.issue.delete({ where: { id } });
        break;
      case 'sprint':
        result = await prisma.sprint.delete({ where: { id } });
        break;
      case 'board':
        result = await prisma.board.delete({ where: { id } });
        break;
      case 'comment':
        result = await prisma.comment.delete({ where: { id } });
        break;
      case 'workspace':
        result = await prisma.workspace.delete({ where: { id } });
        break;
      default:
        return sendError(res, 400, 'Unsupported entity type for purging');
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: `${type.toUpperCase()}_PURGE`,
        details: JSON.stringify({ id }),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, `${type} permanently purged`, result);
  } catch (error: any) {
    console.error('Purge item error:', error);
    return sendError(res, 500, 'Failed to permanently purge item');
  }
}
