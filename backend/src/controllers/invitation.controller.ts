import { Response } from 'express';
import crypto from 'crypto';
import prisma from '../db';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { emitToUser } from '../services/websocket.service';

export async function createInvitation(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { workspaceId, email, role } = req.body;

  if (!workspaceId || !email || !role) {
    return sendError(res, 400, 'Workspace ID, email, and role are required');
  }

  try {
    // 1. Verify inviter is OWNER or ADMIN
    const member = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: userId! } }
    });

    if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
      return sendError(res, 403, 'Only administrators or owners can invite members');
    }

    // 2. Check if already a member
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (targetUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: targetUser.id } }
      });
      if (existingMember) {
        return sendError(res, 400, 'User is already a member of this workspace');
      }
    }

    // 3. Prevent duplicate active invites
    const existingInvite = await prisma.workspaceInvitation.findFirst({
      where: {
        workspaceId,
        invitedEmail: email,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    });

    if (existingInvite) {
      return sendError(res, 400, 'An active invitation is already pending for this email');
    }

    // 4. Create Invitation token
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

    // 5. Send notification if user exists
    if (targetUser) {
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

      // Emit real-time socket event
      emitToUser(targetUser.id, 'notification:new', notification);
      emitToUser(targetUser.id, 'invitation:received', {
        invitationId: invitation.id,
        workspaceName: invitation.workspace.name,
        role: invitation.role
      });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'INVITATION_CREATE',
        details: JSON.stringify({ invitedEmail: email, role, workspaceId }),
        ipAddress: req.ip
      }
    });

    return sendCreated(res, 'Invitation created successfully', invitation);
  } catch (error: any) {
    console.error('Create invitation error:', error);
    return sendError(res, 500, 'Failed to create invitation');
  }
}

export async function acceptInvitation(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;
  const userEmail = req.user?.email;

  try {
    const invite = await prisma.workspaceInvitation.findUnique({
      where: { id },
      include: { workspace: true }
    });

    if (!invite) return sendError(res, 404, 'Invitation not found');
    if (invite.status !== 'PENDING') return sendError(res, 400, `Invitation is already ${invite.status.toLowerCase()}`);
    if (invite.expiresAt < new Date()) {
      await prisma.workspaceInvitation.update({ where: { id }, data: { status: 'EXPIRED' } });
      return sendError(res, 400, 'Invitation has expired');
    }
    if (invite.invitedEmail !== userEmail) {
      return sendError(res, 403, 'This invitation was not sent to your email address');
    }

    // Accept Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update invite status
      const updatedInvite = await tx.workspaceInvitation.update({
        where: { id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() }
      });

      // 2. Add to workspace membership
      await tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId: userId!,
          role: invite.role
        }
      });

      return updatedInvite;
    });

    // Notify the sender
    const notification = await prisma.notification.create({
      data: {
        userId: invite.invitedBy,
        title: 'Invitation Accepted',
        message: `${req.user?.firstName} accepted your invitation to join "${invite.workspace.name}"`,
        type: 'ROLE_CHANGE',
        senderId: userId
      }
    });
    emitToUser(invite.invitedBy, 'notification:new', notification);
    emitToUser(invite.invitedBy, 'invitation:accepted', { invitationId: id, userEmail });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'INVITATION_ACCEPT',
        details: JSON.stringify({ id, workspaceId: invite.workspaceId }),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, 'Invitation accepted successfully', result);
  } catch (error: any) {
    console.error('Accept invitation error:', error);
    return sendError(res, 500, 'Failed to accept invitation');
  }
}

export async function rejectInvitation(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;
  const userEmail = req.user?.email;

  try {
    const invite = await prisma.workspaceInvitation.findUnique({
      where: { id }
    });

    if (!invite) return sendError(res, 404, 'Invitation not found');
    if (invite.status !== 'PENDING') return sendError(res, 400, 'Invitation is not pending');
    if (invite.invitedEmail !== userEmail) {
      return sendError(res, 403, 'This invitation was not sent to your email address');
    }

    const updatedInvite = await prisma.workspaceInvitation.update({
      where: { id },
      data: { status: 'REJECTED', rejectedAt: new Date() }
    });

    // Notify the sender
    const notification = await prisma.notification.create({
      data: {
        userId: invite.invitedBy,
        title: 'Invitation Rejected',
        message: `${userEmail} declined your invitation to join workspace`,
        type: 'SYSTEM',
        senderId: userId
      }
    });
    emitToUser(invite.invitedBy, 'notification:new', notification);
    emitToUser(invite.invitedBy, 'invitation:rejected', { invitationId: id, userEmail });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'INVITATION_REJECT',
        details: JSON.stringify({ id }),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, 'Invitation rejected successfully', updatedInvite);
  } catch (error: any) {
    console.error('Reject invitation error:', error);
    return sendError(res, 500, 'Failed to reject invitation');
  }
}

export async function deleteInvitation(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const invite = await prisma.workspaceInvitation.findUnique({
      where: { id }
    });

    if (!invite) return sendError(res, 404, 'Invitation not found');

    // Only workspace ADMIN/OWNER can cancel/delete invite
    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: userId! } }
    });
    if (!wsMember || (wsMember.role !== 'OWNER' && wsMember.role !== 'ADMIN')) {
      return sendError(res, 403, 'Unauthorized to cancel invitations');
    }

    const cancelledInvite = await prisma.workspaceInvitation.update({
      where: { id },
      data: { status: 'CANCELLED', deletedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'INVITATION_CANCEL',
        details: JSON.stringify({ id }),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, 'Invitation cancelled successfully', cancelledInvite);
  } catch (error: any) {
    console.error('Delete invitation error:', error);
    return sendError(res, 500, 'Failed to cancel invitation');
  }
}

export async function listWorkspaceInvitations(req: AuthenticatedRequest, res: Response) {
  const { workspaceId } = req.params;

  try {
    const invites = await prisma.workspaceInvitation.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'Invitations retrieved successfully', invites);
  } catch (error: any) {
    console.error('List workspace invitations error:', error);
    return sendError(res, 500, 'Failed to load invitations');
  }
}

export async function listUserInvitations(req: AuthenticatedRequest, res: Response) {
  const userEmail = req.user?.email;

  try {
    const invites = await prisma.workspaceInvitation.findMany({
      where: { invitedEmail: userEmail, status: 'PENDING', deletedAt: null },
      include: { workspace: true, sender: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'User invitations loaded successfully', invites);
  } catch (error: any) {
    console.error('List user invitations error:', error);
    return sendError(res, 500, 'Failed to load invitations');
  }
}
