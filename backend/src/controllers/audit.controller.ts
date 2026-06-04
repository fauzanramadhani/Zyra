import { Response } from 'express';
import prisma from '../db';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';

export async function getAuditLogs(req: AuthenticatedRequest, res: Response) {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const skip = (page - 1) * limit;

  try {
    const [logs, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.auditLog.count(),
    ]);

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      details: (() => { try { return JSON.parse(log.details || '{}'); } catch { return {}; } })(),
      ipAddress: log.ipAddress,
      createdAt: log.createdAt,
      user: log.user ? {
        id: log.user.id,
        email: log.user.email,
        name: `${log.user.firstName} ${log.user.lastName}`,
      } : null,
    }));

    return sendSuccess(res, 'Audit logs retrieved', formattedLogs, { page, limit, total });
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    return sendError(res, 500, 'Failed to fetch audit log entries');
  }
}
