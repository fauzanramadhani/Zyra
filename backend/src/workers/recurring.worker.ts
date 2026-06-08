import { Worker, Job } from 'bullmq';
import { redisConnection } from '../services/import.queue';
import prisma from '../db';
import { IssueService } from '../services/issue.service';
import { scheduleRecurringJob } from '../services/recurring.service';
import { calculateNextRun } from '../controllers/recurring.controller';

export async function processRecurringJob(job: Job) {
  const { recurringId } = job.data;
  console.log(`[Worker] Processing recurring issue job: ${recurringId}`);

  const recurring = await prisma.recurringIssue.findUnique({
    where: { id: recurringId },
  });

  if (!recurring || !recurring.enabled || recurring.deletedAt) {
    console.log(`[Worker] Job skipped: recurring issue ${recurringId} is disabled, deleted, or missing`);
    return;
  }

  const scheduledTime = recurring.nextRunAt || new Date();

  let template: any = {};
  try {
    template = JSON.parse(recurring.templateData || '{}');
  } catch {
    template = {};
  }

  const project = await prisma.project.findUnique({
    where: { id: recurring.projectId },
    include: { boards: { include: { columns: { orderBy: { position: 'asc' } } } } },
  });
  if (!project) throw new Error(`Project not found: ${recurring.projectId}`);

  const todoCol = project.boards[0]?.columns[0];
  if (!todoCol) throw new Error(`No board column found for project: ${recurring.projectId}`);

  // Calculate next run date
  const nextRunAt = calculateNextRun(recurring.schedule, recurring.timezone);

  try {
    // Run the execution and update inside a transaction to guarantee atomicity and idempotency
    await prisma.$transaction(async (tx) => {
      // 1. Enforce idempotency: Create execution record first
      await tx.recurringExecution.create({
        data: {
          recurringId,
          scheduledFor: scheduledTime,
          status: 'SUCCESS',
        },
      });

      // 2. Create the issue using the transaction client
      await IssueService.createIssue({
        projectId: project.id,
        summary: template.summary,
        type: template.type || 'TASK',
        statusId: todoCol.id,
        description: template.description || null,
        priority: template.priority || 'MEDIUM',
        storyPoints: template.storyPoints || null,
        reporterId: recurring.createdBy,
        assigneeId: template.assigneeId || null,
      }, {}, tx);

      // 3. Update PostgreSQL schedule state with optimistic locking
      const updated = await tx.recurringIssue.updateMany({
        where: {
          id: recurringId,
          version: recurring.version,
        },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new Error('Lost-update race condition: Recurring issue was modified by another process.');
      }
    });

    // 4. Schedule next run ONLY if the transaction completes successfully
    await scheduleRecurringJob(recurringId);
    console.log(`[Worker] Successfully completed job. Next run scheduled at: ${nextRunAt.toISOString()}`);

  } catch (err: any) {
    // Catch unique constraint violation for (recurringId, scheduledFor)
    if (err.code === 'P2002' && err.meta?.target?.includes('scheduledFor')) {
      console.log(`[Worker] Job skipped: recurring issue ${recurringId} already executed for scheduled time ${scheduledTime.toISOString()}`);
      return;
    }
    // Re-throw other errors (e.g. optimistic locking or network failure) to let worker retry the job
    console.error(`[Worker] Transaction failed for job ${recurringId}:`, err.message);
    throw err;
  }
}

let worker: Worker | null = null;

export function startRecurringWorker(): Worker {
  if (worker) return worker;
  worker = new Worker('recurring', processRecurringJob, {
    connection: redisConnection as any,
    concurrency: 2,
  });
  worker.on('error', (err) => console.error('[Recurring Worker] Error:', err));
  worker.on('failed', (job, err) => console.error(`[Recurring Worker] Job ${job?.id} failed:`, err?.message));
  console.log('[Recurring Worker] Started');
  return worker;
}

export async function stopRecurringWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[Recurring Worker] Stopped');
  }
}
