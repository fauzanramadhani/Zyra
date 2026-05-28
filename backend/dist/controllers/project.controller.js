"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listProjects = listProjects;
exports.createProject = createProject;
exports.getProject = getProject;
exports.addProjectMember = addProjectMember;
exports.deleteProject = deleteProject;
exports.updateProject = updateProject;
exports.removeProjectMember = removeProjectMember;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
async function listProjects(req, res) {
    const { workspaceId } = req.query;
    if (!workspaceId) {
        return (0, response_1.sendError)(res, 400, 'Workspace ID query parameter is required');
    }
    try {
        const projects = await db_1.default.project.findMany({
            where: {
                workspaceId: workspaceId,
                deletedAt: null,
            },
            include: {
                members: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
                boards: true,
            },
        });
        return (0, response_1.sendSuccess)(res, 'Projects loaded', projects);
    }
    catch (error) {
        console.error('List projects error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to retrieve projects');
    }
}
async function createProject(req, res) {
    const userId = req.user?.id;
    const { name, key, description, workspaceId } = req.body;
    if (!name || !key || !workspaceId) {
        return (0, response_1.sendError)(res, 400, 'Name, key, and workspaceId are required');
    }
    try {
        // Check if key is taken
        const existing = await db_1.default.project.findUnique({ where: { key } });
        if (existing) {
            return (0, response_1.sendError)(res, 400, `Project key '${key}' is already in use`);
        }
        // Create project, board, default columns, and members in a transaction
        const project = await db_1.default.$transaction(async (tx) => {
            const p = await tx.project.create({
                data: {
                    name,
                    key: key.toUpperCase(),
                    description,
                    workspaceId,
                    leadId: userId,
                },
            });
            // Add creator as Admin member
            await tx.projectMember.create({
                data: {
                    projectId: p.id,
                    userId: userId,
                    role: 'ADMIN',
                },
            });
            // Create default Kanban board
            const b = await tx.board.create({
                data: {
                    name: `${name} Board`,
                    type: 'KANBAN',
                    projectId: p.id,
                },
            });
            // Create default board columns
            const columns = ['To Do', 'In Progress', 'In Review', 'Done'];
            for (let i = 0; i < columns.length; i++) {
                await tx.boardColumn.create({
                    data: {
                        name: columns[i],
                        position: i,
                        boardId: b.id,
                    },
                });
            }
            return p;
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'PROJECT_CREATE',
                details: JSON.stringify({ id: project.id, name: project.name, key: project.key }),
                ipAddress: req.ip,
            },
        });
        return (0, response_1.sendCreated)(res, 'Project created successfully', project);
    }
    catch (error) {
        console.error('Create project error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to create project');
    }
}
async function getProject(req, res) {
    const { projectId } = req.params;
    try {
        const project = await db_1.default.project.findUnique({
            where: { id: projectId, deletedAt: null },
            include: {
                boards: true,
                sprints: true,
                members: {
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
                },
            },
        });
        if (!project) {
            return (0, response_1.sendError)(res, 404, 'Project not found');
        }
        return (0, response_1.sendSuccess)(res, 'Project loaded', project);
    }
    catch (error) {
        console.error('Get project error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to retrieve project details');
    }
}
async function addProjectMember(req, res) {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { email, role } = req.body;
    if (!email || !role) {
        return (0, response_1.sendError)(res, 400, 'Email and role are required');
    }
    try {
        const project = await db_1.default.project.findUnique({ where: { id: projectId } });
        if (!project)
            return (0, response_1.sendError)(res, 404, 'Project not found');
        // 1. Verify user is Admin of the project
        const currentMember = await db_1.default.projectMember.findUnique({
            where: {
                projectId_userId: { projectId, userId: userId },
            },
        });
        if (!currentMember || currentMember.role !== 'ADMIN') {
            return (0, response_1.sendError)(res, 403, 'Only project administrators can add members');
        }
        // 2. Find user in the system
        const targetUser = await db_1.default.user.findUnique({ where: { email } });
        if (!targetUser) {
            return (0, response_1.sendError)(res, 404, 'User not found in system. Invite them to the workspace first.');
        }
        // 3. Verify user is a member of the workspace
        const workspaceMember = await db_1.default.workspaceMember.findUnique({
            where: {
                workspaceId_userId: { workspaceId: project.workspaceId, userId: targetUser.id },
            },
        });
        if (!workspaceMember) {
            return (0, response_1.sendError)(res, 400, 'User must be a member of the workspace before being added to the project');
        }
        // 4. Check if already a member of the project
        const existingProjectMember = await db_1.default.projectMember.findUnique({
            where: {
                projectId_userId: { projectId, userId: targetUser.id },
            },
        });
        if (existingProjectMember) {
            return (0, response_1.sendError)(res, 400, 'User is already a member of this project');
        }
        const member = await db_1.default.projectMember.create({
            data: {
                projectId,
                userId: targetUser.id,
                role,
            },
            include: {
                user: true,
            },
        });
        return (0, response_1.sendCreated)(res, 'Project member added', {
            id: member.user.id,
            email: member.user.email,
            firstName: member.user.firstName,
            lastName: member.user.lastName,
            avatarUrl: member.user.avatarUrl,
            role: member.role,
        });
    }
    catch (error) {
        console.error('Add project member error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to add project member');
    }
}
async function deleteProject(req, res) {
    const userId = req.user?.id;
    const { projectId } = req.params;
    try {
        const member = await db_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: userId } },
        });
        if (!member || member.role !== 'ADMIN') {
            return (0, response_1.sendError)(res, 403, 'Only project administrators can delete projects');
        }
        await db_1.default.project.update({
            where: { id: projectId },
            data: { deletedAt: new Date() },
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'PROJECT_DELETE',
                details: JSON.stringify({ id: projectId }),
                ipAddress: req.ip,
            },
        });
        return (0, response_1.sendSuccess)(res, 'Project deleted successfully');
    }
    catch (error) {
        console.error('Delete project error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to delete project');
    }
}
async function updateProject(req, res) {
    const { projectId } = req.params;
    const { name, key, description, visibility, icon, leadId } = req.body;
    const userId = req.user?.id;
    try {
        const member = await db_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: userId } },
        });
        if (!member || member.role !== 'ADMIN') {
            return (0, response_1.sendError)(res, 403, 'Only project administrators can update project settings');
        }
        const data = {};
        if (name)
            data.name = name;
        if (description !== undefined)
            data.description = description;
        if (visibility)
            data.visibility = visibility;
        if (icon !== undefined)
            data.icon = icon;
        if (leadId)
            data.leadId = leadId;
        if (key) {
            const existing = await db_1.default.project.findFirst({
                where: { key: key.toUpperCase(), id: { not: projectId } }
            });
            if (existing) {
                return (0, response_1.sendError)(res, 400, `Project key '${key}' is already in use`);
            }
            data.key = key.toUpperCase();
        }
        const updated = await db_1.default.project.update({
            where: { id: projectId },
            data
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'PROJECT_UPDATE',
                details: JSON.stringify(data),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, 'Project updated successfully', updated);
    }
    catch (error) {
        console.error('Update project error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update project');
    }
}
async function removeProjectMember(req, res) {
    const { projectId, userId: targetUserId } = req.params;
    const userId = req.user?.id;
    try {
        const currentMember = await db_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId: userId } }
        });
        if (!currentMember || currentMember.role !== 'ADMIN') {
            return (0, response_1.sendError)(res, 403, 'Only project administrators can remove members');
        }
        await db_1.default.projectMember.delete({
            where: { projectId_userId: { projectId, userId: targetUserId } }
        });
        return (0, response_1.sendSuccess)(res, 'Member removed from project successfully');
    }
    catch (error) {
        console.error('Remove project member error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to remove project member');
    }
}
