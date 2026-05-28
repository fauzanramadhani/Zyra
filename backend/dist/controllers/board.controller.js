"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBoard = getBoard;
exports.createColumn = createColumn;
exports.updateColumn = updateColumn;
exports.deleteColumn = deleteColumn;
exports.reorderColumns = reorderColumns;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
async function getBoard(req, res) {
    const { boardId } = req.params;
    // Optional sprint filter — pass ?sprintId=xxx to load only that sprint's issues
    // Pass ?sprintId=backlog to load only backlog issues (sprintId IS NULL)
    const { sprintId } = req.query;
    try {
        // Build the issue where clause
        const issueWhere = { deletedAt: null };
        if (sprintId === 'backlog') {
            issueWhere.sprintId = null;
        }
        else if (sprintId) {
            issueWhere.sprintId = sprintId;
        }
        const board = await db_1.default.board.findUnique({
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
                            },
                        },
                    },
                },
            },
        });
        if (!board) {
            return (0, response_1.sendError)(res, 404, 'Board not found');
        }
        return (0, response_1.sendSuccess)(res, 'Board details loaded', board);
    }
    catch (error) {
        console.error('Get board error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to load board details');
    }
}
async function createColumn(req, res) {
    const { boardId } = req.params;
    const { name } = req.body;
    if (!name) {
        return (0, response_1.sendError)(res, 400, 'Column name is required');
    }
    try {
        const count = await db_1.default.boardColumn.count({ where: { boardId } });
        const column = await db_1.default.boardColumn.create({
            data: {
                name,
                position: count,
                boardId,
            },
        });
        return (0, response_1.sendCreated)(res, 'Column created successfully', column);
    }
    catch (error) {
        console.error('Create column error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to create column');
    }
}
async function updateColumn(req, res) {
    const { columnId } = req.params;
    const { name, position } = req.body;
    try {
        const column = await db_1.default.boardColumn.update({
            where: { id: columnId },
            data: {
                name,
                position,
            },
        });
        return (0, response_1.sendSuccess)(res, 'Column updated successfully', column);
    }
    catch (error) {
        console.error('Update column error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update column');
    }
}
async function deleteColumn(req, res) {
    const { columnId } = req.params;
    try {
        // Check if column has issues
        const issueCount = await db_1.default.issue.count({
            where: { statusId: columnId, deletedAt: null },
        });
        if (issueCount > 0) {
            return (0, response_1.sendError)(res, 400, 'Cannot delete a column that contains issues. Please move the issues first.');
        }
        await db_1.default.boardColumn.delete({
            where: { id: columnId },
        });
        return (0, response_1.sendSuccess)(res, 'Column deleted successfully');
    }
    catch (error) {
        console.error('Delete column error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to delete column');
    }
}
async function reorderColumns(req, res) {
    const { boardId } = req.params;
    const { columnIds } = req.body; // Array of IDs in the new order
    if (!Array.isArray(columnIds)) {
        return (0, response_1.sendError)(res, 400, 'columnIds must be an array');
    }
    try {
        await db_1.default.$transaction(columnIds.map((id, index) => db_1.default.boardColumn.update({
            where: { id, boardId },
            data: { position: index },
        })));
        return (0, response_1.sendSuccess)(res, 'Columns reordered successfully');
    }
    catch (error) {
        console.error('Reorder columns error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to reorder columns');
    }
}
