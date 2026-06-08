import { Worker, Job } from 'bullmq';
import { redisConnection } from '../services/import.queue';
import prisma from '../db';
import { emitToProject, emitToUser } from '../services/websocket.service';
import { AutomationContext } from '../services/automation.engine';
import { IssueService } from '../services/issue.service';

interface AutomationJobData {
  ruleId: string;
  event: string;
  context: AutomationContext;
}

interface ActionResult {
  actionType: string;
  success: boolean;
  message: string;
  duration: number;
}

// ============================================================
// ACTION EXECUTORS
// ============================================================
async function executeAction(action: any, context: AutomationContext): Promise<ActionResult> {
  const start = Date.now();
  try {
    switch (action.type) {
      case 'change_status':
        return await execChangeStatus(action.params, context, start);
      case 'assign_user':
        return await execAssignUser(action.params, context, start);
      case 'unassign_user':
        return await execUnassignUser(context, start);
      case 'add_label':
        return await execAddLabel(action.params, context, start);
      case 'remove_label':
        return await execRemoveLabel(action.params, context, start);
      case 'add_comment':
        return await execAddComment(action.params, context, start);
      case 'send_notification':
        return await execSendNotification(action.params, context, start);
      case 'move_sprint':
        return await execMoveSprint(action.params, context, start);
      case 'create_subtask':
        return await execCreateSubtask(action.params, context, start);
      case 'archive_issue':
        return await execArchiveIssue(context, start);
      case 'set_priority':
        return await execSetPriority(action.params, context, start);
      case 'set_story_points':
        return await execSetStoryPoints(action.params, context, start);
      default:
        return { actionType: action.type, success: false, message: `Unknown action type: ${action.type}`, duration: Date.now() - start };
    }
  } catch (e: any) {
    return { actionType: action.type, success: false, message: e.message, duration: Date.now() - start };
  }
}

async function execChangeStatus(params: any, ctx: AutomationContext, start: number): Promise<ActionResult> {
  // Sprint-level trigger: apply to all issues in the sprint
  if (!ctx.issueId && ctx.sprintId && params.statusId) {
    const result = await prisma.issue.updateMany({
      where: { sprintId: ctx.sprintId, deletedAt: null },
      data: { statusId: params.statusId },
    });
    return { actionType: 'change_status', success: true, message: `Status changed for ${result.count} issue(s)`, duration: Date.now() - start };
  }
  if (!ctx.issueId || !params.statusId) {
    return { actionType: 'change_status', success: false, message: 'Missing issueId or statusId', duration: Date.now() - start };
  }
  await prisma.issue.update({ where: { id: ctx.issueId }, data: { statusId: params.statusId } });
  return { actionType: 'change_status', success: true, message: `Status changed to ${params.statusId}`, duration: Date.now() - start };
}

async function execAssignUser(params: any, ctx: AutomationContext, start: number): Promise<ActionResult> {
  // Sprint-level trigger: assign all issues in the sprint
  if (!ctx.issueId && ctx.sprintId && params.userId) {
    const result = await prisma.issue.updateMany({
      where: { sprintId: ctx.sprintId, deletedAt: null },
      data: { assigneeId: params.userId },
    });
    return { actionType: 'assign_user', success: true, message: `Assigned ${result.count} issue(s)`, duration: Date.now() - start };
  }
  if (!ctx.issueId || !params.userId) {
    return { actionType: 'assign_user', success: false, message: 'Missing issueId or userId', duration: Date.now() - start };
  }
  await prisma.issue.update({ where: { id: ctx.issueId }, data: { assigneeId: params.userId } });
  return { actionType: 'assign_user', success: true, message: `Assigned to ${params.userId}`, duration: Date.now() - start };
}

async function execUnassignUser(ctx: AutomationContext, start: number): Promise<ActionResult> {
  if (!ctx.issueId) {
    return { actionType: 'unassign_user', success: false, message: 'Missing issueId', duration: Date.now() - start };
  }
  await prisma.issue.update({ where: { id: ctx.issueId }, data: { assigneeId: null } });
  return { actionType: 'unassign_user', success: true, message: 'User unassigned', duration: Date.now() - start };
}

async function execAddLabel(params: any, ctx: AutomationContext, start: number): Promise<ActionResult> {
  // Sprint-level: add label to all issues in sprint
  if (!ctx.issueId && ctx.sprintId && params.labelName) {
    let label = await prisma.label.findFirst({ where: { name: params.labelName, projectId: ctx.projectId } });
    if (!label) {
      label = await prisma.label.create({ data: { name: params.labelName, color: '#6366f1', projectId: ctx.projectId } });
    }
    const issues = await prisma.issue.findMany({
      where: { sprintId: ctx.sprintId, deletedAt: null },
      select: { id: true },
    });
    for (const issue of issues) {
      await prisma.issueLabel.upsert({
        where: { issueId_labelId: { issueId: issue.id, labelId: label.id } },
        create: { issueId: issue.id, labelId: label.id },
        update: {},
      });
    }
    return { actionType: 'add_label', success: true, message: `Label "${params.labelName}" added to ${issues.length} issue(s)`, duration: Date.now() - start };
  }
  if (!ctx.issueId || !params.labelName) {
    return { actionType: 'add_label', success: false, message: 'Missing issueId or labelName', duration: Date.now() - start };
  }
  let label = await prisma.label.findFirst({ where: { name: params.labelName, projectId: ctx.projectId } });
  if (!label) {
    label = await prisma.label.create({ data: { name: params.labelName, color: '#6366f1', projectId: ctx.projectId } });
  }
  await prisma.issueLabel.upsert({
    where: { issueId_labelId: { issueId: ctx.issueId, labelId: label.id } },
    create: { issueId: ctx.issueId, labelId: label.id },
    update: {},
  });
  return { actionType: 'add_label', success: true, message: `Label "${params.labelName}" added`, duration: Date.now() - start };
}

async function execRemoveLabel(params: any, ctx: AutomationContext, start: number): Promise<ActionResult> {
  if (!ctx.issueId || !params.labelName) {
    return { actionType: 'remove_label', success: false, message: 'Missing issueId or labelName', duration: Date.now() - start };
  }
  const label = await prisma.label.findFirst({ where: { name: params.labelName, projectId: ctx.projectId } });
  if (label) {
    await prisma.issueLabel.deleteMany({ where: { issueId: ctx.issueId, labelId: label.id } });
  }
  return { actionType: 'remove_label', success: true, message: `Label "${params.labelName}" removed`, duration: Date.now() - start };
}

async function execAddComment(params: any, ctx: AutomationContext, start: number): Promise<ActionResult> {
  if (!ctx.issueId || !params.body) {
    return { actionType: 'add_comment', success: false, message: 'Missing issueId or body', duration: Date.now() - start };
  }
  await prisma.comment.create({
    data: { issueId: ctx.issueId, authorId: ctx.userId || 'system', body: params.body },
  });
  return { actionType: 'add_comment', success: true, message: 'Comment added', duration: Date.now() - start };
}

async function execSendNotification(params: any, ctx: AutomationContext, start: number): Promise<ActionResult> {
  const targetUserId = params.userId || ctx.issueAssigneeId;
  if (!targetUserId) {
    return { actionType: 'send_notification', success: false, message: 'No target user', duration: Date.now() - start };
  }
  await prisma.notification.create({
    data: {
      userId: targetUserId,
      title: params.title || 'Automation',
      message: params.message || 'An automation was triggered.',
      type: 'SYSTEM',
    },
  });
  emitToUser(targetUserId, 'notification:new', { title: params.title, message: params.message });
  return { actionType: 'send_notification', success: true, message: `Notification sent to ${targetUserId}`, duration: Date.now() - start };
}

async function execMoveSprint(params: any, ctx: AutomationContext, start: number): Promise<ActionResult> {
  // Sprint-level: move all issues from one sprint to another (used in sprint_completed)
  if (!ctx.issueId && ctx.sprintId && params.sprintId) {
    const result = await prisma.issue.updateMany({
      where: { sprintId: ctx.sprintId, deletedAt: null },
      data: { sprintId: params.sprintId },
    });
    return { actionType: 'move_sprint', success: true, message: `Moved ${result.count} issue(s)`, duration: Date.now() - start };
  }
  if (!ctx.issueId || !params.sprintId) {
    return { actionType: 'move_sprint', success: false, message: 'Missing issueId or sprintId', duration: Date.now() - start };
  }
  await prisma.issue.update({ where: { id: ctx.issueId }, data: { sprintId: params.sprintId } });
  return { actionType: 'move_sprint', success: true, message: `Moved to sprint ${params.sprintId}`, duration: Date.now() - start };
}

async function execCreateSubtask(params: any, ctx: AutomationContext, start: number): Promise<ActionResult> {
  if (!ctx.issueId || !params.title) {
    return { actionType: 'create_subtask', success: false, message: 'Missing issueId or title', duration: Date.now() - start };
  }
  const parent = await prisma.issue.findUnique({ where: { id: ctx.issueId } });
  if (!parent) {
    return { actionType: 'create_subtask', success: false, message: 'Parent issue not found', duration: Date.now() - start };
  }
  
  await IssueService.createIssue({
    projectId: ctx.projectId,
    summary: params.title,
    type: 'SUB_TASK',
    statusId: parent.statusId,
    priority: 'MEDIUM',
    parentId: ctx.issueId,
    reporterId: ctx.userId || parent.reporterId,
  });
  return { actionType: 'create_subtask', success: true, message: 'Subtask created', duration: Date.now() - start };
}

async function execArchiveIssue(ctx: AutomationContext, start: number): Promise<ActionResult> {
  if (!ctx.issueId) {
    return { actionType: 'archive_issue', success: false, message: 'Missing issueId', duration: Date.now() - start };
  }
  await prisma.issue.update({ where: { id: ctx.issueId }, data: { deletedAt: new Date() } });
  return { actionType: 'archive_issue', success: true, message: 'Issue archived', duration: Date.now() - start };
}

async function execSetPriority(params: any, ctx: AutomationContext, start: number): Promise<ActionResult> {
  // Sprint-level: set priority on all issues in sprint
  if (!ctx.issueId && ctx.sprintId && params.priority) {
    const result = await prisma.issue.updateMany({
      where: { sprintId: ctx.sprintId, deletedAt: null },
      data: { priority: params.priority },
    });
    return { actionType: 'set_priority', success: true, message: `Priority set for ${result.count} issue(s)`, duration: Date.now() - start };
  }
  if (!ctx.issueId || !params.priority) {
    return { actionType: 'set_priority', success: false, message: 'Missing issueId or priority', duration: Date.now() - start };
  }
  await prisma.issue.update({ where: { id: ctx.issueId }, data: { priority: params.priority } });
  return { actionType: 'set_priority', success: true, message: `Priority set to ${params.priority}`, duration: Date.now() - start };
}

async function execSetStoryPoints(params: any, ctx: AutomationContext, start: number): Promise<ActionResult> {
  if (!ctx.issueId || params.points === undefined) {
    return { actionType: 'set_story_points', success: false, message: 'Missing issueId or points', duration: Date.now() - start };
  }
  await prisma.issue.update({ where: { id: ctx.issueId }, data: { storyPoints: Number(params.points) } });
  return { actionType: 'set_story_points', success: true, message: `Story points set to ${params.points}`, duration: Date.now() - start };
}

// ============================================================
// WORKER PROCESSOR
// ============================================================
async function processAutomationJob(job: Job<AutomationJobData>) {
  const { ruleId, event, context } = job.data;
  const startedAt = new Date();

  // Mark execution as running
  const execution = await prisma.automationExecution.create({
    data: {
      ruleId,
      status: 'running',
      triggerEvent: event,
      triggerPayload: JSON.stringify(context),
      triggeredBy: context.userId || 'system',
      startedAt,
    },
  });

  try {
    const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new Error('Rule not found');

    const actions = JSON.parse(rule.actions || '[]');
    const results: ActionResult[] = [];

    for (const action of actions) {
      const result = await executeAction(action, context);
      results.push(result);
    }

    const completedAt = new Date();
    const failed = results.filter((r) => !r.success).length;

    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: failed > 0 ? 'failed' : 'success',
        actionsExecuted: results.length,
        actionResults: JSON.stringify(results),
        errorMessage: failed > 0 ? `${failed} action(s) failed` : null,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      },
    });

    await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        lastTriggeredAt: completedAt,
        executionCount: { increment: 1 },
        failureCount: failed > 0 ? { increment: 1 } : undefined,
      },
    });

    emitToProject(context.projectId, 'automation:executed', {
      ruleId,
      ruleName: rule.name,
      status: failed > 0 ? 'failed' : 'success',
      actionsExecuted: results.length,
      failures: failed,
    });
  } catch (error: any) {
    const completedAt = new Date();
    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        errorMessage: error.message,
        completedAt,
        duration: completedAt.getTime() - startedAt.getTime(),
      },
    });
    await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        lastTriggeredAt: completedAt,
        executionCount: { increment: 1 },
        failureCount: { increment: 1 },
      },
    });
    throw error;
  }
}

// ============================================================
// START / STOP WORKER
// ============================================================
let worker: Worker | null = null;

export function startAutomationWorker(): Worker {
  if (worker) return worker;
  worker = new Worker('automation', processAutomationJob, {
    connection: redisConnection as any,
    concurrency: 5,
  });
  worker.on('error', (err) => console.error('[Automation Worker] Error:', err));
  worker.on('failed', (job, err) => console.error(`[Automation Worker] Job ${job?.id} failed:`, err?.message));
  console.log('[Automation Worker] Started');
  return worker;
}

export async function stopAutomationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Automation Worker] Stopped');
  }
}
