import { Response, NextFunction } from 'express';
import prisma from '../db';
import { AuthenticatedRequest } from '../types';
import { sendError } from '../utils/response';

export function requireWorkspaceRole(allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId as string;

    if (!userId) return sendError(res, 401, 'Unauthorized');
    if (!workspaceId) return sendError(res, 400, 'Workspace ID is required');

    try {
      const member = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId } }
      });

      if (!member || !allowedRoles.includes(member.role)) {
        return sendError(res, 403, 'You do not have permission to perform this action in this workspace');
      }

      return next();
    } catch (error) {
      console.error('requireWorkspaceRole error:', error);
      return sendError(res, 500, 'Internal permission check error');
    }
  };
}

export function requireProjectRole(allowedRoles: string[]) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId as string;

    if (!userId) return sendError(res, 401, 'Unauthorized');
    if (!projectId) return sendError(res, 400, 'Project ID is required');

    try {
      // 1. Get project workspace
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) return sendError(res, 404, 'Project not found');

      // 2. Check if user is Workspace OWNER or ADMIN (they bypass project role restrictions)
      const wsMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } }
      });

      if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN')) {
        return next();
      }

      // 3. Check project specific membership
      const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } }
      });

      if (!member || !allowedRoles.includes(member.role)) {
        return sendError(res, 403, 'You do not have permission to perform this action in this project');
      }

      return next();
    } catch (error) {
      console.error('requireProjectRole error:', error);
      return sendError(res, 500, 'Internal permission check error');
    }
  };
}

export async function canEditIssue(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  const issueId = req.params.issueId || req.body.issueId;

  if (!userId) return sendError(res, 401, 'Unauthorized');
  if (!issueId) return sendError(res, 400, 'Issue ID is required');

  try {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: { project: true }
    });

    if (!issue) return sendError(res, 404, 'Issue not found');

    // 1. Check if Workspace OWNER/ADMIN
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: issue.project.workspaceId, userId } }
    });
    if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN')) {
      return next();
    }

    // 2. Check if Project ADMIN
    const projMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: issue.projectId, userId } }
    });
    if (projMember && projMember.role === 'ADMIN') {
      return next();
    }

    // 3. Check if assignee or reporter
    if (issue.assigneeId === userId || issue.reporterId === userId) {
      return next();
    }

    return sendError(res, 403, 'Only the assignee, reporter, or project admin can edit this issue');
  } catch (error) {
    console.error('canEditIssue error:', error);
    return sendError(res, 500, 'Internal permission check error');
  }
}

export async function canModifyComment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  const commentId = req.params.commentId;

  if (!userId) return sendError(res, 401, 'Unauthorized');
  if (!commentId) return sendError(res, 400, 'Comment ID is required');

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: { issue: { include: { project: true } } }
    });

    if (!comment) return sendError(res, 404, 'Comment not found');

    // 1. Is author
    if (comment.authorId === userId) {
      return next();
    }

    // 2. Is workspace OWNER/ADMIN or project ADMIN
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: comment.issue.project.workspaceId, userId } }
    });
    if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN')) {
      return next();
    }

    const projMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: comment.issue.projectId, userId } }
    });
    if (projMember && projMember.role === 'ADMIN') {
      return next();
    }

    return sendError(res, 403, 'You are not authorized to modify this comment');
  } catch (error) {
    console.error('canModifyComment error:', error);
    return sendError(res, 500, 'Internal permission check error');
  }
}
