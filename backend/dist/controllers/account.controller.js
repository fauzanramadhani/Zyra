"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfile = updateProfile;
exports.changePassword = changePassword;
exports.listSessions = listSessions;
exports.revokeSession = revokeSession;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
async function updateProfile(req, res) {
    const userId = req.user?.id;
    const { firstName, lastName, username, bio, timezone, language, removeAvatar, avatarUrl } = req.body;
    try {
        const data = {};
        if (firstName)
            data.firstName = firstName;
        if (lastName)
            data.lastName = lastName;
        if (bio !== undefined)
            data.bio = bio;
        if (timezone)
            data.timezone = timezone;
        if (language)
            data.language = language;
        if (username) {
            // Check username unique
            const existing = await db_1.default.user.findFirst({
                where: { username, id: { not: userId } }
            });
            if (existing) {
                return (0, response_1.sendError)(res, 400, 'Username is already taken');
            }
            data.username = username;
        }
        if (removeAvatar) {
            data.avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName || req.user?.firstName}`;
        }
        else if (avatarUrl) {
            data.avatarUrl = avatarUrl;
        }
        else if (req.file) {
            // If user uploaded a new avatar via multer
            data.avatarUrl = `/uploads/${req.file.filename}`;
        }
        const updatedUser = await db_1.default.user.update({
            where: { id: userId },
            data,
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                username: true,
                bio: true,
                avatarUrl: true,
                timezone: true,
                language: true,
                createdAt: true
            }
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'USER_PROFILE_UPDATE',
                details: JSON.stringify(data),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, 'Profile updated successfully', updatedUser);
    }
    catch (error) {
        console.error('Update profile error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update profile');
    }
}
async function changePassword(req, res) {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return (0, response_1.sendError)(res, 400, 'Current password and new password are required');
    }
    if (newPassword.length < 6) {
        return (0, response_1.sendError)(res, 400, 'New password must be at least 6 characters long');
    }
    try {
        const user = await db_1.default.user.findUnique({
            where: { id: userId }
        });
        if (!user)
            return (0, response_1.sendError)(res, 404, 'User not found');
        const isMatch = await bcryptjs_1.default.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return (0, response_1.sendError)(res, 400, 'Current password is incorrect');
        }
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
        // Update password
        await db_1.default.user.update({
            where: { id: userId },
            data: { passwordHash }
        });
        // Revoke all OTHER sessions
        const authHeader = req.headers['authorization'];
        const currentToken = authHeader && authHeader.split(' ')[1];
        if (currentToken) {
            await db_1.default.session.updateMany({
                where: {
                    userId,
                    token: { not: currentToken }
                },
                data: {
                    revokedAt: new Date()
                }
            });
        }
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'USER_PASSWORD_CHANGE',
                details: JSON.stringify({ userId }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, 'Password changed successfully. All other active sessions have been signed out.', null);
    }
    catch (error) {
        console.error('Change password error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to change password');
    }
}
async function listSessions(req, res) {
    const userId = req.user?.id;
    try {
        const sessions = await db_1.default.session.findMany({
            where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
            select: {
                id: true,
                deviceInfo: true,
                ipAddress: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return (0, response_1.sendSuccess)(res, 'Active sessions loaded successfully', sessions);
    }
    catch (error) {
        console.error('List sessions error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to load sessions');
    }
}
async function revokeSession(req, res) {
    const { id } = req.params;
    const userId = req.user?.id;
    try {
        const session = await db_1.default.session.findFirst({
            where: { id, userId }
        });
        if (!session) {
            return (0, response_1.sendError)(res, 404, 'Session not found');
        }
        const revoked = await db_1.default.session.update({
            where: { id },
            data: { revokedAt: new Date() }
        });
        await db_1.default.auditLog.create({
            data: {
                userId,
                action: 'SESSION_REVOKE',
                details: JSON.stringify({ id }),
                ipAddress: req.ip
            }
        });
        return (0, response_1.sendSuccess)(res, 'Session revoked successfully', revoked);
    }
    catch (error) {
        console.error('Revoke session error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to revoke session');
    }
}
