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
    let projectId = req.params.projectId || req.body.projectId || req.query.projectId as string;

    if (!userId) return sendError(res, 401, 'Unauthorized');

    try {
      // If projectId is not directly present, try resolving it from parameters
      if (!projectId) {
        const issueId = req.params.issueId || req.body.issueId;
        const sprintId = req.params.sprintId || req.body.sprintId;
        
        if (issueId) {
          const issue = await prisma.issue.findUnique({
            where: { id: issueId },
            select: { projectId: true }
          });
          if (issue) projectId = issue.projectId;
        } else if (sprintId) {
          const sprint = await prisma.sprint.findUnique({
            where: { id: sprintId },
            select: { projectId: true }
          });
          if (sprint) projectId = sprint.projectId;
        }
      }

      if (!projectId) return sendError(res, 400, 'Project ID is required');
      // 1. Get project workspace
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) return sendError(res, 404, 'Project not found');

      // 2. Get Workspace Member details
      const wsMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } }
      });

      if (!wsMember) {
        return sendError(res, 403, 'You are not a member of this workspace');
      }

      // 3. OWNER and SUPER_ADMIN have full access to all projects in the workspace
      if (wsMember.role === 'OWNER' || wsMember.role === 'SUPER_ADMIN') {
        return next();
      }

      // 4. For ADMIN, MEMBER, and VIEWER: check project-specific access link
      const hasProjectAccess = await prisma.workspaceMemberProject.findUnique({
        where: {
          workspaceMemberId_projectId: {
            workspaceMemberId: wsMember.id,
            projectId: project.id
          }
        }
      });

      if (!hasProjectAccess) {
        return sendError(res, 403, 'You do not have access to this project');
      }

      // 5. Enforce role permission match
      if (!allowedRoles.includes(wsMember.role)) {
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

    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: issue.project.workspaceId, userId } }
    });
    if (!wsMember) return sendError(res, 403, 'You are not a member of this workspace');

    // 1. Check if Workspace OWNER/SUPER_ADMIN
    if (wsMember.role === 'OWNER' || wsMember.role === 'SUPER_ADMIN') {
      return next();
    }

    // 2. For ADMIN, MEMBER, VIEWER: must have project access
    const hasProjectAccess = await prisma.workspaceMemberProject.findUnique({
      where: {
        workspaceMemberId_projectId: {
          workspaceMemberId: wsMember.id,
          projectId: issue.projectId
        }
      }
    });

    if (!hasProjectAccess) {
      return sendError(res, 403, 'You do not have access to this project');
    }

    // VIEWER can never edit issues
    if (wsMember.role === 'VIEWER') {
      return sendError(res, 403, 'Viewers have read-only access');
    }

    // ADMIN can edit anything in their allowed projects
    if (wsMember.role === 'ADMIN') {
      return next();
    }

    // MEMBER can edit if they are assignee or reporter
    if (wsMember.role === 'MEMBER') {
      if (issue.assigneeId === userId || issue.reporterId === userId) {
        return next();
      }
      return sendError(res, 403, 'Only the assignee, reporter, or project admin can edit this issue');
    }

    return sendError(res, 403, 'Unauthorized');
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

    // 2. Is workspace OWNER/SUPER_ADMIN
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: comment.issue.project.workspaceId, userId } }
    });
    if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'SUPER_ADMIN')) {
      return next();
    }

    // 3. For ADMIN, MEMBER, VIEWER: check project access and if they are ADMIN
    if (wsMember) {
      const hasProjectAccess = await prisma.workspaceMemberProject.findUnique({
        where: {
          workspaceMemberId_projectId: {
            workspaceMemberId: wsMember.id,
            projectId: comment.issue.projectId
          }
        }
      });

      if (hasProjectAccess && wsMember.role === 'ADMIN') {
        return next();
      }
    }

    return sendError(res, 403, 'You are not authorized to modify this comment');
  } catch (error) {
    console.error('canModifyComment error:', error);
    return sendError(res, 500, 'Internal permission check error');
  }
}
