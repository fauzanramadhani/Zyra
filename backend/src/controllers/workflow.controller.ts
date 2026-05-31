import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

export const listWorkflows = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const workflows = await prisma.workflow.findMany({
      where: { projectId, deletedAt: null },
      include: { states: { orderBy: { position: 'asc' } }, transitions: true },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, workflows);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createWorkflow = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, isDefault } = req.body;
    const workflow = await prisma.workflow.create({
      data: { name, projectId, isDefault: isDefault || false },
    });
    return success(res, workflow, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const getWorkflow = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        states: { orderBy: { position: 'asc' } },
        transitions: { include: { fromState: true, toState: true } },
      },
    });
    if (!workflow) return error(res, 'Workflow not found', 404);
    return success(res, workflow);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateWorkflow = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { name, isDefault } = req.body;
    const workflow = await prisma.workflow.update({
      where: { id: workflowId },
      data: { name, isDefault },
    });
    return success(res, workflow);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteWorkflow = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    await prisma.workflow.update({ where: { id: workflowId }, data: { deletedAt: new Date() } });
    return success(res, { message: 'Workflow deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Workflow States ---
export const addState = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { name, category, color, position } = req.body;
    const state = await prisma.workflowState.create({
      data: { workflowId, name, category, color, position: position || 0 },
    });
    return success(res, state, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateState = async (req: Request, res: Response) => {
  try {
    const { stateId } = req.params;
    const data = req.body;
    const state = await prisma.workflowState.update({ where: { id: stateId }, data });
    return success(res, state);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteState = async (req: Request, res: Response) => {
  try {
    const { stateId } = req.params;
    await prisma.workflowState.delete({ where: { id: stateId } });
    return success(res, { message: 'State deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Workflow Transitions ---
export const addTransition = async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const { fromStateId, toStateId, name, conditions } = req.body;
    const transition = await prisma.workflowTransition.create({
      data: { workflowId, fromStateId, toStateId, name, conditions: conditions ? JSON.stringify(conditions) : null },
    });
    return success(res, transition, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteTransition = async (req: Request, res: Response) => {
  try {
    const { transitionId } = req.params;
    await prisma.workflowTransition.delete({ where: { id: transitionId } });
    return success(res, { message: 'Transition deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};
