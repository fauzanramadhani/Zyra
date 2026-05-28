"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireWorkspaceRole = requireWorkspaceRole;
exports.requireProjectRole = requireProjectRole;
exports.canEditIssue = canEditIssue;
exports.canModifyComment = canModifyComment;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
function requireWorkspaceRole(allowedRoles) {
    return async (req, res, next) => {
        const userId = req.user?.id;
        const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;
        if (!userId)
            return (0, response_1.sendError)(res, 401, 'Unauthorized');
        if (!workspaceId)
            return (0, response_1.sendError)(res, 400, 'Workspace ID is required');
        try {
            const member = await db_1.default.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId, userId } }
            });
            if (!member || !allowedRoles.includes(member.role)) {
                return (0, response_1.sendError)(res, 403, 'You do not have permission to perform this action in this workspace');
            }
            return next();
        }
        catch (error) {
            console.error('requireWorkspaceRole error:', error);
            return (0, response_1.sendError)(res, 500, 'Internal permission check error');
        }
    };
}
function requireProjectRole(allowedRoles) {
    return async (req, res, next) => {
        const userId = req.user?.id;
        const projectId = req.params.projectId || req.body.projectId || req.query.projectId;
        if (!userId)
            return (0, response_1.sendError)(res, 401, 'Unauthorized');
        if (!projectId)
            return (0, response_1.sendError)(res, 400, 'Project ID is required');
        try {
            // 1. Get project workspace
            const project = await db_1.default.project.findUnique({
                where: { id: projectId }
            });
            if (!project)
                return (0, response_1.sendError)(res, 404, 'Project not found');
            // 2. Check if user is Workspace OWNER or ADMIN (they bypass project role restrictions)
            const wsMember = await db_1.default.workspaceMember.findUnique({
                where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } }
            });
            if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN')) {
                return next();
            }
            // 3. Check project specific membership
            const member = await db_1.default.projectMember.findUnique({
                where: { projectId_userId: { projectId, userId } }
            });
            if (!member || !allowedRoles.includes(member.role)) {
                return (0, response_1.sendError)(res, 403, 'You do not have permission to perform this action in this project');
            }
            return next();
        }
        catch (error) {
            console.error('requireProjectRole error:', error);
            return (0, response_1.sendError)(res, 500, 'Internal permission check error');
        }
    };
}
async function canEditIssue(req, res, next) {
    const userId = req.user?.id;
    const issueId = req.params.issueId || req.body.issueId;
    if (!userId)
        return (0, response_1.sendError)(res, 401, 'Unauthorized');
    if (!issueId)
        return (0, response_1.sendError)(res, 400, 'Issue ID is required');
    try {
        const issue = await db_1.default.issue.findUnique({
            where: { id: issueId },
            include: { project: true }
        });
        if (!issue)
            return (0, response_1.sendError)(res, 404, 'Issue not found');
        // 1. Check if Workspace OWNER/ADMIN
        const wsMember = await db_1.default.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: issue.project.workspaceId, userId } }
        });
        if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN')) {
            return next();
        }
        // 2. Check if Project ADMIN
        const projMember = await db_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId: issue.projectId, userId } }
        });
        if (projMember && projMember.role === 'ADMIN') {
            return next();
        }
        // 3. Check if assignee or reporter
        if (issue.assigneeId === userId || issue.reporterId === userId) {
            return next();
        }
        return (0, response_1.sendError)(res, 403, 'Only the assignee, reporter, or project admin can edit this issue');
    }
    catch (error) {
        console.error('canEditIssue error:', error);
        return (0, response_1.sendError)(res, 500, 'Internal permission check error');
    }
}
async function canModifyComment(req, res, next) {
    const userId = req.user?.id;
    const commentId = req.params.commentId;
    if (!userId)
        return (0, response_1.sendError)(res, 401, 'Unauthorized');
    if (!commentId)
        return (0, response_1.sendError)(res, 400, 'Comment ID is required');
    try {
        const comment = await db_1.default.comment.findUnique({
            where: { id: commentId },
            include: { issue: { include: { project: true } } }
        });
        if (!comment)
            return (0, response_1.sendError)(res, 404, 'Comment not found');
        // 1. Is author
        if (comment.authorId === userId) {
            return next();
        }
        // 2. Is workspace OWNER/ADMIN or project ADMIN
        const wsMember = await db_1.default.workspaceMember.findUnique({
            where: { workspaceId_userId: { workspaceId: comment.issue.project.workspaceId, userId } }
        });
        if (wsMember && (wsMember.role === 'OWNER' || wsMember.role === 'ADMIN')) {
            return next();
        }
        const projMember = await db_1.default.projectMember.findUnique({
            where: { projectId_userId: { projectId: comment.issue.projectId, userId } }
        });
        if (projMember && projMember.role === 'ADMIN') {
            return next();
        }
        return (0, response_1.sendError)(res, 403, 'You are not authorized to modify this comment');
    }
    catch (error) {
        console.error('canModifyComment error:', error);
        return (0, response_1.sendError)(res, 500, 'Internal permission check error');
    }
}
