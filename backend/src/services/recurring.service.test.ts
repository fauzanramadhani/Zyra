import { scheduleRecurringJob, removeRecurringJob, recoverRecurringSchedules } from './recurring.service';
import { processRecurringJob } from '../workers/recurring.worker';
import { IssueService } from './issue.service';
import prisma from '../db';
import { calculateNextRun } from '../controllers/recurring.controller';
import { recurringQueue } from '../queues/recurring.queue';

// Define transaction mock client
const mockTx = {
  recurringExecution: {
    create: jest.fn(),
  },
  recurringIssue: {
    updateMany: jest.fn(),
  },
};

// Mock dependencies
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
  }));
});

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    getJob: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    close: jest.fn(),
  })),
}));

jest.mock('../db', () => ({
  __esModule: true,
  default: {
    recurringIssue: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockTx)),
  },
}));

jest.mock('./issue.service', () => ({
  IssueService: {
    createIssue: jest.fn(),
  },
}));

jest.mock('../controllers/recurring.controller', () => ({
  calculateNextRun: jest.fn().mockReturnValue(new Date('2026-06-09T00:00:00.000Z')),
}));

describe('Recurring Issues Auto Scheduler Tests', () => {
  let dateNowSpy: jest.SpyInstance | null = null;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (dateNowSpy) {
      dateNowSpy.mockRestore();
      dateNowSpy = null;
    }
  });

  describe('scheduleRecurringJob', () => {
    it('should schedule a delayed job if recurring issue exists and is enabled', async () => {
      const nextRunAt = new Date('2026-06-09T12:00:00Z');
      const mockIssue = {
        id: 'rec-1',
        enabled: true,
        deletedAt: null,
        nextRunAt,
      };
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValue(mockIssue);

      // Fix current Date.now() for deterministic delay calculation
      const now = new Date('2026-06-09T11:50:00Z').getTime();
      dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

      await scheduleRecurringJob('rec-1');

      expect(prisma.recurringIssue.findUnique).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
      });
      expect(recurringQueue.add).toHaveBeenCalledWith(
        'run-recurring',
        { recurringId: 'rec-1' },
        {
          jobId: 'recurring-rec-1',
          delay: 10 * 60 * 1000, // 10 minutes in ms
        }
      );
    });

    it('should schedule a job with 0 delay if nextRunAt is in the past', async () => {
      const nextRunAt = new Date('2026-06-09T11:00:00Z');
      const mockIssue = {
        id: 'rec-2',
        enabled: true,
        deletedAt: null,
        nextRunAt,
      };
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValue(mockIssue);

      const now = new Date('2026-06-09T11:50:00Z').getTime();
      dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

      await scheduleRecurringJob('rec-2');

      expect(recurringQueue.add).toHaveBeenCalledWith(
        'run-recurring',
        { recurringId: 'rec-2' },
        {
          jobId: 'recurring-rec-2',
          delay: 0,
        }
      );
    });

    it('should not schedule anything if issue is missing, disabled, or deleted', async () => {
      // Disabled
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'rec-disabled',
        enabled: false,
        deletedAt: null,
      });
      await scheduleRecurringJob('rec-disabled');
      expect(recurringQueue.add).not.toHaveBeenCalled();

      // Deleted
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'rec-deleted',
        enabled: true,
        deletedAt: new Date(),
      });
      await scheduleRecurringJob('rec-deleted');
      expect(recurringQueue.add).not.toHaveBeenCalled();

      // Missing
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce(null);
      await scheduleRecurringJob('rec-missing');
      expect(recurringQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('removeRecurringJob', () => {
    it('should remove the job if it exists in the queue', async () => {
      const mockJob = {
        remove: jest.fn().mockResolvedValue(undefined),
      };
      (recurringQueue.getJob as jest.Mock).mockResolvedValue(mockJob);

      await removeRecurringJob('rec-1');

      expect(recurringQueue.getJob).toHaveBeenCalledWith('recurring-rec-1');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should do nothing if job does not exist in the queue', async () => {
      (recurringQueue.getJob as jest.Mock).mockResolvedValue(null);

      await removeRecurringJob('rec-missing-job');

      expect(recurringQueue.getJob).toHaveBeenCalledWith('recurring-rec-missing-job');
    });
  });

  describe('recoverRecurringSchedules', () => {
    it('should recover/schedule active jobs that are missing or completed/failed in BullMQ', async () => {
      const activeSchedules = [
        { id: 'rec-active-1', enabled: true, deletedAt: null, nextRunAt: new Date() },
        { id: 'rec-active-2', enabled: true, deletedAt: null, nextRunAt: new Date() },
        { id: 'rec-active-3', enabled: true, deletedAt: null, nextRunAt: new Date() },
      ];
      (prisma.recurringIssue.findMany as jest.Mock).mockResolvedValue(activeSchedules);

      // getJob mock:
      // rec-active-1 does not exist in queue
      // rec-active-2 exists but state is 'completed'
      // rec-active-3 exists and state is 'delayed' (no recovery needed)
      (recurringQueue.getJob as jest.Mock).mockImplementation((jobId: string) => {
        if (jobId === 'recurring-rec-active-1') return Promise.resolve(null);
        if (jobId === 'recurring-rec-active-2') {
          return Promise.resolve({
            getState: jest.fn().mockResolvedValue('completed'),
            remove: jest.fn().mockResolvedValue(undefined),
          });
        }
        if (jobId === 'recurring-rec-active-3') {
          return Promise.resolve({
            getState: jest.fn().mockResolvedValue('delayed'),
          });
        }
        return Promise.resolve(null);
      });

      // scheduleRecurringJob mocks the database query for the schedules being recovered
      (prisma.recurringIssue.findUnique as jest.Mock).mockImplementation(({ where: { id } }) => {
        const found = activeSchedules.find(s => s.id === id);
        return Promise.resolve(found || null);
      });

      await recoverRecurringSchedules();

      expect(prisma.recurringIssue.findMany).toHaveBeenCalledWith({
        where: { enabled: true, deletedAt: null },
      });
      // Should recover active-1 and active-2, but not active-3
      expect(recurringQueue.add).toHaveBeenCalledTimes(2);
      expect(recurringQueue.add).toHaveBeenCalledWith(
        'run-recurring',
        { recurringId: 'rec-active-1' },
        expect.any(Object)
      );
      expect(recurringQueue.add).toHaveBeenCalledWith(
        'run-recurring',
        { recurringId: 'rec-active-2' },
        expect.any(Object)
      );
    });
  });

  describe('processRecurringJob worker logic', () => {
    it('should process the job, call createIssue inside transaction, calculate next run, update DB with optimistic locking, and re-enqueue', async () => {
      const mockIssue = {
        id: 'rec-worker-1',
        projectId: 'proj-1',
        enabled: true,
        deletedAt: null,
        schedule: 'DAILY',
        timezone: 'UTC',
        createdBy: 'user-reporter',
        version: 0,
        templateData: JSON.stringify({
          summary: 'Recurring task summary',
          type: 'TASK',
          priority: 'HIGH',
          description: 'Recurring task description',
          storyPoints: 5,
          assigneeId: 'user-assignee',
        }),
      };
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce(mockIssue);

      const mockProject = {
        id: 'proj-1',
        boards: [
          {
            columns: [
              { id: 'col-todo', position: 0 },
            ],
          },
        ],
      };
      (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(mockProject);

      const mockCreatedIssue = {
        id: 'issue-new-1',
        key: 'PROJ-10',
      };
      (IssueService.createIssue as jest.Mock).mockResolvedValueOnce(mockCreatedIssue);

      // Mock transaction executions to succeed
      mockTx.recurringExecution.create.mockResolvedValueOnce({ id: 'exec-1' });
      mockTx.recurringIssue.updateMany.mockResolvedValueOnce({ count: 1 });

      // Ensure findUnique works when scheduleRecurringJob queries the DB during processRecurringJob
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce(mockIssue);

      const job = {
        data: { recurringId: 'rec-worker-1' },
      };

      await processRecurringJob(job as any);

      // Verify execution record creation for idempotency
      expect(mockTx.recurringExecution.create).toHaveBeenCalledWith({
        data: {
          recurringId: 'rec-worker-1',
          scheduledFor: expect.any(Date),
          status: 'SUCCESS',
        },
      });

      // Verify createIssue is called with correct params and transaction client
      expect(IssueService.createIssue).toHaveBeenCalledWith(
        {
          projectId: 'proj-1',
          summary: 'Recurring task summary',
          type: 'TASK',
          statusId: 'col-todo',
          description: 'Recurring task description',
          priority: 'HIGH',
          storyPoints: 5,
          reporterId: 'user-reporter',
          assigneeId: 'user-assignee',
        },
        {},
        mockTx
      );

      // Verify DB is updated with nextRunAt, lastRunAt, and version incremented via optimistic locking
      expect(mockTx.recurringIssue.updateMany).toHaveBeenCalledWith({
        where: { id: 'rec-worker-1', version: 0 },
        data: {
          lastRunAt: expect.any(Date),
          nextRunAt: new Date('2026-06-09T00:00:00.000Z'),
          version: { increment: 1 },
        },
      });

      // Verify calculateNextRun is called
      expect(calculateNextRun).toHaveBeenCalledWith('DAILY', 'UTC');

      // Verify that next job gets scheduled
      expect(recurringQueue.add).toHaveBeenCalledWith(
        'run-recurring',
        { recurringId: 'rec-worker-1' },
        expect.any(Object)
      );
    });

    it('should abort and rollback if createIssue fails in transaction', async () => {
      const mockIssue = {
        id: 'rec-fail-1',
        projectId: 'proj-1',
        enabled: true,
        deletedAt: null,
        schedule: 'DAILY',
        timezone: 'UTC',
        createdBy: 'user-reporter',
        version: 1,
        templateData: '{}',
      };
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce(mockIssue);

      const mockProject = {
        id: 'proj-1',
        boards: [{ columns: [{ id: 'col-todo', position: 0 }] }],
      };
      (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(mockProject);

      mockTx.recurringExecution.create.mockResolvedValueOnce({ id: 'exec-fail' });
      // Mock createIssue to throw an error
      (IssueService.createIssue as jest.Mock).mockRejectedValueOnce(new Error('DB Connection drop'));

      const job = { data: { recurringId: 'rec-fail-1' } };

      await expect(processRecurringJob(job as any)).rejects.toThrow('DB Connection drop');

      // Verify next run was NOT scheduled
      expect(recurringQueue.add).not.toHaveBeenCalled();
    });

    it('should skip execution if execution record already exists (idempotency check)', async () => {
      const mockIssue = {
        id: 'rec-dup-1',
        projectId: 'proj-1',
        enabled: true,
        deletedAt: null,
        schedule: 'DAILY',
        timezone: 'UTC',
        createdBy: 'user-reporter',
        version: 1,
        templateData: '{}',
        nextRunAt: new Date('2026-06-09T00:00:00.000Z'),
      };
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce(mockIssue);

      const mockProject = {
        id: 'proj-1',
        boards: [{ columns: [{ id: 'col-todo', position: 0 }] }],
      };
      (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(mockProject);

      // Mock unique constraint error P2002 on execution creation
      const p2002Error = new Error('Unique constraint failed');
      (p2002Error as any).code = 'P2002';
      (p2002Error as any).meta = { target: ['recurringId', 'scheduledFor'] };
      mockTx.recurringExecution.create.mockRejectedValueOnce(p2002Error);

      const job = { data: { recurringId: 'rec-dup-1' } };

      await processRecurringJob(job as any);

      // Verify IssueService.createIssue was NOT called
      expect(IssueService.createIssue).not.toHaveBeenCalled();
      // Verify next run was NOT scheduled
      expect(recurringQueue.add).not.toHaveBeenCalled();
    });

    it('should fail transaction if optimistic locking count is 0 (concurrent schedule update)', async () => {
      const mockIssue = {
        id: 'rec-opt-1',
        projectId: 'proj-1',
        enabled: true,
        deletedAt: null,
        schedule: 'DAILY',
        timezone: 'UTC',
        createdBy: 'user-reporter',
        version: 2,
        templateData: '{}',
      };
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce(mockIssue);

      const mockProject = {
        id: 'proj-1',
        boards: [{ columns: [{ id: 'col-todo', position: 0 }] }],
      };
      (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce(mockProject);

      mockTx.recurringExecution.create.mockResolvedValueOnce({ id: 'exec-opt' });
      (IssueService.createIssue as jest.Mock).mockResolvedValueOnce({ id: 'new-issue' });
      
      // Mock optimistic locking update to affect 0 rows
      mockTx.recurringIssue.updateMany.mockResolvedValueOnce({ count: 0 });

      const job = { data: { recurringId: 'rec-opt-1' } };

      await expect(processRecurringJob(job as any)).rejects.toThrow('Lost-update race condition');

      // Verify next run was NOT scheduled
      expect(recurringQueue.add).not.toHaveBeenCalled();
    });

    it('should skip processing if recurring issue is disabled, deleted, or missing', async () => {
      // Disabled
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'rec-worker-disabled',
        enabled: false,
        deletedAt: null,
      });

      await processRecurringJob({ data: { recurringId: 'rec-worker-disabled' } } as any);
      expect(IssueService.createIssue).not.toHaveBeenCalled();

      // Deleted
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'rec-worker-deleted',
        enabled: true,
        deletedAt: new Date(),
      });

      await processRecurringJob({ data: { recurringId: 'rec-worker-deleted' } } as any);
      expect(IssueService.createIssue).not.toHaveBeenCalled();

      // Missing
      (prisma.recurringIssue.findUnique as jest.Mock).mockResolvedValueOnce(null);

      await processRecurringJob({ data: { recurringId: 'rec-worker-missing' } } as any);
      expect(IssueService.createIssue).not.toHaveBeenCalled();
    });
  });
});
