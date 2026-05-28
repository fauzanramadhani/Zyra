import { Response } from 'express';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { emitToProject } from '../services/websocket.service';

export async function addComment(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { issueId } = req.params;
  const { body } = req.body;

  if (!body) {
    return sendError(res, 400, 'Comment body is required');
  }

  try {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return sendError(res, 404, 'Issue not found');

    const comment = await prisma.comment.create({
      data: {
        issueId,
        authorId: userId!,
        body,
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    // Write Activity log
    await prisma.activity.create({
      data: {
        issueId,
        userId: userId!,
        action: 'ADD_COMMENT',
        details: JSON.stringify({ commentId: comment.id }),
      },
    });

    // Notify issue detail viewers via WebSocket
    emitToProject(issue.projectId, 'comment:added', { issueId, comment });

    return sendCreated(res, 'Comment posted successfully', comment);
  } catch (error: any) {
    console.error('Add comment error:', error);
    return sendError(res, 500, 'Failed to add comment');
  }
}

export async function updateComment(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { commentId } = req.params;
  const { body } = req.body;

  if (!body) {
    return sendError(res, 400, 'Comment body is required');
  }

  try {
    const original = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!original) return sendError(res, 404, 'Comment not found');

    if (original.authorId !== userId) {
      return sendError(res, 403, 'You do not have permission to edit this comment');
    }

    const comment = await prisma.comment.update({
      where: { id: commentId },
      data: { body },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
      },
    });

    const issue = await prisma.issue.findUnique({ where: { id: comment.issueId } });

    // Notify issue detail viewers via WebSocket
    emitToProject(issue!.projectId, 'comment:updated', { issueId: comment.issueId, comment });

    return sendSuccess(res, 'Comment updated successfully', comment);
  } catch (error: any) {
    console.error('Update comment error:', error);
    return sendError(res, 500, 'Failed to edit comment');
  }
}

export async function deleteComment(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { commentId } = req.params;

  try {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) return sendError(res, 404, 'Comment not found');

    if (comment.authorId !== userId) {
      return sendError(res, 403, 'You do not have permission to delete this comment');
    }

    await prisma.comment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    const issue = await prisma.issue.findUnique({ where: { id: comment.issueId } });

    emitToProject(issue!.projectId, 'comment:deleted', { issueId: comment.issueId, commentId });

    return sendSuccess(res, 'Comment deleted successfully');
  } catch (error: any) {
    console.error('Delete comment error:', error);
    return sendError(res, 500, 'Failed to remove comment');
  }
}
