"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTrash = listTrash;
exports.archiveItem = archiveItem;
exports.restoreItem = restoreItem;
exports.purgeItem = purgeItem;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
async function listTrash(req, res) {
    const { workspaceId } = req.query;
    if (!workspaceId) {
        return (0, response_1.sendError)(res, 400, 'Workspace ID is required');
    }
    try {
        // 1. Fetch deleted/archived projects
        const projects = await db_1.default.project.findMany({
            where: {
                workspaceId: workspaceId,
                OR: [
                    { deletedAt: { not: null } },
                    { archivedAt: { not: null } }
                ]
            }
        });
        // 2. Fetch deleted/archived issues
        const issues = await db_1.default.issue.findMany({
            where: {
                project: { workspaceId: workspaceId },
                OR: [
                    { deletedAt: { not: null } },
                    { archivedAt: { not: null } }
                ]
            },
            include: { project: true }
        });
        // 3. Fetch deleted/archived sprints
        const sprints = await db_1.default.sprint.findMany({
            where: {
                project: { workspaceId: workspaceId },
                OR: [
                    { deletedAt: { not: null } },
                    { archivedAt: { not: null } }
                ]
            },
            include: { project: true }
        });
        // 4. Fetch deleted/archived boards
        const boards = await db_1.default.board.findMany({
            where: {
                project: { workspaceId: workspaceId },
                OR: [
                    { deletedAt: { not: null } },
                    { archivedAt: { not: null } }
                ]
            },
            include: { project: true }
        });
        // 5. Fetch deleted/archived comments
        const comments = await db_1.default.comment.findMany({
            where: {
                issue: { project: { workspaceId: workspaceId } },
                OR: [
                    { deletedAt: { not: null } },
                    { archivedAt: { not: null } }
                ]
            },
            include: { issue: true }
        });
        return (0, response_1.sendSuccess)(res, 'Trash items loaded successfully', {
            projects,
            issues,
            sprints,
            boards,
            comments
        });
    }
    catch (error) {
        console.error('List trash error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to load trash items');
    }
}
async function archiveItem(req, res) {
    const { type, id } = req.body;
    const userId = req.user?.id;
    if (!type || !id) {
        return (0, response_1.sendError)(res, 400, 'Type and ID are required');
    }
    try {
        let result;
        const now = new Date();
        switch (type.toLowerCase()) {
            case 'project':
                result = await db_1.default.project.update({ where: { id }, data: { archivedAt: now } });
                break;
            case 'issue':
                result = await db_1.default.issue.update({ where: { id }, data: { archivedAt: now } });
                break;
            case 'sprint':
                result = await db_1.default.sprint.update({ where: { id }, data: { archivedAt: now } });
                break;
            case 'board':
                result = await db_1.default.board.update({ where: { id }, data: { archivedAt: now } });
                break;
            case 'comment':
                result = await db_1.default.comment.update({ where: { id }, data: { archivedAt: now } });
                break;
            case 'workspace':
                result = await db_1.default.workspace.update({ where: { id }, data: { archivedAt: now } });
                break;
            default:
                return (0, response_1.sendError)(res, 400, 'Unsupported entity type for archiving');
        }
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: `${type.toUpperCase()}_ARCHIVE`,
                details: JSON.stringify({ id }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, `${type} archived successfully`, result);
    }
    catch (error) {
        console.error('Archive item error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to archive item');
    }
}
async function restoreItem(req, res) {
    const { type, id } = req.body;
    const userId = req.user?.id;
    if (!type || !id) {
        return (0, response_1.sendError)(res, 400, 'Type and ID are required');
    }
    try {
        let result;
        switch (type.toLowerCase()) {
            case 'project':
                result = await db_1.default.project.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
                break;
            case 'issue':
                result = await db_1.default.issue.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
                break;
            case 'sprint':
                result = await db_1.default.sprint.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
                break;
            case 'board':
                result = await db_1.default.board.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
                break;
            case 'comment':
                result = await db_1.default.comment.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
                break;
            case 'workspace':
                result = await db_1.default.workspace.update({ where: { id }, data: { deletedAt: null, archivedAt: null } });
                break;
            default:
                return (0, response_1.sendError)(res, 400, 'Unsupported entity type for restoration');
        }
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: `${type.toUpperCase()}_RESTORE`,
                details: JSON.stringify({ id }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, `${type} restored successfully`, result);
    }
    catch (error) {
        console.error('Restore item error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to restore item');
    }
}
async function purgeItem(req, res) {
    const { type, id } = req.body;
    const userId = req.user?.id;
    if (!type || !id) {
        return (0, response_1.sendError)(res, 400, 'Type and ID are required');
    }
    try {
        let result;
        switch (type.toLowerCase()) {
            case 'project':
                result = await db_1.default.project.delete({ where: { id } });
                break;
            case 'issue':
                result = await db_1.default.issue.delete({ where: { id } });
                break;
            case 'sprint':
                result = await db_1.default.sprint.delete({ where: { id } });
                break;
            case 'board':
                result = await db_1.default.board.delete({ where: { id } });
                break;
            case 'comment':
                result = await db_1.default.comment.delete({ where: { id } });
                break;
            case 'workspace':
                result = await db_1.default.workspace.delete({ where: { id } });
                break;
            default:
                return (0, response_1.sendError)(res, 400, 'Unsupported entity type for purging');
        }
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: `${type.toUpperCase()}_PURGE`,
                details: JSON.stringify({ id }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, `${type} permanently purged`, result);
    }
    catch (error) {
        console.error('Purge item error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to permanently purge item');
    }
}
