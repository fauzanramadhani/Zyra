import { IssueService } from './issue.service';
import { emitToProject } from './websocket.service';
import { dispatchAutomationEvent } from './automation.engine';
import { syncGoalProgressOnIssueChange } from './goal.service';

const mockTx = {
  project: {
    findUnique: jest.fn().mockResolvedValue({ id: 'proj-123', key: 'PHX' }),
  },
  boardColumn: {
    findUnique: jest.fn().mockResolvedValue({ id: 'col-123', board: { projectId: 'proj-123' } }),
  },
  issue: {
    count: jest.fn().mockResolvedValue(5),
    findFirst: jest.fn().mockResolvedValue({ order: 1000.0 }),
    create: jest.fn().mockImplementation((args) => Promise.resolve({
      id: 'issue-abc',
      key: args.data.key,
      summary: args.data.summary,
      statusId: args.data.statusId,
      priority: args.data.priority,
      type: args.data.type,
      order: args.data.order,
      projectId: args.data.projectId,
      epicId: args.data.epicId,
      parentId: args.data.parentId,
    })),
  },
  issueCustomField: {
    createMany: jest.fn().mockResolvedValue({ count: 1 }),
  },
  activity: {
    create: jest.fn().mockResolvedValue({}),
  },
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    emit: jest.fn(),
  }));
});

jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));

jest.mock('../db', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn((cb) => cb(mockTx)),
  },
}));

jest.mock('./websocket.service', () => ({
  emitToProject: jest.fn(),
}));

jest.mock('./automation.engine', () => ({
  dispatchAutomationEvent: jest.fn(),
}));

jest.mock('./goal.service', () => ({
  syncGoalProgressOnIssueChange: jest.fn(),
}));

describe('IssueService Unified Pipeline Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate identical structural data for Manual Create Issue', async () => {
    const input = {
      projectId: 'proj-123',
      summary: 'Manual test issue',
      type: 'TASK',
      statusId: 'col-123',
      priority: 'HIGH',
      reporterId: 'user-admin',
      customFields: { severity: 'critical' },
    };

    const issue = await IssueService.createIssue(input);

    expect(issue.key).toBe('PHX-6'); // count 5 + 1
    expect(issue.summary).toBe('Manual test issue');
    expect(issue.statusId).toBe('col-123');
    expect(issue.priority).toBe('HIGH');
    expect(issue.order).toBe(2000.0); // max 1000.0 + 1000.0

    // Side Effects
    expect(emitToProject).toHaveBeenCalledWith('proj-123', 'issue:created', issue);
    expect(dispatchAutomationEvent).toHaveBeenCalledWith('issue_created', expect.any(Object));
    expect(syncGoalProgressOnIssueChange).toHaveBeenCalledWith('issue-abc', 'proj-123', null, null);
    expect(mockTx.activity.create).toHaveBeenCalled();
    expect(mockTx.issueCustomField.createMany).toHaveBeenCalled();
  });

  it('should generate identical structural data for Recurring Issue Trigger', async () => {
    const input = {
      projectId: 'proj-123',
      summary: 'Recurring auto issue',
      type: 'BUG',
      statusId: 'col-123',
      priority: 'MEDIUM',
      reporterId: 'user-system',
    };

    const issue = await IssueService.createIssue(input);

    expect(issue.key).toBe('PHX-6');
    expect(issue.summary).toBe('Recurring auto issue');
    expect(issue.statusId).toBe('col-123');
    expect(issue.priority).toBe('MEDIUM');
    expect(issue.order).toBe(2000.0);

    // Side Effects
    expect(emitToProject).toHaveBeenCalledWith('proj-123', 'issue:created', issue);
    expect(dispatchAutomationEvent).toHaveBeenCalledWith('issue_created', expect.any(Object));
    expect(mockTx.activity.create).toHaveBeenCalled();
  });

  it('should generate identical structural data for CSV Import using transactional context and bypassing specific side effects', async () => {
    const input = {
      key: 'PHX-99', // Preserved pre-defined key from CSV
      projectId: 'proj-123',
      summary: 'CSV imported issue',
      type: 'STORY',
      statusId: 'col-123',
      priority: 'LOW',
      reporterId: 'user-importer',
    };

    const issue = await IssueService.createIssue(input, {
      skipWebsocket: true,
      skipAutomation: true,
    }, mockTx);

    expect(issue.key).toBe('PHX-99');
    expect(issue.summary).toBe('CSV imported issue');
    expect(issue.statusId).toBe('col-123');
    expect(issue.priority).toBe('LOW');
    expect(issue.order).toBe(2000.0);

    // Side Effects
    expect(emitToProject).not.toHaveBeenCalled();
    expect(dispatchAutomationEvent).not.toHaveBeenCalled();
    expect(syncGoalProgressOnIssueChange).toHaveBeenCalledWith('issue-abc', 'proj-123', null, null);
    expect(mockTx.activity.create).toHaveBeenCalled();
  });
});
