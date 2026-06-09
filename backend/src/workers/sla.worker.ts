import { Worker, Job } from 'bullmq';
import { redisConnection } from '../services/import.queue';
import prisma from '../db';
import { emitToUser } from '../services/websocket.service';

export async function processSlaJob(job: Job) {
  const { trackerId } = job.data;
  const jobName = job.name;

  console.log(`[SLA Worker] Processing SLA job: ${jobName} for tracker: ${trackerId}`);

  // Fetch the tracker and the issue details
  const tracker = await prisma.slaTracker.findUnique({
    where: { id: trackerId },
    include: {
      issue: {
        select: {
          id: true,
          key: true,
          summary: true,
          assigneeId: true,
          reporterId: true,
          projectId: true,
        },
      },
      slaPolicy: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!tracker || !tracker.issue) {
    console.log(`[SLA Worker] Tracker or issue not found for ID: ${trackerId}`);
    return;
  }

  const { issue, slaPolicy } = tracker;
  const userToNotify = issue.assigneeId || issue.reporterId;

  if (jobName === 'sla.startwork.warning') {
    if (!tracker.startedWorkAt) {
      console.log(`[SLA Worker] Start Work Warning triggered for issue ${issue.key}`);
      if (userToNotify) {
        const title = `SLA Start Work Warning: ${issue.key}`;
        const message = `Issue "${issue.summary}" is approaching its Start Work SLA deadline.`;
        const notification = await prisma.notification.create({
          data: {
            userId: userToNotify,
            title,
            message,
            type: 'SYSTEM',
            link: `/projects/${issue.projectId}/board?issue=${issue.id}`,
          },
        });
        emitToUser(userToNotify, 'notification:received', notification);
      }
    }
  } else if (jobName === 'sla.startwork.breach') {
    if (!tracker.startedWorkAt) {
      console.log(`[SLA Worker] Start Work Breach triggered for issue ${issue.key}`);
      if (userToNotify) {
        const title = `SLA Start Work BREACHED: ${issue.key}`;
        const message = `Issue "${issue.summary}" has breached its Start Work SLA deadline!`;
        const notification = await prisma.notification.create({
          data: {
            userId: userToNotify,
            title,
            message,
            type: 'SYSTEM',
            link: `/projects/${issue.projectId}/board?issue=${issue.id}`,
          },
        });
        emitToUser(userToNotify, 'notification:received', notification);
      }
      await prisma.activity.create({
        data: {
          issueId: issue.id,
          userId: issue.reporterId,
          action: 'SLA_START_WORK_BREACH',
          details: JSON.stringify({ policyName: slaPolicy.name }),
        },
      });
    }
  } else if (jobName === 'sla.resolution.warning') {
    if (!tracker.resolvedAt) {
      console.log(`[SLA Worker] Resolution Warning triggered for issue ${issue.key}`);
      if (userToNotify) {
        const title = `SLA Resolution Warning: ${issue.key}`;
        const message = `Issue "${issue.summary}" is approaching its resolution SLA deadline.`;
        const notification = await prisma.notification.create({
          data: {
            userId: userToNotify,
            title,
            message,
            type: 'SYSTEM',
            link: `/projects/${issue.projectId}/board?issue=${issue.id}`,
          },
        });
        emitToUser(userToNotify, 'notification:received', notification);
      }
    }
  } else if (jobName === 'sla.resolution.breach') {
    if (!tracker.resolvedAt) {
      console.log(`[SLA Worker] Resolution Breach triggered for issue ${issue.key}`);
      if (userToNotify) {
        const title = `SLA Resolution BREACHED: ${issue.key}`;
        const message = `Issue "${issue.summary}" has breached its resolution SLA deadline!`;
        const notification = await prisma.notification.create({
          data: {
            userId: userToNotify,
            title,
            message,
            type: 'SYSTEM',
            link: `/projects/${issue.projectId}/board?issue=${issue.id}`,
          },
        });
        emitToUser(userToNotify, 'notification:received', notification);
      }
      await prisma.activity.create({
        data: {
          issueId: issue.id,
          userId: issue.reporterId,
          action: 'SLA_RESOLUTION_BREACH',
          details: JSON.stringify({ policyName: slaPolicy.name }),
        },
      });
    }
  }
}

let worker: Worker | null = null;

export function startSlaWorker(): Worker {
  if (worker) return worker;
  worker = new Worker('sla', processSlaJob, {
    connection: redisConnection as any,
    concurrency: 5,
  });
  worker.on('error', (err) => console.error('[SLA Worker] Error:', err));
  worker.on('failed', (job, err) => console.error(`[SLA Worker] Job ${job?.id} failed:`, err?.message));
  console.log('[SLA Worker] Started');
  return worker;
}

export async function stopSlaWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
    console.log('[SLA Worker] Stopped');
  }
}
