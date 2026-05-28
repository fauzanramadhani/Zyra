"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addComment = addComment;
exports.updateComment = updateComment;
exports.deleteComment = deleteComment;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
const websocket_service_1 = require("../services/websocket.service");
async function addComment(req, res) {
    const userId = req.user?.id;
    const { issueId } = req.params;
    const { body } = req.body;
    if (!body) {
        return (0, response_1.sendError)(res, 400, 'Comment body is required');
    }
    try {
        const issue = await db_1.default.issue.findUnique({ where: { id: issueId } });
        if (!issue)
            return (0, response_1.sendError)(res, 404, 'Issue not found');
        const comment = await db_1.default.comment.create({
            data: {
                issueId,
                authorId: userId,
                body,
            },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
        });
        // Write Activity log
        await db_1.default.activity.create({
            data: {
                issueId,
                userId: userId,
                action: 'ADD_COMMENT',
                details: JSON.stringify({ commentId: comment.id }),
            },
        });
        // Notify issue detail viewers via WebSocket
        (0, websocket_service_1.emitToProject)(issue.projectId, 'comment:added', { issueId, comment });
        return (0, response_1.sendCreated)(res, 'Comment posted successfully', comment);
    }
    catch (error) {
        console.error('Add comment error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to add comment');
    }
}
async function updateComment(req, res) {
    const userId = req.user?.id;
    const { commentId } = req.params;
    const { body } = req.body;
    if (!body) {
        return (0, response_1.sendError)(res, 400, 'Comment body is required');
    }
    try {
        const original = await db_1.default.comment.findUnique({ where: { id: commentId } });
        if (!original)
            return (0, response_1.sendError)(res, 404, 'Comment not found');
        if (original.authorId !== userId) {
            return (0, response_1.sendError)(res, 403, 'You do not have permission to edit this comment');
        }
        const comment = await db_1.default.comment.update({
            where: { id: commentId },
            data: { body },
            include: {
                author: {
                    select: { id: true, firstName: true, lastName: true, avatarUrl: true },
                },
            },
        });
        const issue = await db_1.default.issue.findUnique({ where: { id: comment.issueId } });
        // Notify issue detail viewers via WebSocket
        (0, websocket_service_1.emitToProject)(issue.projectId, 'comment:updated', { issueId: comment.issueId, comment });
        return (0, response_1.sendSuccess)(res, 'Comment updated successfully', comment);
    }
    catch (error) {
        console.error('Update comment error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to edit comment');
    }
}
async function deleteComment(req, res) {
    const userId = req.user?.id;
    const { commentId } = req.params;
    try {
        const comment = await db_1.default.comment.findUnique({ where: { id: commentId } });
        if (!comment)
            return (0, response_1.sendError)(res, 404, 'Comment not found');
        if (comment.authorId !== userId) {
            return (0, response_1.sendError)(res, 403, 'You do not have permission to delete this comment');
        }
        await db_1.default.comment.update({
            where: { id: commentId },
            data: { deletedAt: new Date() },
        });
        const issue = await db_1.default.issue.findUnique({ where: { id: comment.issueId } });
        (0, websocket_service_1.emitToProject)(issue.projectId, 'comment:deleted', { issueId: comment.issueId, commentId });
        return (0, response_1.sendSuccess)(res, 'Comment deleted successfully');
    }
    catch (error) {
        console.error('Delete comment error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to remove comment');
    }
}
