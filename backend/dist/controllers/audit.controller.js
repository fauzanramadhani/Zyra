"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = getAuditLogs;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
async function getAuditLogs(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    try {
        const [logs, total] = await db_1.default.$transaction([
            db_1.default.auditLog.findMany({
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    user: {
                        select: { id: true, email: true, firstName: true, lastName: true },
                    },
                },
            }),
            db_1.default.auditLog.count(),
        ]);
        const formattedLogs = logs.map((log) => ({
            id: log.id,
            action: log.action,
            details: JSON.parse(log.details),
            ipAddress: log.ipAddress,
            createdAt: log.createdAt,
            user: log.user ? {
                id: log.user.id,
                email: log.user.email,
                name: `${log.user.firstName} ${log.user.lastName}`,
            } : null,
        }));
        return (0, response_1.sendSuccess)(res, 'Audit logs retrieved', formattedLogs, { page, limit, total });
    }
    catch (error) {
        console.error('Get audit logs error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to fetch audit log entries');
    }
}
