import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- SLA Policies ---
export const listPolicies = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const policies = await prisma.slaPolicy.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, policies);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createPolicy = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, priority, responseTimeMin, resolutionTimeMin, enabled } = req.body;
    const policy = await prisma.slaPolicy.create({
      data: { name, projectId, priority, responseTimeMin, resolutionTimeMin, enabled: enabled !== false },
    });
    return success(res, policy, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updatePolicy = async (req: Request, res: Response) => {
  try {
    const { policyId } = req.params;
    const data = req.body;
    const policy = await prisma.slaPolicy.update({ where: { id: policyId }, data });
    return success(res, policy);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deletePolicy = async (req: Request, res: Response) => {
  try {
    const { policyId } = req.params;
    await prisma.slaPolicy.update({ where: { id: policyId }, data: { deletedAt: new Date() } });
    return success(res, { message: 'SLA policy deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- SLA Trackers ---
export const getIssueSlA = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const trackers = await prisma.slaTracker.findMany({
      where: { issueId },
      include: { slaPolicy: true },
    });
    return success(res, trackers);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const startSlaTracking = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return error(res, 'Issue not found', 404);

    // Find applicable SLA policies
    const policies = await prisma.slaPolicy.findMany({
      where: {
        projectId: issue.projectId,
        enabled: true,
        deletedAt: null,
        OR: [{ priority: issue.priority }, { priority: '*' }],
      },
    });

    const trackers = [];
    for (const policy of policies) {
      const now = new Date();
      const tracker = await prisma.slaTracker.upsert({
        where: { slaPolicyId_issueId: { slaPolicyId: policy.id, issueId } },
        create: {
          slaPolicyId: policy.id,
          issueId,
          responseDeadline: new Date(now.getTime() + policy.responseTimeMin * 60 * 1000),
          resolutionDeadline: new Date(now.getTime() + policy.resolutionTimeMin * 60 * 1000),
        },
        update: {},
      });
      trackers.push(tracker);
    }

    return success(res, trackers);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const markResponded = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const now = new Date();
    const trackers = await prisma.slaTracker.findMany({ where: { issueId, respondedAt: null } });

    for (const tracker of trackers) {
      const breached = tracker.responseDeadline ? now > tracker.responseDeadline : false;
      await prisma.slaTracker.update({
        where: { id: tracker.id },
        data: {
          respondedAt: now,
          breached: breached || tracker.breached,
          breachType: breached ? (tracker.breachType === 'RESOLUTION' ? 'BOTH' : 'RESPONSE') : tracker.breachType,
        },
      });
    }

    return success(res, { message: 'SLA response recorded' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const markResolved = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const now = new Date();
    const trackers = await prisma.slaTracker.findMany({ where: { issueId, resolvedAt: null } });

    for (const tracker of trackers) {
      const breached = tracker.resolutionDeadline ? now > tracker.resolutionDeadline : false;
      await prisma.slaTracker.update({
        where: { id: tracker.id },
        data: {
          resolvedAt: now,
          breached: breached || tracker.breached,
          breachType: breached ? (tracker.breachType === 'RESPONSE' ? 'BOTH' : 'RESOLUTION') : tracker.breachType,
        },
      });
    }

    return success(res, { message: 'SLA resolution recorded' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- SLA Report ---
export const getSlaReport = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const trackers = await prisma.slaTracker.findMany({
      where: { slaPolicy: { projectId } },
      include: { slaPolicy: true, issue: { select: { key: true, summary: true, priority: true } } },
    });

    const total = trackers.length;
    const breached = trackers.filter(t => t.breached).length;
    const met = total - breached;
    const complianceRate = total > 0 ? Math.round((met / total) * 100) : 100;

    return success(res, {
      total,
      breached,
      met,
      complianceRate,
      trackers,
    });
  } catch (e: any) {
    return error(res, e.message);
  }
};
