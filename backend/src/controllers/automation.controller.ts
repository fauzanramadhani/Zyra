import { Request, Response } from 'express';
import prisma from '../db';

// List automation rules for a project
export const listRules = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const rules = await prisma.automationRule.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: rules });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch automation rules' });
  }
};

// Create an automation rule
export const createRule = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, triggerType, triggerConfig, conditions, conditionLogic, actions, enabled } = req.body;

    if (!name || !triggerType || !actions) {
      res.status(400).json({ error: 'name, triggerType, and actions are required' });
      return;
    }

    const rule = await prisma.automationRule.create({
      data: {
        name,
        projectId,
        triggerType,
        triggerConfig: triggerConfig ? JSON.stringify(triggerConfig) : null,
        conditions: conditions ? JSON.stringify(conditions) : null,
        conditionLogic: conditionLogic || 'AND',
        actions: JSON.stringify(actions),
        enabled: enabled !== false,
      },
    });

    res.status(201).json({ data: rule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create automation rule' });
  }
};

// Update an automation rule
export const updateRule = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { name, triggerType, triggerConfig, conditions, conditionLogic, actions, enabled } = req.body;

    const rule = await prisma.automationRule.update({
      where: { id: ruleId },
      data: {
        ...(name !== undefined && { name }),
        ...(triggerType !== undefined && { triggerType }),
        ...(triggerConfig !== undefined && { triggerConfig: JSON.stringify(triggerConfig) }),
        ...(conditions !== undefined && { conditions: JSON.stringify(conditions) }),
        ...(conditionLogic !== undefined && { conditionLogic }),
        ...(actions !== undefined && { actions: JSON.stringify(actions) }),
        ...(enabled !== undefined && { enabled }),
      },
    });

    res.json({ data: rule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update automation rule' });
  }
};

// Delete an automation rule
export const deleteRule = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    await prisma.automationRule.update({ where: { id: ruleId }, data: { deletedAt: new Date() } });
    res.json({ message: 'Rule deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete automation rule' });
  }
};

// Toggle rule enabled/disabled
export const toggleRule = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const rule = await prisma.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule) { res.status(404).json({ error: 'Rule not found' }); return; }

    const updated = await prisma.automationRule.update({
      where: { id: ruleId },
      data: { enabled: !rule.enabled },
    });

    res.json({ data: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle rule' });
  }
};

// Execute automation rules for an event (called internally)
// Delegates to the automation engine for proper queue-based processing
export const executeRules = async (projectId: string, event: string, context: any) => {
  try {
    const { dispatchAutomationEvent } = await import('../services/automation.engine');
    await dispatchAutomationEvent(event as any, { ...context, projectId });
  } catch (err) {
    console.error('Automation execution error:', err);
  }
};

// Get automation stats for a project
export const getStats = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const [totalRules, activeRules, totalExecutions, failedExecutions] = await Promise.all([
      prisma.automationRule.count({ where: { projectId, deletedAt: null } }),
      prisma.automationRule.count({ where: { projectId, enabled: true, deletedAt: null } }),
      prisma.automationExecution.count({ where: { rule: { projectId } } }),
      prisma.automationExecution.count({ where: { rule: { projectId }, status: 'failed' } }),
    ]);
    const failureRate = totalExecutions > 0 ? Math.round((failedExecutions / totalExecutions) * 100) : 0;
    res.json({ data: { totalRules, activeRules, totalExecutions, failureRate } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

// Get execution logs for a project
export const getExecutions = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { limit } = req.query;
    const executions = await prisma.automationExecution.findMany({
      where: { rule: { projectId } },
      orderBy: { startedAt: 'desc' },
      take: limit ? parseInt(limit as string) : 50,
      include: { rule: { select: { id: true, name: true } } },
    });
    res.json({ data: executions });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch executions' });
  }
};

// Test / dry-run an automation rule
export const testRule = async (req: Request, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { context } = req.body;
    const { dryRunAutomation } = await import('../services/automation.engine');
    const result = await dryRunAutomation(ruleId, context);
    res.json({ data: result });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Test failed' });
  }
};
