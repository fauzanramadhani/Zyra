import { Response } from 'express';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export async function listWorkspaces(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'Unauthorized');

  try {
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            projects: {
              select: {
                id: true,
                name: true,
                key: true,
              },
            },
          },
        },
      },
    });

    const workspaces = memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      projects: m.workspace.projects,
    }));

    return sendSuccess(res, 'Workspaces loaded', workspaces);
  } catch (error: any) {
    console.error('List workspaces error:', error);
    return sendError(res, 500, 'Could not retrieve workspaces');
  }
}

export async function createWorkspace(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  if (!userId) return sendError(res, 401, 'Unauthorized');

  const { name, slug } = req.body;
  if (!name || !slug) {
    return sendError(res, 400, 'Name and slug are required');
  }

  try {
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (existing) {
      return sendError(res, 400, 'A workspace with this slug already exists');
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'ADMIN',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'WORKSPACE_CREATE',
        details: JSON.stringify({ id: workspace.id, name: workspace.name }),
        ipAddress: req.ip,
      },
    });

    return sendCreated(res, 'Workspace created', workspace);
  } catch (error: any) {
    console.error('Create workspace error:', error);
    return sendError(res, 500, 'Failed to create workspace');
  }
}

export async function getWorkspaceMembers(req: AuthenticatedRequest, res: Response) {
  const { workspaceId } = req.params;

  try {
    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const formattedMembers = members.map((m) => ({
      id: m.user.id,
      email: m.user.email,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      avatarUrl: m.user.avatarUrl,
      role: m.role,
    }));

    return sendSuccess(res, 'Members loaded', formattedMembers);
  } catch (error: any) {
    console.error('Get workspace members error:', error);
    return sendError(res, 500, 'Failed to retrieve workspace members');
  }
}

export async function addWorkspaceMember(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { workspaceId } = req.params;
  const { email, role } = req.body;

  if (!email || !role) {
    return sendError(res, 400, 'Email and role are required');
  }

  try {
    // 1. Verify current user is Admin or Owner of the workspace
    const currentMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: userId! },
      },
    });

    if (!currentMember || (currentMember.role !== 'ADMIN' && currentMember.role !== 'OWNER')) {
      return sendError(res, 403, 'Only workspace administrators or owners can invite members');
    }

    // 2. Find target user by email
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return sendError(res, 404, 'No user found with this email address. They must register first.');
    }

    // 3. Verify if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId: targetUser.id },
      },
    });

    if (existingMember) {
      return sendError(res, 400, 'User is already a member of this workspace');
    }

    // 4. Check duplicate pending invites
    const existingInvite = await prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        invitedEmail: email,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    });

    if (existingInvite) {
      return sendError(res, 400, 'An active invitation is already pending for this email address');
    }

    // 5. Create a Pending Invitation
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = await prisma.workspaceInvitation.create({
      data: {
        workspaceId,
        invitedEmail: email,
        invitedBy: userId!,
        role,
        token,
        expiresAt
      },
      include: { workspace: true }
    });

    // 6. Create in-app Notification for the recipient user
    const notification = await prisma.notification.create({
      data: {
        userId: targetUser.id,
        title: 'Workspace Invitation',
        message: `${req.user?.firstName} invited you to join workspace "${invitation.workspace.name}"`,
        link: `/workspace?invite=${invitation.id}`,
        type: 'INVITATION',
        senderId: userId
      }
    });

    // 7. Emit Socket.IO live notifications
    const { emitToUser } = await import('../services/websocket.service');
    emitToUser(targetUser.id, 'notification:new', notification);
    emitToUser(targetUser.id, 'invitation:received', {
      invitationId: invitation.id,
      workspaceName: invitation.workspace.name,
      role: invitation.role
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'INVITATION_CREATE',
        details: JSON.stringify({ invitedEmail: email, role, workspaceId }),
        ipAddress: req.ip,
      },
    });

    return sendCreated(res, 'Invitation sent successfully. Recipient must accept the invite to join.', invitation);
  } catch (error: any) {
    console.error('Invite workspace member error:', error);
    return sendError(res, 500, 'Failed to send workspace invitation');
  }
}

export async function updateWorkspace(req: AuthenticatedRequest, res: Response) {
  const { workspaceId } = req.params;
  const { name, slug, avatarUrl } = req.body;
  const userId = req.user?.id;

  try {
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: userId! } }
    });

    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      return sendError(res, 403, 'Only administrators or owners can update workspace settings');
    }

    const data: any = {};
    if (name) data.name = name;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (req.file) data.avatarUrl = `/uploads/${req.file.filename}`;

    if (slug) {
      const existing = await prisma.workspace.findFirst({
        where: { slug, id: { not: workspaceId } }
      });
      if (existing) {
        return sendError(res, 400, 'Workspace slug is already taken');
      }
      data.slug = slug;
    }

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'WORKSPACE_UPDATE',
        details: JSON.stringify(data),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, 'Workspace updated successfully', updated);
  } catch (error: any) {
    console.error('Update workspace error:', error);
    return sendError(res, 500, 'Failed to update workspace');
  }
}

export async function transferOwnership(req: AuthenticatedRequest, res: Response) {
  const { workspaceId } = req.params;
  const { newOwnerId } = req.body;
  const userId = req.user?.id;

  if (!newOwnerId) {
    return sendError(res, 400, 'New owner user ID is required');
  }

  try {
    // 1. Verify current user is OWNER
    const currentMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: userId! } }
    });

    if (!currentMember || currentMember.role !== 'OWNER') {
      return sendError(res, 403, 'Only the current workspace owner can transfer ownership');
    }

    // 2. Verify target user is member
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: newOwnerId } }
    });

    if (!targetMember) {
      return sendError(res, 400, 'New owner must be a member of the workspace first');
    }

    // 3. Do Transfer Transaction
    await prisma.$transaction(async (tx) => {
      // Demote current owner to ADMIN
      await tx.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: userId! } },
        data: { role: 'ADMIN' }
      });

      // Promote new owner to OWNER
      await tx.workspaceMember.update({
        where: { workspaceId_userId: { workspaceId, userId: newOwnerId } },
        data: { role: 'OWNER' }
      });
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'WORKSPACE_OWNERSHIP_TRANSFER',
        details: JSON.stringify({ workspaceId, from: userId, to: newOwnerId }),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, 'Workspace ownership transferred successfully');
  } catch (error: any) {
    console.error('Transfer ownership error:', error);
    return sendError(res, 500, 'Failed to transfer ownership');
  }
}

export async function removeWorkspaceMember(req: AuthenticatedRequest, res: Response) {
  const { workspaceId, userId: targetUserId } = req.params;
  const userId = req.user?.id;

  try {
    const currentMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: userId! } }
    });

    if (!currentMember || (currentMember.role !== 'OWNER' && currentMember.role !== 'ADMIN')) {
      return sendError(res, 403, 'Only administrators or owners can remove workspace members');
    }

    const targetMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });

    if (!targetMember) {
      return sendError(res, 404, 'Member not found');
    }

    if (targetMember.role === 'OWNER') {
      return sendError(res, 400, 'Cannot remove the workspace owner. Transfer ownership first.');
    }

    await prisma.workspaceMember.delete({
      where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'WORKSPACE_MEMBER_REMOVE',
        details: JSON.stringify({ workspaceId, removedUserId: targetUserId }),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, 'Member removed from workspace successfully');
  } catch (error: any) {
    console.error('Remove workspace member error:', error);
    return sendError(res, 500, 'Failed to remove workspace member');
  }
}

