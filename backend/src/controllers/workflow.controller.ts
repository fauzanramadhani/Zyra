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
    const { name, description, isDefault, states } = req.body;

    const workflow = await prisma.$transaction(async (tx) => {
      const wf = await tx.workflow.create({
        data: {
          name,
          description,
          projectId,
          isDefault: isDefault || false,
          states: states && Array.isArray(states) ? {
            create: states.map((s: any, idx: number) => ({
              name: s.name,
              category: s.category || 'TODO',
              color: s.color || '#6B7280',
              position: s.position ?? idx,
            }))
          } : undefined,
        },
        include: { states: true },
      });

      if (isDefault) {
        await tx.workflow.updateMany({
          where: { projectId, id: { not: wf.id } },
          data: { isDefault: false },
        });

        const board = await tx.board.findFirst({ where: { projectId } });
        if (board && states && Array.isArray(states)) {
          const currentColumns = await tx.boardColumn.findMany({ where: { boardId: board.id } });
          const stateNames = states.map(s => s.name.toLowerCase());
          const firstColumn = currentColumns.find(c => c.name.toLowerCase() === states[0]?.name.toLowerCase()) || currentColumns[0];

          for (const col of currentColumns) {
            if (!stateNames.includes(col.name.toLowerCase())) {
              if (firstColumn && firstColumn.id !== col.id) {
                await tx.issue.updateMany({ where: { statusId: col.id }, data: { statusId: firstColumn.id } });
              }
              await tx.boardColumn.delete({ where: { id: col.id } });
            }
          }

          for (let i = 0; i < states.length; i++) {
            const state = states[i];
            const normalizedName = state.name.charAt(0).toUpperCase() + state.name.slice(1);
            let col = currentColumns.find(c => c.name.toLowerCase() === state.name.toLowerCase());
            const dbState = wf.states.find(s => s.name.toLowerCase() === state.name.toLowerCase());
            if (!col) {
              await tx.boardColumn.create({
                data: { 
                  name: normalizedName, 
                  position: i, 
                  boardId: board.id,
                  workflowStateId: dbState?.id || null
                }
              });
            } else {
              await tx.boardColumn.update({ 
                where: { id: col.id }, 
                data: { 
                  position: i,
                  workflowStateId: dbState?.id || null
                } 
              });
            }
          }
        }
      }

      return wf;
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
    const { name, description, isDefault, states } = req.body;

    const workflow = await prisma.$transaction(async (tx) => {
      const originalWf = await tx.workflow.findUnique({ where: { id: workflowId } });
      if (!originalWf) throw new Error('Workflow not found');

      await tx.workflow.update({
        where: { id: workflowId },
        data: { name, description, isDefault },
      });

      if (isDefault) {
        await tx.workflow.updateMany({
          where: { projectId: originalWf.projectId, id: { not: workflowId } },
          data: { isDefault: false },
        });
      }

      if (states && Array.isArray(states)) {
        const incomingIds = states.map((s: any) => s.id).filter(Boolean);

        await tx.workflowState.deleteMany({
          where: {
            workflowId,
            id: { notIn: incomingIds }
          }
        });

        for (let idx = 0; idx < states.length; idx++) {
          const s = states[idx];
          if (s.id) {
            await tx.workflowState.update({
              where: { id: s.id, workflowId },
              data: {
                name: s.name,
                category: s.category || 'TODO',
                position: s.position ?? idx,
              }
            });
          } else {
            await tx.workflowState.create({
              data: {
                workflowId,
                name: s.name,
                category: s.category || 'TODO',
                position: s.position ?? idx,
              }
            });
          }
        }
      }

      // Sync with Board Columns if default
      if (isDefault) {
        const board = await tx.board.findFirst({ where: { projectId: originalWf.projectId } });
        if (board) {
          const currentColumns = await tx.boardColumn.findMany({ where: { boardId: board.id } });
          const dbStates = await tx.workflowState.findMany({ where: { workflowId }, orderBy: { position: 'asc' } });
          const stateNames = dbStates.map(s => s.name.toLowerCase());
          const firstColumn = currentColumns.find(c => c.name.toLowerCase() === dbStates[0]?.name.toLowerCase()) || currentColumns[0];

          for (const col of currentColumns) {
            if (!stateNames.includes(col.name.toLowerCase())) {
              if (firstColumn && firstColumn.id !== col.id) {
                await tx.issue.updateMany({ where: { statusId: col.id }, data: { statusId: firstColumn.id } });
              }
              await tx.boardColumn.delete({ where: { id: col.id } });
            }
          }

          for (let i = 0; i < dbStates.length; i++) {
            const state = dbStates[i];
            let col = currentColumns.find(c => c.name.toLowerCase() === state.name.toLowerCase());
            if (!col) {
              await tx.boardColumn.create({
                data: { 
                  name: state.name, 
                  position: i, 
                  boardId: board.id,
                  workflowStateId: state.id
                }
              });
            } else {
              await tx.boardColumn.update({ 
                where: { id: col.id }, 
                data: { 
                  position: i,
                  workflowStateId: state.id
                } 
              });
            }
          }
        }
      }

      return tx.workflow.findUnique({
        where: { id: workflowId },
        include: { states: { orderBy: { position: 'asc' } } }
      });
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
