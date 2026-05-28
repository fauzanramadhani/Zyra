import { Request, Response } from 'express';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export async function listSprints(req: Request, res: Response) {
  const { projectId } = req.params;

  try {
    const sprints = await prisma.sprint.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        issues: {
          where: { deletedAt: null },
        },
      },
    });

    return sendSuccess(res, 'Sprints loaded', sprints);
  } catch (error: any) {
    console.error('List sprints error:', error);
    return sendError(res, 500, 'Failed to load sprints');
  }
}

export async function createSprint(req: Request, res: Response) {
  const { projectId } = req.params;
  const { name, goal, startDate, endDate } = req.body;

  if (!name) {
    return sendError(res, 400, 'Sprint name is required');
  }

  try {
    const sprint = await prisma.sprint.create({
      data: {
        name,
        goal,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        projectId,
      },
    });

    return sendCreated(res, 'Sprint created successfully', sprint);
  } catch (error: any) {
    console.error('Create sprint error:', error);
    return sendError(res, 500, 'Failed to create sprint');
  }
}

export async function updateSprint(req: Request, res: Response) {
  const { sprintId } = req.params;
  const { name, goal, startDate, endDate, status } = req.body;

  try {
    const sprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        name,
        goal,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        status,
      },
    });

    return sendSuccess(res, 'Sprint updated successfully', sprint);
  } catch (error: any) {
    console.error('Update sprint error:', error);
    return sendError(res, 500, 'Failed to update sprint');
  }
}

export async function completeSprint(req: Request, res: Response) {
  const { sprintId } = req.params;
  const { targetSprintId } = req.body; // Unfinished tickets go here, if null they go to backlog (sprintId = null)

  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: {
          include: {
            boards: {
              include: {
                columns: true,
              },
            },
          },
        },
      },
    });

    if (!sprint) return sendError(res, 404, 'Sprint not found');

    // Find the 'Done' status column
    const defaultBoard = sprint.project.boards[0];
    const doneColumn = defaultBoard?.columns.find(
      (col) => col.name.toLowerCase() === 'done'
    );

    if (!doneColumn) {
      return sendError(res, 500, "Done column not defined on this project's board");
    }

    // Identify unfinished issues
    const unfinishedIssues = await prisma.issue.findMany({
      where: {
        sprintId,
        statusId: { not: doneColumn.id },
        deletedAt: null,
      },
    });

    await prisma.$transaction(async (tx) => {
      // 1. Move unfinished issues
      if (unfinishedIssues.length > 0) {
        const issueIds = unfinishedIssues.map((i) => i.id);
        await tx.issue.updateMany({
          where: { id: { in: issueIds } },
          data: { sprintId: targetSprintId || null },
        });
      }

      // 2. Mark sprint as completed
      await tx.sprint.update({
        where: { id: sprintId },
        data: { status: 'COMPLETED' },
      });
    });

    return sendSuccess(res, 'Sprint completed successfully', {
      completedSprintId: sprintId,
      movedIssuesCount: unfinishedIssues.length,
    });
  } catch (error: any) {
    console.error('Complete sprint error:', error);
    return sendError(res, 500, 'Failed to complete sprint');
  }
}
