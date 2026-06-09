import { Response } from 'express';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export async function listProjects(req: AuthenticatedRequest, res: Response) {
  const { workspaceId } = req.query;
  const userId = req.user?.id;

  if (!workspaceId) {
    return sendError(res, 400, 'Workspace ID query parameter is required');
  }

  try {
    // 1. Fetch current user's workspace membership and role
    const currentMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: workspaceId as string, userId: userId! } },
    });

    if (!currentMember) {
      return sendError(res, 403, 'You are not a member of this workspace');
    }

    // 2. Fetch projects
    let projects = await prisma.project.findMany({
      where: {
        workspaceId: workspaceId as string,
        deletedAt: null,
      },
      include: {
        boards: true,
      },
    });

    // 3. Filter projects: Only OWNER & SUPER_ADMIN can see everything. ADMIN, MEMBER, VIEWER can only see allowed projects.
    if (currentMember.role !== 'OWNER' && currentMember.role !== 'SUPER_ADMIN') {
      const allowedProjects = await prisma.workspaceMemberProject.findMany({
        where: { workspaceMemberId: currentMember.id },
        select: { projectId: true },
      });
      const allowedProjectIds = allowedProjects.map((ap) => ap.projectId);
      projects = projects.filter((p) => allowedProjectIds.includes(p.id));
    }

    // 4. Map virtual members for each visible project
    const projectsWithMembers = await Promise.all(
      projects.map(async (project) => {
        const workspaceMembers = await prisma.workspaceMember.findMany({
          where: {
            workspaceId: project.workspaceId,
            OR: [
              { role: { in: ['OWNER', 'SUPER_ADMIN'] } },
              { allowedProjects: { some: { projectId: project.id } } }
            ]
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              }
            }
          }
        });

        const formattedMembers = workspaceMembers.map((m) => ({
          id: m.id,
          role: m.role,
          user: m.user
        }));

        return {
          ...project,
          members: formattedMembers
        };
      })
    );

    return sendSuccess(res, 'Projects loaded', projectsWithMembers);
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

      // Add creator to WorkspaceMemberProject access list
      const wsMember = await tx.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: userId! } }
      });
      if (wsMember) {
        await tx.workspaceMemberProject.create({
          data: {
            workspaceMemberId: wsMember.id,
            projectId: p.id
          }
        });
      }

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
        sprints: true
      },
    });

    if (!project) {
      return sendError(res, 404, 'Project not found');
    }

    // Retrieve workspace members that are OWNER/SUPER_ADMIN or have WorkspaceMemberProject link
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: project.workspaceId,
        OR: [
          { role: { in: ['OWNER', 'SUPER_ADMIN'] } },
          { allowedProjects: { some: { projectId } } }
        ]
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          }
        }
      }
    });

    const formattedMembers = workspaceMembers.map((m) => ({
      id: m.id,
      role: m.role,
      user: m.user
    }));

    const result = {
      ...project,
      members: formattedMembers
    };

    return sendSuccess(res, 'Project loaded', result);
  } catch (error: any) {
    console.error('Get project error:', error);
    return sendError(res, 500, 'Failed to retrieve project details');
  }
}

export async function deleteProject(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { projectId } = req.params;

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return sendError(res, 404, 'Project not found');

    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: userId! } }
    });

    if (!wsMember) return sendError(res, 403, 'Forbidden');

    const hasAdminAccess = wsMember.role === 'OWNER' || 
                           wsMember.role === 'SUPER_ADMIN' || 
                           (wsMember.role === 'ADMIN' && await prisma.workspaceMemberProject.findUnique({
                             where: { workspaceMemberId_projectId: { workspaceMemberId: wsMember.id, projectId } }
                           }));

    if (!hasAdminAccess) {
      return sendError(res, 403, 'Only project or workspace administrators can delete projects');
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
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return sendError(res, 404, 'Project not found');

    const wsMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: userId! } }
    });

    if (!wsMember) return sendError(res, 403, 'Forbidden');

    const hasAdminAccess = wsMember.role === 'OWNER' || 
                           wsMember.role === 'SUPER_ADMIN' || 
                           (wsMember.role === 'ADMIN' && await prisma.workspaceMemberProject.findUnique({
                             where: { workspaceMemberId_projectId: { workspaceMemberId: wsMember.id, projectId } }
                           }));

    if (!hasAdminAccess) {
      return sendError(res, 403, 'Only project or workspace administrators can update project settings');
    }

    const data: any = {};
    if (name) data.name = name;
    if (description !== undefined) data.description = description;
    if (visibility) data.visibility = visibility;
    if (icon !== undefined) data.icon = icon;
    if (leadId) data.leadId = leadId;

    if (key) {
      const existing = await prisma.project.findFirst({
        where: { key: key.toUpperCase(), workspaceId: project.workspaceId, id: { not: projectId } }
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

