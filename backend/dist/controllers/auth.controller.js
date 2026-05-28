"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.refresh = refresh;
exports.me = me;
const bcrypt = __importStar(require("bcryptjs"));
const jwt = __importStar(require("jsonwebtoken"));
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jira_access_key_2026_change_me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'super_secret_jira_refresh_key_2026_change_me';
// Helper to generate access and refresh tokens with DB-backed active sessions
async function generateTokens(userId, email, req) {
    // 1. Create a pending Session record to obtain a sessionId
    const session = await db_1.default.session.create({
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
    await db_1.default.session.update({
        where: { id: session.id },
        data: { token: accessToken }
    });
    return { accessToken, refreshToken };
}
async function register(req, res) {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
        return (0, response_1.sendError)(res, 400, 'Missing required registration fields');
    }
    try {
        const existingUser = await db_1.default.user.findUnique({
            where: { email },
        });
        if (existingUser) {
            return (0, response_1.sendError)(res, 400, 'A user with this email already exists');
        }
        const passwordHash = await bcrypt.hash(password, 10);
        const user = await db_1.default.user.create({
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
        const workspace = await db_1.default.workspace.create({
            data: {
                name: `${firstName}'s Workspace`,
                slug: `${firstName.toLowerCase()}-workspace-${Math.floor(1000 + Math.random() * 9000)}`,
            },
        });
        await db_1.default.workspaceMember.create({
            data: {
                workspaceId: workspace.id,
                userId: user.id,
                role: 'OWNER', // Mark creator as Owner
            },
        });
        const tokens = await generateTokens(user.id, user.email, req);
        // Save initial audit log
        await db_1.default.auditLog.create({
            data: {
                userId: user.id,
                action: 'USER_REGISTER',
                details: JSON.stringify({ email: user.email }),
                ipAddress: req.ip,
            },
        });
        return (0, response_1.sendCreated)(res, 'Registration successful', { user, workspace, ...tokens });
    }
    catch (error) {
        console.error('Registration error:', error);
        return (0, response_1.sendError)(res, 500, 'Registration failed. Please try again.');
    }
}
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return (0, response_1.sendError)(res, 400, 'Email and password are required');
    }
    try {
        const user = await db_1.default.user.findUnique({
            where: { email, deletedAt: null },
        });
        if (!user) {
            return (0, response_1.sendError)(res, 401, 'Invalid email or password');
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return (0, response_1.sendError)(res, 401, 'Invalid email or password');
        }
        const tokens = await generateTokens(user.id, user.email, req);
        // Log the user login event
        await db_1.default.auditLog.create({
            data: {
                userId: user.id,
                action: 'USER_LOGIN',
                details: JSON.stringify({ email: user.email }),
                ipAddress: req.ip,
            },
        });
        return (0, response_1.sendSuccess)(res, 'Login successful', {
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
    }
    catch (error) {
        console.error('Login error:', error);
        return (0, response_1.sendError)(res, 500, 'Internal server error during login');
    }
}
async function refresh(req, res) {
    const { refreshToken } = req.body;
    if (!refreshToken) {
        return (0, response_1.sendError)(res, 400, 'Refresh token is required');
    }
    try {
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
        // Check if the source session has been revoked
        if (decoded.sessionId) {
            const activeSession = await db_1.default.session.findUnique({
                where: { id: decoded.sessionId }
            });
            if (!activeSession || activeSession.revokedAt || activeSession.expiresAt < new Date()) {
                return (0, response_1.sendError)(res, 401, 'Session has been revoked or expired');
            }
        }
        const user = await db_1.default.user.findUnique({
            where: { id: decoded.userId, deletedAt: null },
        });
        if (!user) {
            return (0, response_1.sendError)(res, 401, 'User not found or disabled');
        }
        // Revoke the old session to enforce token rotation safely
        if (decoded.sessionId) {
            await db_1.default.session.update({
                where: { id: decoded.sessionId },
                data: { revokedAt: new Date() }
            });
        }
        // Generate a fresh session and tokens
        const tokens = await generateTokens(user.id, user.email, req);
        return (0, response_1.sendSuccess)(res, 'Tokens refreshed successfully', tokens);
    }
    catch (error) {
        return (0, response_1.sendError)(res, 401, 'Invalid or expired refresh token');
    }
}
async function me(req, res) {
    if (!req.user) {
        return (0, response_1.sendError)(res, 401, 'Not authenticated');
    }
    // Get workspaces this user belongs to
    const workspaceMemberships = await db_1.default.workspaceMember.findMany({
        where: { userId: req.user.id },
        include: { workspace: true },
    });
    return (0, response_1.sendSuccess)(res, 'Current user loaded', {
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
