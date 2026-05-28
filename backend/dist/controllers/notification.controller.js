"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.readNotification = readNotification;
exports.readAllNotifications = readAllNotifications;
exports.deleteNotification = deleteNotification;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
async function listNotifications(req, res) {
    const userId = req.user?.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    try {
        const notifications = await db_1.default.notification.findMany({
            where: { userId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
            skip,
            take: limit
        });
        const unreadCount = await db_1.default.notification.count({
            where: { userId, read: false, deletedAt: null }
        });
        return (0, response_1.sendSuccess)(res, 'Notifications loaded', {
            notifications,
            unreadCount,
            page,
            limit
        });
    }
    catch (error) {
        console.error('List notifications error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to load notifications');
    }
}
async function readNotification(req, res) {
    const { id } = req.params;
    const userId = req.user?.id;
    try {
        const notification = await db_1.default.notification.findFirst({
            where: { id, userId }
        });
        if (!notification) {
            return (0, response_1.sendError)(res, 404, 'Notification not found');
        }
        const updated = await db_1.default.notification.update({
            where: { id },
            data: { read: true }
        });
        return (0, response_1.sendSuccess)(res, 'Notification marked as read', updated);
    }
    catch (error) {
        console.error('Read notification error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update notification');
    }
}
async function readAllNotifications(req, res) {
    const userId = req.user?.id;
    try {
        await db_1.default.notification.updateMany({
            where: { userId, read: false },
            data: { read: true }
        });
        return (0, response_1.sendSuccess)(res, 'All notifications marked as read', null);
    }
    catch (error) {
        console.error('Read all notifications error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update notifications');
    }
}
async function deleteNotification(req, res) {
    const { id } = req.params;
    const userId = req.user?.id;
    try {
        const notification = await db_1.default.notification.findFirst({
            where: { id, userId }
        });
        if (!notification) {
            return (0, response_1.sendError)(res, 404, 'Notification not found');
        }
        const deleted = await db_1.default.notification.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
        return (0, response_1.sendSuccess)(res, 'Notification deleted successfully', deleted);
    }
    catch (error) {
        console.error('Delete notification error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to delete notification');
    }
}
