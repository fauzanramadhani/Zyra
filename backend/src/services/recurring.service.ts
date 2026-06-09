import prisma from '../db';
import { recurringQueue } from '../queues/recurring.queue';

/**
 * Adds a delayed job to BullMQ for a specific RecurringIssue.
 * The job is identified by a deterministic jobId (`recurring:${recurringId}`) to prevent duplicates.
 */
export async function scheduleRecurringJob(recurringId: string): Promise<void> {
  const recurring = await prisma.recurringIssue.findUnique({
    where: { id: recurringId },
  });

  if (!recurring || !recurring.enabled || recurring.deletedAt) {
    return;
  }

  // Remove any existing job to clear the unique jobId namespace in Redis
  await removeRecurringJob(recurringId);

  // Fallback if nextRunAt is somehow missing
  const nextRun = recurring.nextRunAt || new Date();
  const delay = nextRun.getTime() - Date.now();

  await recurringQueue.add(
    'run-recurring',
    { recurringId },
    {
      jobId: `recurring-${recurringId}`,
      delay: delay > 0 ? delay : 0,
    }
  );
  console.log(`[Scheduler] Scheduled job recurring:${recurringId} with delay: ${delay}ms`);
}

/**
 * Removes the delayed job associated with a RecurringIssue from BullMQ.
 */
export async function removeRecurringJob(recurringId: string): Promise<void> {
  const job = await recurringQueue.getJob(`recurring-${recurringId}`);
  if (job) {
    await job.remove();
    console.log(`[Scheduler] Removed job recurring-${recurringId} from queue`);
  }
}

/**
 * Performs startup recovery:
 * Scans PostgreSQL for active schedules and ensures their delayed executions are registered in BullMQ.
 * Resolves missing, dead, or completed job states.
 */
export async function recoverRecurringSchedules(): Promise<void> {
  console.log('[Scheduler] Executing startup recovery for recurring issues...');

  const activeSchedules = await prisma.recurringIssue.findMany({
    where: { enabled: true, deletedAt: null },
  });

  let recoveredCount = 0;

  for (const schedule of activeSchedules) {
    const job = await recurringQueue.getJob(`recurring-${schedule.id}`);
    const state = job ? await job.getState() : null;

    // Reschedule if the job does not exist, or if it has already ran (is completed/failed)
    if (!job || state === 'completed' || state === 'failed') {
      await scheduleRecurringJob(schedule.id);
      recoveredCount++;
    }
  }

  console.log(`[Scheduler] Startup recovery finished. Recovered/scheduled ${recoveredCount} jobs.`);
}
