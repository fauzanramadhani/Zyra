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
exports.authenticateToken = authenticateToken;
const jwt = __importStar(require("jsonwebtoken"));
const response_1 = require("../utils/response");
const db_1 = __importDefault(require("../db"));
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jira_access_key_2026_change_me';
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        (0, response_1.sendError)(res, 401, 'Access token is required');
        return;
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // Validate that the Session has not been revoked or expired
        if (decoded.sessionId) {
            const activeSession = await db_1.default.session.findUnique({
                where: { id: decoded.sessionId }
            });
            if (!activeSession || activeSession.revokedAt || activeSession.expiresAt < new Date()) {
                (0, response_1.sendError)(res, 401, 'Session has been revoked or expired');
                return;
            }
        }
        const user = await db_1.default.user.findUnique({
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
            (0, response_1.sendError)(res, 401, 'User not found or suspended');
            return;
        }
        req.user = user;
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            (0, response_1.sendError)(res, 401, 'Access token has expired');
            return;
        }
        (0, response_1.sendError)(res, 403, 'Invalid access token');
        return;
    }
}
