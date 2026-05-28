import { Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { AuthenticatedRequest } from '../types';
import { sendError } from '../utils/response';
import prisma from '../db';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jira_access_key_2026_change_me';

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    sendError(res, 401, 'Access token is required');
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string; sessionId?: string };
    
    // Validate that the Session has not been revoked or expired
    if (decoded.sessionId) {
      const activeSession = await prisma.session.findUnique({
        where: { id: decoded.sessionId }
      });

      if (!activeSession || activeSession.revokedAt || activeSession.expiresAt < new Date()) {
        sendError(res, 401, 'Session has been revoked or expired');
        return;
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        username: true,
        bio: true,
        timezone: true,
        language: true
      },
    });

    if (!user) {
      sendError(res, 401, 'User not found or suspended');
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      sendError(res, 401, 'Access token has expired');
      return;
    }
    sendError(res, 403, 'Invalid access token');
    return;
  }
}
