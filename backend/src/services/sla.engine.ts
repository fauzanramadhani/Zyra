import prisma from '../db';
import { slaQueue } from '../queues/sla.queue';

export class SlaEngine {
  /**
   * Helper to fetch updated issue with formatted SLA trackers and emit issue:updated event
   */
  static async emitSlaUpdate(issueId: string): Promise<void> {
    try {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          status: true,
          sprint: true,
          slaTrackers: {
            include: {
              slaPolicy: true,
            },
          },
        },
      });

      if (issue) {
        const { emitToProject } = require('./websocket.service');
        const { formatSlaMetadata } = require('../controllers/sla.controller');
        const formattedSla = issue.slaTrackers.map((t: any) => formatSlaMetadata(t));
        emitToProject(issue.projectId, 'issue:updated', {
          ...issue,
          slaTrackers: formattedSla,
        });
      }
    } catch (err: any) {
      console.error('[SlaEngine] Error emitting SLA update:', err.message);
    }
  }

  /**
   * Creates SLA trackers for a new issue and schedules BullMQ delayed jobs
   */
  static async createIssueTrackers(issueId: string): Promise<void> {
    try {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        select: { id: true, projectId: true, priority: true, createdAt: true },
      });

      if (!issue) return;

      // Find applicable active SLA policies
      const policies = await prisma.slaPolicy.findMany({
        where: {
          projectId: issue.projectId,
          enabled: true,
          deletedAt: null,
          OR: [{ priority: issue.priority }, { priority: '*' }],
        },
      });

      for (const policy of policies) {
        const startWorkDeadline = new Date(issue.createdAt.getTime() + policy.startWorkTimeMin * 60 * 1000);
        const resolutionDeadline = new Date(issue.createdAt.getTime() + policy.resolutionTimeMin * 60 * 1000);

        const tracker = await prisma.slaTracker.create({
          data: {
            slaPolicyId: policy.id,
            issueId: issue.id,
            startWorkDeadline,
            resolutionDeadline,
            startWorkTargetMinutes: policy.startWorkTimeMin,
            resolutionTargetMinutes: policy.resolutionTimeMin,
          },
        });

        await this.scheduleSlaJobs(tracker.id, policy.warningThresholdPercent);
      }
      
      // Emit the initial trackers to frontend
      await this.emitSlaUpdate(issueId);
    } catch (err: any) {
      console.error('[SlaEngine] Error creating issue trackers:', err.message);
    }
  }

  /**
   * Schedules delayed warning and breach jobs in BullMQ
   */
  static async scheduleSlaJobs(trackerId: string, warningThresholdPercent: number): Promise<void> {
    try {
      const tracker = await prisma.slaTracker.findUnique({
        where: { id: trackerId },
      });

      if (!tracker) return;

      const now = Date.now();

      // 1. Start Work SLA Jobs
      if (!tracker.startedWorkAt && tracker.startWorkDeadline && tracker.startWorkTargetMinutes) {
        const startWorkDeadlineMs = tracker.startWorkDeadline.getTime();
        const warningOffsetMs = (warningThresholdPercent / 100) * tracker.startWorkTargetMinutes * 60 * 1000;
        const warningTimeMs = startWorkDeadlineMs - warningOffsetMs;

        // Warning job
        if (warningTimeMs > now) {
          await slaQueue.add(
            'sla.startwork.warning',
            { trackerId, issueId: tracker.issueId },
            { jobId: `sla:startwork:warning:${trackerId}`, delay: warningTimeMs - now }
          );
        }

        // Breach job
        if (startWorkDeadlineMs > now) {
          await slaQueue.add(
            'sla.startwork.breach',
            { trackerId, issueId: tracker.issueId },
            { jobId: `sla:startwork:breach:${trackerId}`, delay: startWorkDeadlineMs - now }
          );
        }
      }

      // 2. Resolution SLA Jobs
      if (!tracker.resolvedAt && tracker.resolutionDeadline && tracker.resolutionTargetMinutes) {
        const resolutionDeadlineMs = tracker.resolutionDeadline.getTime();
        const warningOffsetMs = (warningThresholdPercent / 100) * tracker.resolutionTargetMinutes * 60 * 1000;
        const warningTimeMs = resolutionDeadlineMs - warningOffsetMs;

        // Warning job
        if (warningTimeMs > now) {
          await slaQueue.add(
            'sla.resolution.warning',
            { trackerId, issueId: tracker.issueId },
            { jobId: `sla:resolution:warning:${trackerId}`, delay: warningTimeMs - now }
          );
        }

        // Breach job
        if (resolutionDeadlineMs > now) {
          await slaQueue.add(
            'sla.resolution.breach',
            { trackerId, issueId: tracker.issueId },
            { jobId: `sla:resolution:breach:${trackerId}`, delay: resolutionDeadlineMs - now }
          );
        }
      }
    } catch (err: any) {
      console.error('[SlaEngine] Error scheduling jobs:', err.message);
    }
  }

  /**
   * Cancels active BullMQ jobs for Start Work SLA
   */
  static async cancelStartWorkJobs(trackerId: string): Promise<void> {
    try {
      const warningJob = await slaQueue.getJob(`sla:startwork:warning:${trackerId}`);
      if (warningJob) await warningJob.remove();

      const breachJob = await slaQueue.getJob(`sla:startwork:breach:${trackerId}`);
      if (breachJob) await breachJob.remove();
    } catch (err: any) {
      console.error('[SlaEngine] Error cancelling start work jobs:', err.message);
    }
  }

  /**
   * Cancels active BullMQ jobs for Resolution SLA
   */
  static async cancelResolutionJobs(trackerId: string): Promise<void> {
    try {
      const warningJob = await slaQueue.getJob(`sla:resolution:warning:${trackerId}`);
      if (warningJob) await warningJob.remove();

      const breachJob = await slaQueue.getJob(`sla:resolution:breach:${trackerId}`);
      if (breachJob) await breachJob.remove();
    } catch (err: any) {
      console.error('[SlaEngine] Error cancelling resolution jobs:', err.message);
    }
  }

  /**
   * Marks Start Work SLA as Met
   */
  static async handleStartWork(issueId: string): Promise<void> {
    try {
      const now = new Date();

      // Find all trackers for this issue that haven't started work yet
      const trackers = await prisma.slaTracker.findMany({
        where: { issueId, startedWorkAt: null },
      });

      for (const tracker of trackers) {
        await prisma.slaTracker.update({
          where: { id: tracker.id },
          data: { startedWorkAt: now },
        });

        await this.cancelStartWorkJobs(tracker.id);
        console.log(`[SlaEngine] Start Work SLA met for tracker ${tracker.id}`);
      }

      if (trackers.length > 0) {
        await this.emitSlaUpdate(issueId);
      }
    } catch (err: any) {
      console.error('[SlaEngine] Error marking start work SLA:', err.message);
    }
  }

  /**
   * Marks Resolution SLA as Met
   */
  static async handleResolution(issueId: string): Promise<void> {
    try {
      const now = new Date();

      const trackers = await prisma.slaTracker.findMany({
        where: { issueId, resolvedAt: null },
      });

      for (const tracker of trackers) {
        await prisma.slaTracker.update({
          where: { id: tracker.id },
          data: { resolvedAt: now },
        });

        await this.cancelResolutionJobs(tracker.id);
        console.log(`[SlaEngine] Resolution SLA met for tracker ${tracker.id}`);
      }

      if (trackers.length > 0) {
        await this.emitSlaUpdate(issueId);
      }
    } catch (err: any) {
      console.error('[SlaEngine] Error marking resolution SLA:', err.message);
    }
  }

  /**
   * Handles Reopen event (Opsi C: Original deadline remains, schedules warning/breach if in future)
   */
  static async handleReopen(issueId: string): Promise<void> {
    try {
      const trackers = await prisma.slaTracker.findMany({
        where: { issueId },
        include: { slaPolicy: true },
      });

      for (const tracker of trackers) {
        await prisma.slaTracker.update({
          where: { id: tracker.id },
          data: { resolvedAt: null }, // clear completion
        });

        // Cancel any lingering resolution jobs just in case
        await this.cancelResolutionJobs(tracker.id);

        // Re-schedule resolution warning/breach jobs if the deadline is still in the future
        if (tracker.resolutionDeadline && tracker.resolutionDeadline.getTime() > Date.now()) {
          await this.scheduleSlaJobs(tracker.id, tracker.slaPolicy.warningThresholdPercent);
          console.log(`[SlaEngine] Re-scheduled resolution SLA jobs for tracker ${tracker.id} on reopen.`);
        } else {
          console.log(`[SlaEngine] Resolution SLA already breached on reopen for tracker ${tracker.id}.`);
        }
      }

      if (trackers.length > 0) {
        await this.emitSlaUpdate(issueId);
      }
    } catch (err: any) {
      console.error('[SlaEngine] Error handling reopen SLA:', err.message);
    }
  }

  /**
   * Recalculates SLA targets if Issue Priority changes
   */
  static async recalculatePrioritySla(issueId: string): Promise<void> {
    try {
      const issue = await prisma.issue.findUnique({
        where: { id: issueId },
        select: { id: true, projectId: true, priority: true, createdAt: true },
      });

      if (!issue) return;

      // 1. Get and cancel all existing SLA tracker jobs
      const oldTrackers = await prisma.slaTracker.findMany({
        where: { issueId },
      });

      for (const tracker of oldTrackers) {
        await this.cancelStartWorkJobs(tracker.id);
        await this.cancelResolutionJobs(tracker.id);
      }

      // 2. Delete old trackers
      await prisma.slaTracker.deleteMany({
        where: { issueId },
      });

      // 3. Recreate trackers for the new priority, using the issue's original creation time
      const policies = await prisma.slaPolicy.findMany({
        where: {
          projectId: issue.projectId,
          enabled: true,
          deletedAt: null,
          OR: [{ priority: issue.priority }, { priority: '*' }],
        },
      });

      for (const policy of policies) {
        const startWorkDeadline = new Date(issue.createdAt.getTime() + policy.startWorkTimeMin * 60 * 1000);
        const resolutionDeadline = new Date(issue.createdAt.getTime() + policy.resolutionTimeMin * 60 * 1000);

        const tracker = await prisma.slaTracker.create({
          data: {
            slaPolicyId: policy.id,
            issueId: issue.id,
            startWorkDeadline,
            resolutionDeadline,
            startWorkTargetMinutes: policy.startWorkTimeMin,
            resolutionTargetMinutes: policy.resolutionTimeMin,
          },
        });

        await this.scheduleSlaJobs(tracker.id, policy.warningThresholdPercent);
        console.log(`[SlaEngine] Recreated SLA tracker ${tracker.id} for new priority ${issue.priority}`);
      }

      // Emit the updated trackers
      await this.emitSlaUpdate(issueId);
    } catch (err: any) {
      console.error('[SlaEngine] Error recalculating SLA priority:', err.message);
    }
  }

  /**
   * Handles status transitions (Start Work, Resolution, Reopen SLA)
   */
  static async handleStatusChange(issueId: string, fromStatusId: string, toStatusId: string): Promise<void> {
    try {
      const [fromCol, toCol] = await Promise.all([
        prisma.boardColumn.findUnique({
          where: { id: fromStatusId },
          include: { workflowState: true },
        }),
        prisma.boardColumn.findUnique({
          where: { id: toStatusId },
          include: { workflowState: true },
        }),
      ]);

      if (!toCol) return;

      const fromCategory = fromCol?.workflowState?.category || 'TODO';
      const toCategory = toCol.workflowState?.category || 'TODO';

      if (fromCategory === toCategory) return;

      // 1. Start Work SLA
      // If moving out of To Do category, mark start work SLA as met
      if (fromCategory === 'TODO' && toCategory !== 'TODO') {
        await this.handleStartWork(issueId);
      }

      // 2. Resolution SLA
      // If moving into DONE, resolve it
      if (toCategory === 'DONE') {
        await this.handleResolution(issueId);
      }

      // 3. Reopen SLA
      // If moving FROM DONE to TODO or IN_PROGRESS, handle reopen
      if (fromCategory === 'DONE' && (toCategory === 'TODO' || toCategory === 'IN_PROGRESS')) {
        await this.handleReopen(issueId);
      }
    } catch (err: any) {
      console.error('[SlaEngine] Error handling status change:', err.message);
    }
  }
}
