import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// Helper to compute SLA Status at runtime
export function computeSlaStatus(
  deadline: Date | null,
  completedAt: Date | null,
  targetMin: number | null,
  warningPercent: number
): 'MET' | 'MET_LATE' | 'BREACHED' | 'DUE_SOON' | 'ON_TRACK' | 'NONE' {
  if (!deadline) return 'NONE';
  if (completedAt) {
    return completedAt.getTime() <= deadline.getTime() ? 'MET' : 'MET_LATE';
  }
  const now = Date.now();
  const deadlineMs = deadline.getTime();
  if (now > deadlineMs) return 'BREACHED';

  if (targetMin) {
    const warningOffsetMs = (warningPercent / 100) * targetMin * 60 * 1000;
    const warningTimeMs = deadlineMs - warningOffsetMs;
    if (now >= warningTimeMs) return 'DUE_SOON';
  }
  return 'ON_TRACK';
}

// Helper to construct extra SLA metadata for UI (remaining time, etc.)
export function formatSlaMetadata(tracker: any) {
  const warningPercent = tracker.slaPolicy?.warningThresholdPercent ?? 20;

  const startWorkStatus = computeSlaStatus(
    tracker.startWorkDeadline,
    tracker.startedWorkAt,
    tracker.startWorkTargetMinutes,
    warningPercent
  );

  const resolutionStatus = computeSlaStatus(
    tracker.resolutionDeadline,
    tracker.resolvedAt,
    tracker.resolutionTargetMinutes,
    warningPercent
  );

  const now = Date.now();
  
  let remainingStartWorkMs = null;
  if (!tracker.startedWorkAt && tracker.startWorkDeadline) {
    remainingStartWorkMs = Math.max(0, tracker.startWorkDeadline.getTime() - now);
  }

  let remainingResolutionMs = null;
  if (!tracker.resolvedAt && tracker.resolutionDeadline) {
    remainingResolutionMs = Math.max(0, tracker.resolutionDeadline.getTime() - now);
  }

  let overdueStartWorkMs = null;
  if (tracker.startWorkDeadline) {
    const compTime = tracker.startedWorkAt ? tracker.startedWorkAt.getTime() : now;
    if (compTime > tracker.startWorkDeadline.getTime()) {
      overdueStartWorkMs = compTime - tracker.startWorkDeadline.getTime();
    }
  }

  let overdueResolutionMs = null;
  if (tracker.resolutionDeadline) {
    const compTime = tracker.resolvedAt ? tracker.resolvedAt.getTime() : now;
    if (compTime > tracker.resolutionDeadline.getTime()) {
      overdueResolutionMs = compTime - tracker.resolutionDeadline.getTime();
    }
  }

  return {
    ...tracker,
    startWorkStatus,
    resolutionStatus,
    remainingStartWorkMs,
    remainingResolutionMs,
    overdueStartWorkMs,
    overdueResolutionMs,
  };
}

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
    const { name, priority, startWorkTimeMin, resolutionTimeMin, warningThresholdPercent, enabled } = req.body;
    const policy = await prisma.slaPolicy.create({
      data: {
        name,
        projectId,
        priority,
        startWorkTimeMin: parseInt(startWorkTimeMin),
        resolutionTimeMin: parseInt(resolutionTimeMin),
        warningThresholdPercent: warningThresholdPercent ? parseInt(warningThresholdPercent) : 20,
        enabled: enabled !== false,
      },
    });
    return success(res, policy, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updatePolicy = async (req: Request, res: Response) => {
  try {
    const { policyId } = req.params;
    const { name, priority, startWorkTimeMin, resolutionTimeMin, warningThresholdPercent, enabled } = req.body;
    
    const policy = await prisma.slaPolicy.update({
      where: { id: policyId },
      data: {
        name,
        priority,
        startWorkTimeMin: startWorkTimeMin !== undefined ? parseInt(startWorkTimeMin) : undefined,
        resolutionTimeMin: resolutionTimeMin !== undefined ? parseInt(resolutionTimeMin) : undefined,
        warningThresholdPercent: warningThresholdPercent !== undefined ? parseInt(warningThresholdPercent) : undefined,
        enabled,
      },
    });
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
    
    const formatted = trackers.map(t => formatSlaMetadata(t));
    return success(res, formatted);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const startSlaTracking = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const { SlaEngine } = require('../services/sla.engine');
    await SlaEngine.createIssueTrackers(issueId);
    
    const trackers = await prisma.slaTracker.findMany({
      where: { issueId },
      include: { slaPolicy: true },
    });
    return success(res, trackers.map(t => formatSlaMetadata(t)));
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const markResponded = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const { SlaEngine } = require('../services/sla.engine');
    await SlaEngine.handleStartWork(issueId);
    return success(res, { message: 'SLA start work recorded' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const markResolved = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const { SlaEngine } = require('../services/sla.engine');
    await SlaEngine.handleResolution(issueId);
    return success(res, { message: 'SLA resolution recorded' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- SLA Analytics Dashboard Report ---
export const getSlaReport = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const trackers = await prisma.slaTracker.findMany({
      where: { slaPolicy: { projectId } },
      include: {
        slaPolicy: true,
        issue: {
          select: {
            id: true,
            key: true,
            summary: true,
            priority: true,
            assignee: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    const formattedTrackers = trackers.map(t => formatSlaMetadata(t));

    // Calculate Start Work SLA Compliance
    const startWorkSlas = formattedTrackers.filter(t => t.startWorkStatus !== 'NONE');
    const startWorkMet = startWorkSlas.filter(t => t.startWorkStatus === 'MET').length;
    const startWorkCompliance = startWorkSlas.length > 0 ? Math.round((startWorkMet / startWorkSlas.length) * 100) : 100;

    // Calculate Resolution SLA Compliance
    const resolutionSlas = formattedTrackers.filter(t => t.resolutionStatus !== 'NONE');
    const resolutionMet = resolutionSlas.filter(t => t.resolutionStatus === 'MET').length;
    const resolutionCompliance = resolutionSlas.length > 0 ? Math.round((resolutionMet / resolutionSlas.length) * 100) : 100;

    const totalBreached = formattedTrackers.filter(
      t => t.startWorkStatus === 'BREACHED' || t.startWorkStatus === 'MET_LATE' ||
           t.resolutionStatus === 'BREACHED' || t.resolutionStatus === 'MET_LATE'
    ).length;

    // SLA performance per priority
    const priorities = ['LOW', 'MEDIUM', 'HIGH', 'HIGHEST'];
    const performanceByPriority = priorities.map(p => {
      const pTrackers = formattedTrackers.filter(t => t.issue?.priority === p);
      const metCount = pTrackers.filter(t => t.startWorkStatus === 'MET' && t.resolutionStatus === 'MET').length;
      const rate = pTrackers.length > 0 ? Math.round((metCount / pTrackers.length) * 100) : 100;
      return { priority: p, rate, count: pTrackers.length };
    });

    // Top SLA Violators (assignees with breached jobs)
    const violatorMap: Record<string, { name: string, count: number }> = {};
    formattedTrackers.forEach(t => {
      const isBreached = t.startWorkStatus === 'BREACHED' || t.startWorkStatus === 'MET_LATE' ||
                        t.resolutionStatus === 'BREACHED' || t.resolutionStatus === 'MET_LATE';
      if (isBreached && t.issue?.assignee) {
        const assignee = t.issue.assignee;
        const fullName = `${assignee.firstName} ${assignee.lastName}`;
        if (!violatorMap[assignee.id]) {
          violatorMap[assignee.id] = { name: fullName, count: 0 };
        }
        violatorMap[assignee.id].count += 1;
      }
    });
    const topViolators = Object.values(violatorMap).sort((a, b) => b.count - a.count).slice(0, 5);

    // Open Issues Near SLA Breach
    const openNearBreach = formattedTrackers.filter(
      t => t.startWorkStatus === 'DUE_SOON' || t.resolutionStatus === 'DUE_SOON'
    ).map(t => ({
      id: t.issue.id,
      key: t.issue.key,
      summary: t.issue.summary,
      priority: t.issue.priority,
      startWorkStatus: t.startWorkStatus,
      resolutionStatus: t.resolutionStatus,
    }));

    return success(res, {
      startWorkCompliance,
      resolutionCompliance,
      totalBreached,
      performanceByPriority,
      topViolators,
      openNearBreach,
      trackers: formattedTrackers,
    });
  } catch (e: any) {
    return error(res, e.message);
  }
};
