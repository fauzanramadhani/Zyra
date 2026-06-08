import { Response } from 'express';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export async function listProjects(req: AuthenticatedRequest, res: Response) {
  const { workspaceId } = req.query;

  if (!workspaceId) {
    return sendError(res, 400, 'Workspace ID query parameter is required');
  }

  try {
    const projects = await prisma.project.findMany({
      where: {
        workspaceId: workspaceId as string,
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

    return sendSuccess(res, 'Projects loaded', projects);
  } catch (error: any) {
    console.error('List projects error:', error);
    return sendError(res, 500, 'Failed to retrieve projects');
  }
}

export async function createProject(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { name, key, description, workspaceId } = req.body;

  if (!name || !key || !workspaceId) {
    return sendError(res, 400, 'Name, key, and workspaceId are required');
  }

  try {
    // Check if key is taken within the same workspace
    const existing = await prisma.project.findUnique({
      where: { workspaceId_key: { workspaceId, key: key.toUpperCase() } }
    });
    if (existing) {
      return sendError(res, 400, `Project key '${key}' is already in use`);
    }

    // Create project, board, default columns, and members in a transaction
    const project = await prisma.$transaction(async (tx) => {
      const p = await tx.project.create({
        data: {
          name,
          key: key.toUpperCase(),
          description,
          workspaceId,
          leadId: userId!,
        },
      });

      // Add creator as Admin member
      await tx.projectMember.create({
        data: {
          projectId: p.id,
          userId: userId!,
          role: 'ADMIN',
        },
      });

      // Create default workflow matching columns
      const wf = await tx.workflow.create({
        data: {
          name: `${name} Workflow`,
          description: `Default workflow for project ${name}`,
          projectId: p.id,
          isDefault: true,
          states: {
            create: [
              { name: 'To Do', category: 'TODO', color: '#6B7280', position: 0 },
              { name: 'In Progress', category: 'IN_PROGRESS', color: '#3B82F6', position: 1 },
              { name: 'In Review', category: 'IN_PROGRESS', color: '#F59E0B', position: 2 },
              { name: 'Done', category: 'DONE', color: '#10B981', position: 3 },
            ]
          }
        },
        include: { states: true }
      });

      // Create default Kanban board
      const b = await tx.board.create({
        data: {
          name: `${name} Board`,
          type: 'KANBAN',
          projectId: p.id,
        },
      });

      // Create default board columns linked to workflowStateId
      for (const state of wf.states) {
        await tx.boardColumn.create({
          data: {
            name: state.name,
            position: state.position,
            boardId: b.id,
            workflowStateId: state.id,
          },
        });
      }

      return p;
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PROJECT_CREATE',
        details: JSON.stringify({ id: project.id, name: project.name, key: project.key }),
        ipAddress: req.ip,
      },
    });

    return sendCreated(res, 'Project created successfully', project);
  } catch (error: any) {
    console.error('Create project error:', error);
    return sendError(res, 500, 'Failed to create project');
  }
}

export async function getProject(req: AuthenticatedRequest, res: Response) {
  const { projectId } = req.params;

  try {
    const project = await prisma.project.findUnique({
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
      return sendError(res, 404, 'Project not found');
    }

    return sendSuccess(res, 'Project loaded', project);
  } catch (error: any) {
    console.error('Get project error:', error);
    return sendError(res, 500, 'Failed to retrieve project details');
  }
}

export async function addProjectMember(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { projectId } = req.params;
  const { email, role } = req.body;

  if (!email || !role) {
    return sendError(res, 400, 'Email and role are required');
  }

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return sendError(res, 404, 'Project not found');

    // 1. Verify user is Admin of the project
    const currentMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: userId! },
      },
    });

    if (!currentMember || currentMember.role !== 'ADMIN') {
      return sendError(res, 403, 'Only project administrators can add members');
    }

    // 2. Find user in the system
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return sendError(res, 404, 'User not found in system. Invite them to the workspace first.');
    }

    // 3. Verify user is a member of the workspace
    const workspaceMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: project.workspaceId, userId: targetUser.id },
      },
    });

    if (!workspaceMember) {
      return sendError(res, 400, 'User must be a member of the workspace before being added to the project');
    }

    // 4. Check if already a member of the project
    const existingProjectMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId: targetUser.id },
      },
    });

    if (existingProjectMember) {
      return sendError(res, 400, 'User is already a member of this project');
    }

    const member = await prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUser.id,
        role,
      },
      include: {
        user: true,
      },
    });

    return sendCreated(res, 'Project member added', {
      id: member.user.id,
      email: member.user.email,
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      avatarUrl: member.user.avatarUrl,
      role: member.role,
    });
  } catch (error: any) {
    console.error('Add project member error:', error);
    return sendError(res, 500, 'Failed to add project member');
  }
}

export async function deleteProject(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { projectId } = req.params;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: userId! } },
    });

    if (!member || member.role !== 'ADMIN') {
      return sendError(res, 403, 'Only project administrators can delete projects');
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PROJECT_DELETE',
        details: JSON.stringify({ id: projectId }),
        ipAddress: req.ip,
      },
    });

    return sendSuccess(res, 'Project deleted successfully');
  } catch (error: any) {
    console.error('Delete project error:', error);
    return sendError(res, 500, 'Failed to delete project');
  }
}

export async function updateProject(req: AuthenticatedRequest, res: Response) {
  const { projectId } = req.params;
  const { name, key, description, visibility, icon, leadId } = req.body;
  const userId = req.user?.id;

  try {
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: userId! } },
    });

    if (!member || member.role !== 'ADMIN') {
      return sendError(res, 403, 'Only project administrators can update project settings');
    }

    const data: any = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (visibility) data.visibility = visibility;
    if (icon !== undefined) data.icon = icon;
    if (leadId) data.leadId = leadId;

    if (key) {
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      const existing = await prisma.project.findFirst({
        where: { key: key.toUpperCase(), workspaceId: project!.workspaceId, id: { not: projectId } }
      });
      if (existing) {
        return sendError(res, 400, `Project key '${key}' is already in use`);
      }
      data.key = key.toUpperCase();
    }

    const updated = await prisma.project.update({
      where: { id: projectId },
      data
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'PROJECT_UPDATE',
        details: JSON.stringify(data),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, 'Project updated successfully', updated);
  } catch (error: any) {
    console.error('Update project error:', error);
    return sendError(res, 500, 'Failed to update project');
  }
}

export async function removeProjectMember(req: AuthenticatedRequest, res: Response) {
  const { projectId, userId: targetUserId } = req.params;
  const userId = req.user?.id;

  try {
    const currentMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: userId! } }
    });

    if (!currentMember || currentMember.role !== 'ADMIN') {
      return sendError(res, 403, 'Only project administrators can remove members');
    }

    await prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId: targetUserId } }
    });

    return sendSuccess(res, 'Member removed from project successfully');
  } catch (error: any) {
    console.error('Remove project member error:', error);
    return sendError(res, 500, 'Failed to remove project member');
  }
}

