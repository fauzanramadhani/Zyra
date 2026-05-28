"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWorkspaces = listWorkspaces;
exports.createWorkspace = createWorkspace;
exports.getWorkspaceMembers = getWorkspaceMembers;
exports.addWorkspaceMember = addWorkspaceMember;
exports.updateWorkspace = updateWorkspace;
exports.transferOwnership = transferOwnership;
exports.removeWorkspaceMember = removeWorkspaceMember;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
async function listWorkspaces(req, res) {
    const userId = req.user?.id;
    if (!userId)
        return (0, response_1.sendError)(res, 401, 'Unauthorized');
    try {
        const memberships = await db_1.default.workspaceMember.findMany({
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
        return (0, response_1.sendSuccess)(res, 'Workspaces loaded', workspaces);
    }
    catch (error) {
        console.error('List workspaces error:', error);
        return (0, response_1.sendError)(res, 500, 'Could not retrieve workspaces');
    }
}
async function createWorkspace(req, res) {
    const userId = req.user?.id;
    if (!userId)
        return (0, response_1.sendError)(res, 401, 'Unauthorized');
    const { name, slug } = req.body;
    if (!name || !slug) {
        return (0, response_1.sendError)(res, 400, 'Name and slug are required');
    }
    try {
        const existing = await db_1.default.workspace.findUnique({ where: { slug } });
        if (existing) {
            return (0, response_1.sendError)(res, 400, 'A workspace with this slug already exists');
        }
        const workspace = await db_1.default.workspace.create({
            data: {
                name,
                slug,
            },
        });
        await db_1.default.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId,
                role: 'ADMIN',
            },
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'WORKSPACE_CREATE',
                details: JSON.stringify({ id: workspace.id, name: workspace.name }),
                ipAddress: req.ip,
            },
        });
        return (0, response_1.sendCreated)(res, 'Workspace created', workspace);
    }
    catch (error) {
        console.error('Create workspace error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to create workspace');
    }
}
async function getWorkspaceMembers(req, res) {
    const { workspaceId } = req.params;
    try {
        const members = await db_1.default.workspaceMember.findMany({
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
        return (0, response_1.sendSuccess)(res, 'Members loaded', formattedMembers);
    }
    catch (error) {
        console.error('Get workspace members error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to retrieve workspace members');
    }
}
async function addWorkspaceMember(req, res) {
    const userId = req.user?.id;
    const { workspaceId } = req.params;
    const { email, role } = req.body;
    if (!email || !role) {
        return (0, response_1.sendError)(res, 400, 'Email and role are required');
    }
    try {
        // 1. Verify current user is Admin of the workspace
        const currentMember = await db_1.default.workspaceMember.findUnique({
            where: {
                workspaceId_userId: { workspaceId, userId: userId },
            },
        });
        if (!currentMember || currentMember.role !== 'ADMIN') {
            return (0, response_1.sendError)(res, 403, 'Only workspace administrators can add members');
        }
        // 2. Find target user by email
        const targetUser = await db_1.default.user.findUnique({ where: { email } });
        if (!targetUser) {
            return (0, response_1.sendError)(res, 404, 'No user found with this email address. They must register first.');
        }
        // 3. Verify if already a member
        const existingMember = await db_1.default.workspaceMember.findUnique({
            where: {
                workspaceId_userId: { workspaceId, userId: targetUser.id },
            },
        });
        if (existingMember) {
            return (0, response_1.sendError)(res, 400, 'User is already a member of this workspace');
        }
        const member = await db_1.default.workspaceMember.create({
            data: {
                workspaceId,
                userId: targetUser.id,
                role,
            },
            include: {
                user: true,
            },
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'WORKSPACE_MEMBER_ADD',
                details: JSON.stringify({ workspaceId, addedUserId: targetUser.id, role }),
                ipAddress: req.ip,
            },
        });
        return (0, response_1.sendCreated)(res, 'Member added successfully', {
            id: member.user.id,
            email: member.user.email,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            avatarUrl: member.user.avatarUrl,
            role: member.role,
        });
    }
    catch (error) {
        console.error('Add workspace member error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to add workspace member');
    }
}
async function updateWorkspace(req, res) {
    const { workspaceId } = req.params;
    const { name, slug, avatarUrl } = req.body;
    const userId = req.user?.id;
    try {
        const member = await db_1.default.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: userId } }
        });
        if (!member || (member.role !== 'OWNER' && member.role !== 'ADMIN')) {
            return (0, response_1.sendError)(res, 403, 'Only administrators or owners can update workspace settings');
        }
        const data = {};
        if (name)
            data.name = name;
        if (avatarUrl !== undefined)
            data.avatarUrl = avatarUrl;
        if (req.file)
            data.avatarUrl = `/uploads/${req.file.filename}`;
        if (slug) {
            const existing = await db_1.default.workspace.findFirst({
                where: { slug, id: { not: workspaceId } }
            });
            if (existing) {
                return (0, response_1.sendError)(res, 400, 'Workspace slug is already taken');
            }
            data.slug = slug;
        }
        const updated = await db_1.default.workspace.update({
            where: { id: workspaceId },
            data
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'WORKSPACE_UPDATE',
                details: JSON.stringify(data),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, 'Workspace updated successfully', updated);
    }
    catch (error) {
        console.error('Update workspace error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update workspace');
    }
}
async function transferOwnership(req, res) {
    const { workspaceId } = req.params;
    const { newOwnerId } = req.body;
    const userId = req.user?.id;
    if (!newOwnerId) {
        return (0, response_1.sendError)(res, 400, 'New owner user ID is required');
    }
    try {
        // 1. Verify current user is OWNER
        const currentMember = await db_1.default.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: userId } }
        });
        if (!currentMember || currentMember.role !== 'OWNER') {
            return (0, response_1.sendError)(res, 403, 'Only the current workspace owner can transfer ownership');
        }
        // 2. Verify target user is member
        const targetMember = await db_1.default.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: newOwnerId } }
        });
        if (!targetMember) {
            return (0, response_1.sendError)(res, 400, 'New owner must be a member of the workspace first');
        }
        // 3. Do Transfer Transaction
        await db_1.default.$transaction(async (tx) => {
            // Demote current owner to ADMIN
            await tx.workspaceMember.update({
                where: { workspaceId_userId: { workspaceId, userId: userId } },
                data: { role: 'ADMIN' }
            });
            // Promote new owner to OWNER
            await tx.workspaceMember.update({
                where: { workspaceId_userId: { workspaceId, userId: newOwnerId } },
                data: { role: 'OWNER' }
            });
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'WORKSPACE_OWNERSHIP_TRANSFER',
                details: JSON.stringify({ workspaceId, from: userId, to: newOwnerId }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, 'Workspace ownership transferred successfully');
    }
    catch (error) {
        console.error('Transfer ownership error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to transfer ownership');
    }
}
async function removeWorkspaceMember(req, res) {
    const { workspaceId, userId: targetUserId } = req.params;
    const userId = req.user?.id;
    try {
        const currentMember = await db_1.default.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: userId } }
        });
        if (!currentMember || (currentMember.role !== 'OWNER' && currentMember.role !== 'ADMIN')) {
            return (0, response_1.sendError)(res, 403, 'Only administrators or owners can remove workspace members');
        }
        const targetMember = await db_1.default.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
        });
        if (!targetMember) {
            return (0, response_1.sendError)(res, 404, 'Member not found');
        }
        if (targetMember.role === 'OWNER') {
            return (0, response_1.sendError)(res, 400, 'Cannot remove the workspace owner. Transfer ownership first.');
        }
        await db_1.default.workspaceMember.delete({
            where: { workspaceId_userId: { workspaceId, userId: targetUserId } }
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'WORKSPACE_MEMBER_REMOVE',
                details: JSON.stringify({ workspaceId, removedUserId: targetUserId }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, 'Member removed from workspace successfully');
    }
    catch (error) {
        console.error('Remove workspace member error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to remove workspace member');
    }
}
