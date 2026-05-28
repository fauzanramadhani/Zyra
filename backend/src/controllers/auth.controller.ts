import { Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_zyra_access_key_2026_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_zyra_refresh_key_2026_change_me';

// Helper to generate access and refresh tokens with DB-backed active sessions
async function generateTokens(userId: string, email: string, req: Request) {
  // 1. Create a pending Session record to obtain a sessionId
  const session = await prisma.session.create({
    data: {
      userId,
      token: '', // temporary
      deviceInfo: req.headers['user-agent'] || 'Unknown Device',
      ipAddress: req.ip || 'Unknown IP',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days matching refresh token
    }
  });

  // 2. Embed the sessionId in both JWT tokens
  const accessToken = jwt.sign({ userId, email, sessionId: session.id }, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId, email, sessionId: session.id }, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  // 3. Update the Session record with the actual access token
  await prisma.session.update({
    where: { id: session.id },
    data: { token: accessToken }
  });

  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response) {
  const { email, password, firstName, lastName } = req.body;

  if (!email || !password || !firstName || !lastName) {
    return sendError(res, 400, 'Missing required registration fields');
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return sendError(res, 400, 'A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        avatarUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${firstName}`,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Create a default workspace for the new user automatically
    const workspace = await prisma.workspace.create({
      data: {
        name: `${firstName}'s Workspace`,
        slug: `${firstName.toLowerCase()}-workspace-${Math.floor(1000 + Math.random() * 9000)}`,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: 'OWNER', // Mark creator as Owner
      },
    });

    const tokens = await generateTokens(user.id, user.email, req);

    // Save initial audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_REGISTER',
        details: JSON.stringify({ email: user.email }),
        ipAddress: req.ip,
      },
    });

    return sendCreated(res, 'Registration successful', { user, workspace, ...tokens });
  } catch (error: any) {
    console.error('Registration error:', error);
    return sendError(res, 500, 'Registration failed. Please try again.');
  }
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, 400, 'Email and password are required');
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email, deletedAt: null },
    });

    if (!user) {
      return sendError(res, 401, 'Invalid email or password');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 401, 'Invalid email or password');
    }

    const tokens = await generateTokens(user.id, user.email, req);

    // Log the user login event
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'USER_LOGIN',
        details: JSON.stringify({ email: user.email }),
        ipAddress: req.ip,
      },
    });

    return sendSuccess(res, 'Login successful', {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        username: user.username,
        bio: user.bio,
        timezone: user.timezone,
        language: user.language
      },
      ...tokens,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return sendError(res, 500, 'Internal server error during login');
  }
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return sendError(res, 400, 'Refresh token is required');
  }

  try {
    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { userId: string; email: string; sessionId?: string };
    
    // Check if the source session has been revoked
    if (decoded.sessionId) {
      const activeSession = await prisma.session.findUnique({
        where: { id: decoded.sessionId }
      });
      if (!activeSession || activeSession.revokedAt || activeSession.expiresAt < new Date()) {
        return sendError(res, 401, 'Session has been revoked or expired');
      }
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId, deletedAt: null },
    });

    if (!user) {
      return sendError(res, 401, 'User not found or disabled');
    }

    // Revoke the old session to enforce token rotation safely
    if (decoded.sessionId) {
      await prisma.session.update({
        where: { id: decoded.sessionId },
        data: { revokedAt: new Date() }
      });
    }

    // Generate a fresh session and tokens
    const tokens = await generateTokens(user.id, user.email, req);

    return sendSuccess(res, 'Tokens refreshed successfully', tokens);
  } catch (error: any) {
    return sendError(res, 401, 'Invalid or expired refresh token');
  }
}

export async function me(req: AuthenticatedRequest, res: Response) {
  if (!req.user) {
    return sendError(res, 401, 'Not authenticated');
  }

  // Get workspaces this user belongs to
  const workspaceMemberships = await prisma.workspaceMember.findMany({
    where: { userId: req.user.id },
    include: { workspace: true },
  });

  return sendSuccess(res, 'Current user loaded', {
    user: req.user,
    workspaces: workspaceMemberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      avatarUrl: m.workspace.avatarUrl,
      role: m.role,
    })),
  });
}
