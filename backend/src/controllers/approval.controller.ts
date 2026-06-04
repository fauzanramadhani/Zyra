import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- Approval Rules ---
export const listRules = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const rules = await prisma.approvalRule.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, rules.map(r => ({
      ...r,
      approverIds: (() => { try { return JSON.parse(r.approverIds || '[]'); } catch { return []; } })()
    })));
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createRule = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, triggerStatus, targetStatus, requiredApprovals, approverIds, enabled } = req.body;
    if (!name || !triggerStatus || !targetStatus) {
      return error(res, 'name, triggerStatus, and targetStatus are required', 400);
    }
    const rule = await prisma.approvalRule.create({
      data: {
        projectId,
        name,
        triggerStatus,
        targetStatus,
        requiredApprovals: requiredApprovals || 1,
        approverIds: JSON.stringify(approverIds),
        enabled: enabled !== false,
      },
    });
    return success(res, rule, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateRule = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { name, triggerStatus, targetStatus, requiredApprovals, approverIds, enabled } = req.body;
    const data: any = {};
    if (name) data.name = name;
    if (triggerStatus) data.triggerStatus = triggerStatus;
    if (targetStatus) data.targetStatus = targetStatus;
    if (requiredApprovals) data.requiredApprovals = requiredApprovals;
    if (approverIds) data.approverIds = JSON.stringify(approverIds);
    if (enabled !== undefined) data.enabled = enabled;

    const rule = await prisma.approvalRule.update({ where: { id: ruleId }, data });
    return success(res, rule);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteRule = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    await prisma.approvalRule.update({ where: { id: ruleId }, data: { deletedAt: new Date() } });
    return success(res, { message: 'Approval rule deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Approval Requests ---
export const requestApproval = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const userId = (req as any).user.id;
    const { ruleId } = req.body;

    const request = await prisma.approvalRequest.create({
      data: { ruleId, issueId, requestedBy: userId },
    });
    return success(res, request, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const listApprovalRequests = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const requests = await prisma.approvalRequest.findMany({
      where: { issueId },
      include: { rule: true, responses: true },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, requests);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const respondToApproval = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = (req as any).user.id;
    const { decision, comment } = req.body;

    const response = await prisma.approvalResponse.create({
      data: { requestId, userId, decision, comment },
    });

    // Check if enough approvals have been collected
    const request = await prisma.approvalRequest.findUnique({
      where: { id: requestId },
      include: { rule: true, responses: true },
    });

    if (request) {
      const approvals = request.responses.filter(r => r.decision === 'APPROVED').length + (decision === 'APPROVED' ? 1 : 0);
      const rejections = request.responses.filter(r => r.decision === 'REJECTED').length + (decision === 'REJECTED' ? 1 : 0);

      if (rejections > 0) {
        await prisma.approvalRequest.update({ where: { id: requestId }, data: { status: 'REJECTED' } });
      } else if (approvals >= request.rule.requiredApprovals) {
        await prisma.approvalRequest.update({ where: { id: requestId }, data: { status: 'APPROVED' } });
        // Auto-move issue to target status
        const targetCol = await prisma.boardColumn.findFirst({ where: { id: request.rule.targetStatus } });
        if (targetCol) {
          await prisma.issue.update({ where: { id: request.issueId }, data: { statusId: targetCol.id } });
        }
      }
    }

    return success(res, response, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const getPendingApprovals = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    // Find all rules where user is an approver
    const rules = await prisma.approvalRule.findMany({ where: { deletedAt: null, enabled: true } });
    const userRuleIds = rules.filter(r => {
      const approvers = (() => { try { return JSON.parse(r.approverIds || '[]'); } catch { return []; } })();
      return approvers.includes(userId);
    }).map(r => r.id);

    const pending = await prisma.approvalRequest.findMany({
      where: { ruleId: { in: userRuleIds }, status: 'PENDING' },
      include: {
        rule: true,
        issue: { select: { key: true, summary: true, priority: true } },
        responses: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return success(res, pending);
  } catch (e: any) {
    return error(res, e.message);
  }
};
