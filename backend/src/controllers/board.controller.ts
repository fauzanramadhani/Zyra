import { Request, Response } from 'express';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';

export async function getBoard(req: Request, res: Response) {
  const { boardId } = req.params;
  // Optional sprint filter — pass ?sprintId=xxx to load only that sprint's issues
  // Pass ?sprintId=backlog to load only backlog issues (sprintId IS NULL)
  const { sprintId } = req.query;

  try {
    // Build the issue where clause
    const issueWhere: any = { deletedAt: null };
    if (sprintId === 'backlog') {
      issueWhere.sprintId = null;
    } else if (sprintId) {
      issueWhere.sprintId = sprintId as string;
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            issues: {
              where: issueWhere,
              // Sort by fractional order for correct visual position
              orderBy: { order: 'asc' },
              // Only select fields needed for card rendering — skip description,
              // comments, attachments, activities (huge payloads, loaded on-demand)
              select: {
                id: true,
                key: true,
                summary: true,
                type: true,
                priority: true,
                storyPoints: true,
                order: true,
                statusId: true,
                sprintId: true,
                assignee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
                // Include inward links (BLOCKS) and outward links (IS_BLOCKED_BY) to determine blocked status
                inwardLinks: {
                  where: { linkType: 'BLOCKS' },
                  select: { id: true },
                },
                outwardLinks: {
                  where: { linkType: 'IS_BLOCKED_BY' },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    if (!board) {
      return sendError(res, 404, 'Board not found');
    }

    // Transform: add isBlocked flag and remove raw inwardLinks from response
    const transformed = {
      ...board,
      columns: board.columns.map((col) => ({
        ...col,
        issues: col.issues.map((issue) => ({
          ...issue,
          isBlocked: issue.inwardLinks.length > 0 || issue.outwardLinks.length > 0,
          inwardLinks: undefined,
          outwardLinks: undefined,
        })),
      })),
    };

    return sendSuccess(res, 'Board details loaded', transformed);
  } catch (error: any) {
    console.error('Get board error:', error);
    return sendError(res, 500, 'Failed to load board details');
  }
}


export async function createColumn(req: Request, res: Response) {
  const { boardId } = req.params;
  const { name } = req.body;

  if (!name) {
    return sendError(res, 400, 'Column name is required');
  }

  try {
    const count = await prisma.boardColumn.count({ where: { boardId } });

    const column = await prisma.boardColumn.create({
      data: {
        name,
        position: count,
        boardId,
      },
    });

    return sendCreated(res, 'Column created successfully', column);
  } catch (error: any) {
    console.error('Create column error:', error);
    return sendError(res, 500, 'Failed to create column');
  }
}

export async function updateColumn(req: Request, res: Response) {
  const { columnId } = req.params;
  const { name, position } = req.body;

  try {
    const column = await prisma.boardColumn.update({
      where: { id: columnId },
      data: {
        name,
        position,
      },
    });

    return sendSuccess(res, 'Column updated successfully', column);
  } catch (error: any) {
    console.error('Update column error:', error);
    return sendError(res, 500, 'Failed to update column');
  }
}

export async function deleteColumn(req: Request, res: Response) {
  const { columnId } = req.params;

  try {
    // Check if column has issues
    const issueCount = await prisma.issue.count({
      where: { statusId: columnId, deletedAt: null },
    });

    if (issueCount > 0) {
      return sendError(res, 400, 'Cannot delete a column that contains issues. Please move the issues first.');
    }

    await prisma.boardColumn.delete({
      where: { id: columnId },
    });

    return sendSuccess(res, 'Column deleted successfully');
  } catch (error: any) {
    console.error('Delete column error:', error);
    return sendError(res, 500, 'Failed to delete column');
  }
}

export async function reorderColumns(req: Request, res: Response) {
  const { boardId } = req.params;
  const { columnIds } = req.body; // Array of IDs in the new order

  if (!Array.isArray(columnIds)) {
    return sendError(res, 400, 'columnIds must be an array');
  }

  try {
    await prisma.$transaction(
      columnIds.map((id, index) =>
        prisma.boardColumn.update({
          where: { id, boardId },
          data: { position: index },
        })
      )
    );

    return sendSuccess(res, 'Columns reordered successfully');
  } catch (error: any) {
    console.error('Reorder columns error:', error);
    return sendError(res, 500, 'Failed to reorder columns');
  }
}
