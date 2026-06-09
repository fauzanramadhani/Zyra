import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- AI: Smart Auto-Assign ---
export const suggestAssignee = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { type } = req.body;

    // Cari columnIds yang namanya "Done"
    const doneColumns = await prisma.boardColumn.findMany({ where: { name: 'Done' }, select: { id: true } });
    const doneColumnIds = doneColumns.map(c => c.id);

    // Retrieve workspace members that are OWNER/SUPER_ADMIN or have WorkspaceMemberProject link
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: (await prisma.project.findUnique({ where: { id: projectId }, select: { workspaceId: true } }))?.workspaceId || '',
        OR: [
          { role: { in: ['OWNER', 'SUPER_ADMIN'] } },
          { allowedProjects: { some: { projectId } } }
        ]
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });

    // Calculate workload per member (open issues count)
    const workloads = await Promise.all(
      members.map(async (m) => {
        const openIssues = await prisma.issue.count({
          where: {
            assigneeId: m.userId,
            projectId,
            deletedAt: null,
            statusId: { notIn: doneColumnIds },
          },
        });
        // Calculate expertise score based on completed similar issues
        const completedSimilar = await prisma.issue.count({
          where: {
            assigneeId: m.userId,
            projectId,
            type: type || undefined,
            deletedAt: null,
            statusId: { in: doneColumnIds },
          },
        });
        return {
          userId: m.userId,
          user: m.user,
          openIssues,
          expertise: completedSimilar,
          score: completedSimilar * 2 - openIssues, // Higher expertise, lower workload = better
        };
      })
    );

    // Sort by score (highest first)
    workloads.sort((a, b) => b.score - a.score);

    return success(res, {
      suggestions: workloads.slice(0, 3).map(w => ({
        user: w.user,
        reason: `${w.expertise} similar issues completed, ${w.openIssues} open issues`,
        score: w.score,
      })),
    });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- AI: Duplicate Detection ---
export const detectDuplicates = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { summary } = req.body;

    if (!summary) return error(res, 'Summary is required', 400);

    // Simple keyword-based similarity (in production, use embeddings)
    const words = summary.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);

    const issues = await prisma.issue.findMany({
      where: { projectId, deletedAt: null },
      select: { id: true, key: true, summary: true, type: true, priority: true, status: { select: { name: true } } },
    });

    const scored = issues.map(issue => {
      const issueWords = issue.summary.toLowerCase().split(/\s+/);
      const matchCount = words.filter((w: string) => issueWords.some((iw: string) => iw.includes(w) || w.includes(iw))).length;
      const similarity = words.length > 0 ? matchCount / words.length : 0;
      return { ...issue, similarity };
    }).filter(i => i.similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);

    return success(res, { potentialDuplicates: scored });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- AI: Sprint Planning Suggestions ---
export const sprintPlanningSuggestions = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    // Calculate velocity from last 3 completed sprints
    const completedSprints = await prisma.sprint.findMany({
      where: { projectId, status: 'COMPLETED', deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      take: 3,
      include: {
        issues: {
          where: { deletedAt: null },
          select: { storyPoints: true, status: { select: { name: true } } },
        },
      },
    });

    const velocities = completedSprints.map(sprint => {
      const completed = sprint.issues.filter(i => i.status.name.toLowerCase().includes('done'));
      return completed.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    });

    const avgVelocity = velocities.length > 0
      ? Math.round(velocities.reduce((a, b) => a + b, 0) / velocities.length)
      : 0;

    // Get backlog issues sorted by priority
    const backlog = await prisma.issue.findMany({
      where: { projectId, sprintId: null, deletedAt: null },
      select: {
        id: true,
        key: true,
        summary: true,
        priority: true,
        type: true,
        storyPoints: true,
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    });

    // Suggest issues that fit within velocity
    let remainingCapacity = avgVelocity;
    const suggested: typeof backlog = [];
    const overflow: typeof backlog = [];

    for (const issue of backlog) {
      const points = issue.storyPoints || 1;
      if (remainingCapacity >= points) {
        suggested.push(issue);
        remainingCapacity -= points;
      } else {
        overflow.push(issue);
      }
    }

    return success(res, {
      velocity: { average: avgVelocity, history: velocities },
      suggestedIssues: suggested,
      remainingCapacity,
      overflowIssues: overflow.slice(0, 5),
    });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- AI: Issue Summary ---
export const summarizeIssue = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        comments: { include: { author: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'asc' } },
        activities: { orderBy: { createdAt: 'desc' }, take: 10 },
        assignee: { select: { firstName: true, lastName: true } },
        reporter: { select: { firstName: true, lastName: true } },
        status: { select: { name: true } },
        workLogs: true,
      },
    });

    if (!issue) return error(res, 'Issue not found', 404);

    // Generate summary
    const totalTimeSpent = issue.workLogs.reduce((sum, w) => sum + w.timeSpent, 0);
    const daysSinceCreated = Math.floor((Date.now() - issue.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const statusChanges = issue.activities.filter(a => a.action === 'UPDATE_STATUS').length;

    const summary = {
      key: issue.key,
      summary: issue.summary,
      status: issue.status.name,
      assignee: issue.assignee ? `${issue.assignee.firstName} ${issue.assignee.lastName}` : 'Unassigned',
      reporter: `${issue.reporter.firstName} ${issue.reporter.lastName}`,
      age: `${daysSinceCreated} days`,
      commentCount: issue.comments.length,
      statusChanges,
      timeSpent: `${Math.round(totalTimeSpent / 60)}h ${totalTimeSpent % 60}m`,
      lastComment: issue.comments.length > 0
        ? { author: `${issue.comments[issue.comments.length - 1].author.firstName}`, preview: issue.comments[issue.comments.length - 1].body.replace(/<[^>]*>/g, '').slice(0, 100) }
        : null,
      insights: generateInsights(issue, daysSinceCreated, statusChanges, totalTimeSpent),
    };

    return success(res, summary);
  } catch (e: any) {
    return error(res, e.message);
  }
};

function generateInsights(issue: any, age: number, statusChanges: number, timeSpent: number): string[] {
  const insights: string[] = [];

  if (age > 14 && issue.status.name !== 'Done') {
    insights.push('⚠️ Issue has been open for more than 2 weeks');
  }
  if (statusChanges > 5) {
    insights.push('🔄 Issue has been moved between statuses frequently - may need clarification');
  }
  if (issue.comments.length === 0 && age > 3) {
    insights.push('💬 No comments yet - consider adding context or updates');
  }
  if (issue.priority === 'HIGHEST' && age > 7) {
    insights.push('🔥 High priority issue open for over a week');
  }
  if (timeSpent === 0 && issue.status.name.toLowerCase().includes('progress')) {
    insights.push('⏱️ In progress but no time logged');
  }

  return insights;
}
