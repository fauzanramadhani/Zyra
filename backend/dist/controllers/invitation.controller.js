"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInvitation = createInvitation;
exports.acceptInvitation = acceptInvitation;
exports.rejectInvitation = rejectInvitation;
exports.deleteInvitation = deleteInvitation;
exports.listWorkspaceInvitations = listWorkspaceInvitations;
exports.listUserInvitations = listUserInvitations;
const crypto_1 = __importDefault(require("crypto"));
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
const websocket_service_1 = require("../services/websocket.service");
async function createInvitation(req, res) {
    const userId = req.user?.id;
    const { workspaceId, email, role } = req.body;
    if (!workspaceId || !email || !role) {
        return (0, response_1.sendError)(res, 400, 'Workspace ID, email, and role are required');
    }
    try {
        // 1. Verify inviter is OWNER or ADMIN
        const member = await db_1.default.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: userId } }
        });
        if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
            return (0, response_1.sendError)(res, 403, 'Only administrators or owners can invite members');
        }
        // 2. Check if already a member
        const targetUser = await db_1.default.user.findUnique({ where: { email } });
        if (targetUser) {
            const existingMember = await db_1.default.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId, userId: targetUser.id } }
            });
            if (existingMember) {
                return (0, response_1.sendError)(res, 400, 'User is already a member of this workspace');
            }
        }
        // 3. Prevent duplicate active invites
        const existingInvite = await db_1.default.workspaceInvitation.findFirst({
            where: {
                workspaceId,
                invitedEmail: email,
                status: 'PENDING',
                expiresAt: { gt: new Date() }
            }
        });
        if (existingInvite) {
            return (0, response_1.sendError)(res, 400, 'An active invitation is already pending for this email');
        }
        // 4. Create Invitation token
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        const invitation = await db_1.default.workspaceInvitation.create({
            data: {
                workspaceId,
                invitedEmail: email,
                invitedBy: userId,
                role,
                token,
                expiresAt
            },
            include: { workspace: true }
        });
        // 5. Send notification if user exists
        if (targetUser) {
            const notification = await db_1.default.notification.create({
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
            (0, websocket_service_1.emitToUser)(targetUser.id, 'notification:new', notification);
            (0, websocket_service_1.emitToUser)(targetUser.id, 'invitation:received', {
                invitationId: invitation.id,
                workspaceName: invitation.workspace.name,
                role: invitation.role
            });
        }
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'INVITATION_CREATE',
                details: JSON.stringify({ invitedEmail: email, role, workspaceId }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendCreated)(res, 'Invitation created successfully', invitation);
    }
    catch (error) {
        console.error('Create invitation error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to create invitation');
    }
}
async function acceptInvitation(req, res) {
    const { id } = req.params;
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    try {
        const invite = await db_1.default.workspaceInvitation.findUnique({
            where: { id },
            include: { workspace: true }
        });
        if (!invite)
            return (0, response_1.sendError)(res, 404, 'Invitation not found');
        if (invite.status !== 'PENDING')
            return (0, response_1.sendError)(res, 400, `Invitation is already ${invite.status.toLowerCase()}`);
        if (invite.expiresAt < new Date()) {
            await db_1.default.workspaceInvitation.update({ where: { id }, data: { status: 'EXPIRED' } });
            return (0, response_1.sendError)(res, 400, 'Invitation has expired');
        }
        if (invite.invitedEmail !== userEmail) {
            return (0, response_1.sendError)(res, 403, 'This invitation was not sent to your email address');
        }
        // Accept Transaction
        const result = await db_1.default.$transaction(async (tx) => {
            // 1. Update invite status
            const updatedInvite = await tx.workspaceInvitation.update({
                where: { id },
                data: { status: 'ACCEPTED', acceptedAt: new Date() }
            });
            // 2. Add to workspace membership
            await tx.workspaceMember.create({
                data: {
                    workspaceId: invite.workspaceId,
                    userId: userId,
                    role: invite.role
                }
            });
            return updatedInvite;
        });
        // Notify the sender
        const notification = await db_1.default.notification.create({
            data: {
                userId: invite.invitedBy,
                title: 'Invitation Accepted',
                message: `${req.user?.firstName} accepted your invitation to join "${invite.workspace.name}"`,
                type: 'ROLE_CHANGE',
                senderId: userId
            }
        });
        (0, websocket_service_1.emitToUser)(invite.invitedBy, 'notification:new', notification);
        (0, websocket_service_1.emitToUser)(invite.invitedBy, 'invitation:accepted', { invitationId: id, userEmail });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'INVITATION_ACCEPT',
                details: JSON.stringify({ id, workspaceId: invite.workspaceId }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, 'Invitation accepted successfully', result);
    }
    catch (error) {
        console.error('Accept invitation error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to accept invitation');
    }
}
async function rejectInvitation(req, res) {
    const { id } = req.params;
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    try {
        const invite = await db_1.default.workspaceInvitation.findUnique({
            where: { id }
        });
        if (!invite)
            return (0, response_1.sendError)(res, 404, 'Invitation not found');
        if (invite.status !== 'PENDING')
            return (0, response_1.sendError)(res, 400, 'Invitation is not pending');
        if (invite.invitedEmail !== userEmail) {
            return (0, response_1.sendError)(res, 403, 'This invitation was not sent to your email address');
        }
        const updatedInvite = await db_1.default.workspaceInvitation.update({
            where: { id },
            data: { status: 'REJECTED', rejectedAt: new Date() }
        });
        // Notify the sender
        const notification = await db_1.default.notification.create({
            data: {
                userId: invite.invitedBy,
                title: 'Invitation Rejected',
                message: `${userEmail} declined your invitation to join workspace`,
                type: 'SYSTEM',
                senderId: userId
            }
        });
        (0, websocket_service_1.emitToUser)(invite.invitedBy, 'notification:new', notification);
        (0, websocket_service_1.emitToUser)(invite.invitedBy, 'invitation:rejected', { invitationId: id, userEmail });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'INVITATION_REJECT',
                details: JSON.stringify({ id }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, 'Invitation rejected successfully', updatedInvite);
    }
    catch (error) {
        console.error('Reject invitation error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to reject invitation');
    }
}
async function deleteInvitation(req, res) {
    const { id } = req.params;
    const userId = req.user?.id;
    try {
        const invite = await db_1.default.workspaceInvitation.findUnique({
            where: { id }
        });
        if (!invite)
            return (0, response_1.sendError)(res, 404, 'Invitation not found');
        // Only workspace ADMIN/OWNER can cancel/delete invite
        const wsMember = await db_1.default.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: invite.workspaceId, userId: userId } }
        });
        if (!wsMember || (wsMember.role !== 'OWNER' && wsMember.role !== 'ADMIN')) {
            return (0, response_1.sendError)(res, 403, 'Unauthorized to cancel invitations');
        }
        const cancelledInvite = await db_1.default.workspaceInvitation.update({
            where: { id },
            data: { status: 'CANCELLED', deletedAt: new Date() }
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'INVITATION_CANCEL',
                details: JSON.stringify({ id }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, 'Invitation cancelled successfully', cancelledInvite);
    }
    catch (error) {
        console.error('Delete invitation error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to cancel invitation');
    }
}
async function listWorkspaceInvitations(req, res) {
    const { workspaceId } = req.params;
    try {
        const invites = await db_1.default.workspaceInvitation.findMany({
            where: { workspaceId, deletedAt: null },
            orderBy: { createdAt: 'desc' }
        });
        return (0, response_1.sendSuccess)(res, 'Invitations retrieved successfully', invites);
    }
    catch (error) {
        console.error('List workspace invitations error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to load invitations');
    }
}
async function listUserInvitations(req, res) {
    const userEmail = req.user?.email;
    try {
        const invites = await db_1.default.workspaceInvitation.findMany({
            where: { invitedEmail: userEmail, status: 'PENDING', deletedAt: null },
            include: { workspace: true, sender: { select: { firstName: true, lastName: true } } },
            orderBy: { createdAt: 'desc' }
        });
        return (0, response_1.sendSuccess)(res, 'User invitations loaded successfully', invites);
    }
    catch (error) {
        console.error('List user invitations error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to load invitations');
    }
}
