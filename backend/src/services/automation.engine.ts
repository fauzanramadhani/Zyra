import prisma from '../db';
import { automationQueue } from './automation.queue';
import { emitToProject } from './websocket.service';

// ============================================================
// AUTOMATION EVENT TYPES
// ============================================================
export type AutomationEvent =
  | 'issue_created' | 'issue_updated' | 'issue_deleted'
  | 'issue_assigned' | 'issue_unassigned' | 'issue_completed'
  | 'issue_archived' | 'issue_status_changed' | 'issue_moved_status'
  | 'issue_moved_sprint' | 'issue_priority_changed'
  | 'sprint_started' | 'sprint_completed' | 'sprint_created'
  | 'comment_added'
  | 'due_date_reached' | 'overdue_issue';

export interface AutomationContext {
  projectId: string;
  userId?: string;
  issueId?: string;
  sprintId?: string;
  commentId?: string;
  issueType?: string;
  issuePriority?: string;
  issueStatusId?: string;
  issueStatusName?: string;
  issueAssigneeId?: string;
  issueReporterId?: string;
  issueSprintId?: string;
  issueStoryPoints?: number;
  issueDueDate?: string;
  issueSummary?: string;
  fromStatusId?: string;
  toStatusId?: string;
  fromStatusName?: string;
  toStatusName?: string;
  fromSprintId?: string;
  toSprintId?: string;
  fromAssigneeId?: string;
  toAssigneeId?: string;
  fromPriority?: string;
  toPriority?: string;
  [key: string]: any;
}

// ============================================================
// CONDITION OPERATORS
// ============================================================
type Operator = 'equals' | 'not_equals' | 'contains' | 'not_contains'
  | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty' | 'in' | 'not_in';

interface Condition {
  field: string;
  operator: Operator;
  value: any;
}

function evaluateCondition(condition: Condition, context: AutomationContext): boolean {
  const fieldValue = getFieldValue(condition.field, context);

  switch (condition.operator) {
    case 'equals':
      return String(fieldValue).toLowerCase() === String(condition.value).toLowerCase();
    case 'not_equals':
      return String(fieldValue).toLowerCase() !== String(condition.value).toLowerCase();
    case 'contains':
      return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
    case 'not_contains':
      return !String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
    case 'greater_than':
      return Number(fieldValue) > Number(condition.value);
    case 'less_than':
      return Number(fieldValue) < Number(condition.value);
    case 'is_empty':
      return !fieldValue || fieldValue === '' || fieldValue === null || fieldValue === undefined;
    case 'is_not_empty':
      return !!fieldValue && fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
    case 'in':
      return Array.isArray(condition.value) ? condition.value.includes(fieldValue) : false;
    case 'not_in':
      return Array.isArray(condition.value) ? !condition.value.includes(fieldValue) : true;
    default:
      return false;
  }
}

function getFieldValue(field: string, context: AutomationContext): any {
  const fieldMap: Record<string, any> = {
    issue_type: context.issueType,
    priority: context.issuePriority,
    status_id: context.issueStatusId,
    status_name: context.issueStatusName,
    assignee_id: context.issueAssigneeId,
    reporter_id: context.issueReporterId,
    sprint_id: context.issueSprintId,
    story_points: context.issueStoryPoints,
    due_date: context.issueDueDate,
    summary: context.issueSummary,
    from_status_id: context.fromStatusId,
    to_status_id: context.toStatusId,
    from_status_name: context.fromStatusName,
    to_status_name: context.toStatusName,
    from_sprint_id: context.fromSprintId,
    to_sprint_id: context.toSprintId,
    from_assignee_id: context.fromAssigneeId,
    to_assignee_id: context.toAssigneeId,
  };
  return fieldMap[field] ?? context[field as keyof AutomationContext];
}

export function evaluateConditions(
  conditions: Condition[],
  logic: string,
  context: AutomationContext
): boolean {
  if (!conditions || conditions.length === 0) return true;
  if (logic === 'OR') return conditions.some((c) => evaluateCondition(c, context));
  return conditions.every((c) => evaluateCondition(c, context));
}

// ============================================================
// TRIGGER CONFIG MATCHING
// ============================================================
function matchesTriggerConfig(
  event: AutomationEvent,
  config: any,
  context: AutomationContext
): boolean {
  switch (event) {
    case 'issue_status_changed':
    case 'issue_moved_status':
      if (config.fromStatusId && config.fromStatusId !== context.fromStatusId) return false;
      if (config.toStatusId && config.toStatusId !== context.toStatusId) return false;
      if (config.toStatusName && config.toStatusName.toLowerCase() !== context.toStatusName?.toLowerCase()) return false;
      return true;
    case 'issue_moved_sprint':
      if (config.toSprintId && config.toSprintId !== context.toSprintId) return false;
      return true;
    case 'issue_assigned':
      if (config.toAssigneeId && config.toAssigneeId !== context.toAssigneeId) return false;
      return true;
    case 'issue_priority_changed':
      if (config.fromPriority && config.fromPriority !== context.fromPriority) return false;
      if (config.toPriority && config.toPriority !== context.toPriority) return false;
      return true;
    default:
      return true;
  }
}

// ============================================================
// ENRICH CONTEXT from raw issue object
// ============================================================
function enrichContext(ctx: any): AutomationContext {
  const { issue, changes, ...rest } = ctx;
  if (!issue) return rest;
  return {
    ...rest,
    issueId: rest.issueId || issue.id,
    issueType: rest.issueType || issue.type,
    issuePriority: rest.issuePriority || issue.priority,
    issueStatusId: rest.issueStatusId || issue.statusId,
    issueStatusName: rest.issueStatusName || issue.status?.name,
    issueAssigneeId: rest.issueAssigneeId || issue.assigneeId,
    issueReporterId: rest.issueReporterId || issue.reporterId,
    issueSprintId: rest.issueSprintId || issue.sprintId,
    issueStoryPoints: rest.issueStoryPoints || issue.storyPoints,
    issueDueDate: rest.issueDueDate || issue.dueDate,
    issueSummary: rest.issueSummary || issue.summary,
    fromStatusId: rest.fromStatusId || changes?.statusId?.from || rest.fromStatus,
    toStatusId: rest.toStatusId || changes?.statusId?.to || rest.toStatus,
    fromAssigneeId: rest.fromAssigneeId || changes?.assigneeId?.from || rest.fromAssignee,
    toAssigneeId: rest.toAssigneeId || changes?.assigneeId?.to || rest.toAssignee,
    fromPriority: rest.fromPriority || changes?.priority?.from,
    toPriority: rest.toPriority || changes?.priority?.to,
  };
}

// ============================================================
// DISPATCH EVENT
// ============================================================
export async function dispatchAutomationEvent(
  event: AutomationEvent,
  context: AutomationContext
): Promise<void> {
  try {
    const enriched = enrichContext(context);

    const rules = await prisma.automationRule.findMany({
      where: {
        projectId: enriched.projectId,
        triggerType: event,
        enabled: true,
        deletedAt: null,
      },
    });

    if (rules.length === 0) return;

    for (const rule of rules) {
      const triggerConfig = JSON.parse(rule.triggerConfig || '{}');
      if (!matchesTriggerConfig(event, triggerConfig, enriched)) continue;

      const conditions: Condition[] = JSON.parse(rule.conditions || '[]');
      const conditionsMet = evaluateConditions(conditions, rule.conditionLogic, enriched);

      if (!conditionsMet) {
        await prisma.automationExecution.create({
          data: {
            ruleId: rule.id,
            status: 'skipped',
            triggerEvent: event,
            triggerPayload: JSON.stringify(enriched),
            triggeredBy: enriched.userId || 'system',
            startedAt: new Date(),
            completedAt: new Date(),
            duration: 0,
          },
        });
        continue;
      }

      await automationQueue.add('execute-automation', {
        ruleId: rule.id,
        event,
        context: enriched,
      }, {
        jobId: `${rule.id}-${Date.now()}`,
      });

      emitToProject(enriched.projectId, 'automation:queued', {
        ruleId: rule.id,
        ruleName: rule.name,
        event,
      });
    }
  } catch (err) {
    console.error('[Automation] Dispatch error:', err);
  }
}

// ============================================================
// DRY RUN
// ============================================================
export async function dryRunAutomation(
  ruleId: string,
  context: AutomationContext
): Promise<{
  conditionsMet: boolean;
  conditionResults: { field: string; operator: string; value: any; result: boolean }[];
  actionsToExecute: any[];
}> {
  const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
  if (!rule) throw new Error('Rule not found');

  const conditions: Condition[] = JSON.parse(rule.conditions || '[]');
  const actions = JSON.parse(rule.actions || '[]');

  const conditionResults = conditions.map((c) => ({
    field: c.field,
    operator: c.operator,
    value: c.value,
    result: evaluateCondition(c, context),
  }));

  const conditionsMet = evaluateConditions(conditions, rule.conditionLogic, context);

  return { conditionsMet, conditionResults, actionsToExecute: conditionsMet ? actions : [] };
}
