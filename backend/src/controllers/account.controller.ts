import { Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import { AuthenticatedRequest } from '../types';
import { sendSuccess, sendError } from '../utils/response';

export async function updateProfile(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { firstName, lastName, username, bio, timezone, language, removeAvatar, avatarUrl } = req.body;

  try {
    const data: any = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (bio !== undefined) data.bio = bio;
    if (timezone) data.timezone = timezone;
    if (language) data.language = language;

    if (username) {
      // Check username unique
      const existing = await prisma.user.findFirst({
        where: { username, id: { not: userId } }
      });
      if (existing) {
        return sendError(res, 400, 'Username is already taken');
      }
      data.username = username;
    }

    if (removeAvatar) {
      data.avatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName || req.user?.firstName}`;
    } else if (avatarUrl) {
      data.avatarUrl = avatarUrl;
    } else if (req.file) {
      // If user uploaded a new avatar via multer
      data.avatarUrl = `/uploads/${req.file.filename}`;
    }

    const updatedUser = await prisma.user.update({
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

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_PROFILE_UPDATE',
        details: JSON.stringify(data),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, 'Profile updated successfully', updatedUser);
  } catch (error: any) {
    console.error('Update profile error:', error);
    return sendError(res, 500, 'Failed to update profile');
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return sendError(res, 400, 'Current password and new password are required');
  }

  if (newPassword.length < 6) {
    return sendError(res, 400, 'New password must be at least 6 characters long');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return sendError(res, 404, 'User not found');

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 400, 'Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    // Revoke all OTHER sessions
    const authHeader = req.headers['authorization'];
    const currentToken = authHeader && authHeader.split(' ')[1];

    if (currentToken) {
      await prisma.session.updateMany({
        where: {
          userId,
          token: { not: currentToken }
        },
        data: {
          revokedAt: new Date()
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'USER_PASSWORD_CHANGE',
        details: JSON.stringify({ userId }),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, 'Password changed successfully. All other active sessions have been signed out.', null);
  } catch (error: any) {
    console.error('Change password error:', error);
    return sendError(res, 500, 'Failed to change password');
  }
}

export async function listSessions(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;

  try {
    const sessions = await prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, 'Active sessions loaded successfully', sessions);
  } catch (error: any) {
    console.error('List sessions error:', error);
    return sendError(res, 500, 'Failed to load sessions');
  }
}

export async function revokeSession(req: AuthenticatedRequest, res: Response) {
  const { id } = req.params;
  const userId = req.user?.id;

  try {
    const session = await prisma.session.findFirst({
      where: { id, userId }
    });

    if (!session) {
      return sendError(res, 404, 'Session not found');
    }

    const revoked = await prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() }
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'SESSION_REVOKE',
        details: JSON.stringify({ id }),
        ipAddress: req.ip
      }
    });

    return sendSuccess(res, 'Session revoked successfully', revoked);
  } catch (error: any) {
    console.error('Revoke session error:', error);
    return sendError(res, 500, 'Failed to revoke session');
  }
}
