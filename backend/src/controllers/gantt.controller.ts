import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- Dependency Graph Data ---
export const getDependencyGraph = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { sprintId } = req.query;

    const where: any = { projectId, deletedAt: null };
    if (sprintId) where.sprintId = sprintId as string;

    const issues = await prisma.issue.findMany({
      where,
      select: {
        id: true,
        key: true,
        summary: true,
        type: true,
        priority: true,
        statusId: true,
        assigneeId: true,
        dueDate: true,
        storyPoints: true,
        sprintId: true,
        parentId: true,
        status: { select: { name: true } },
        assignee: { select: { firstName: true, lastName: true, avatarUrl: true } },
        outwardLinks: { select: { id: true, linkType: true, targetId: true } },
        inwardLinks: { select: { id: true, linkType: true, sourceId: true } },
      },
    });

    // Build nodes and edges for graph visualization
    const nodes = issues.map(issue => ({
      id: issue.id,
      key: issue.key,
      summary: issue.summary,
      type: issue.type,
      priority: issue.priority,
      status: issue.status.name,
      assignee: issue.assignee,
      dueDate: issue.dueDate,
      storyPoints: issue.storyPoints,
      parentId: issue.parentId,
    }));

    const edges: Array<{ id: string; source: string; target: string; type: string }> = [];
    issues.forEach(issue => {
      issue.outwardLinks.forEach(link => {
        edges.push({ id: link.id, source: issue.id, target: link.targetId, type: link.linkType });
      });
    });

    // Calculate critical path (longest path through blocking dependencies)
    const criticalPath = calculateCriticalPath(nodes, edges);

    return success(res, { nodes, edges, criticalPath });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Gantt Chart Data ---
export const getGanttData = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { sprintId } = req.query;

    const where: any = { projectId, deletedAt: null };
    if (sprintId) where.sprintId = sprintId as string;

    const issues = await prisma.issue.findMany({
      where,
      include: {
        status: { select: { name: true } },
        assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        sprint: { select: { name: true, startDate: true, endDate: true } },
        outwardLinks: { where: { linkType: 'BLOCKS' }, select: { targetId: true } },
        inwardLinks: { where: { linkType: 'BLOCKS' }, select: { sourceId: true } },
      },
      orderBy: [{ sprint: { startDate: 'asc' } }, { createdAt: 'asc' }],
    });

    // Transform to Gantt items
    const ganttItems = issues.map(issue => ({
      id: issue.id,
      key: issue.key,
      summary: issue.summary,
      type: issue.type,
      priority: issue.priority,
      status: issue.status.name,
      assignee: issue.assignee,
      startDate: issue.createdAt,
      endDate: issue.dueDate || (issue.sprint?.endDate) || null,
      storyPoints: issue.storyPoints,
      sprintName: issue.sprint?.name,
      dependencies: issue.inwardLinks.map(l => l.sourceId), // blocked by these
      dependents: issue.outwardLinks.map(l => l.targetId), // blocks these
      progress: issue.status.name.toLowerCase().includes('done') ? 100
        : issue.status.name.toLowerCase().includes('progress') ? 50
        : issue.status.name.toLowerCase().includes('review') ? 75
        : 0,
    }));

    // Sprints as groups
    const sprints = await prisma.sprint.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { startDate: 'asc' },
    });

    return success(res, { items: ganttItems, sprints });
  } catch (e: any) {
    return error(res, e.message);
  }
};

function calculateCriticalPath(
  nodes: Array<{ id: string; storyPoints: number | null }>,
  edges: Array<{ source: string; target: string; type: string }>
): string[] {
  // Filter only blocking edges
  const blockingEdges = edges.filter(e => e.type === 'BLOCKS');
  if (blockingEdges.length === 0) return [];

  // Build adjacency list
  const adj: Record<string, string[]> = {};
  const weights: Record<string, number> = {};
  nodes.forEach(n => {
    adj[n.id] = [];
    weights[n.id] = n.storyPoints || 1;
  });
  blockingEdges.forEach(e => {
    if (adj[e.source]) adj[e.source].push(e.target);
  });

  // Find longest path using DFS with memoization
  const memo: Record<string, { length: number; path: string[] }> = {};

  function dfs(nodeId: string, visited: Set<string>): { length: number; path: string[] } {
    if (memo[nodeId]) return memo[nodeId];
    if (visited.has(nodeId)) return { length: 0, path: [] }; // cycle detection

    visited.add(nodeId);
    let maxLength = 0;
    let maxPath: string[] = [];

    for (const next of (adj[nodeId] || [])) {
      const result = dfs(next, visited);
      if (result.length + weights[next] > maxLength) {
        maxLength = result.length + weights[next];
        maxPath = [next, ...result.path];
      }
    }

    visited.delete(nodeId);
    memo[nodeId] = { length: maxLength, path: maxPath };
    return memo[nodeId];
  }

  // Find the starting node with the longest path
  let longestPath: string[] = [];
  let longestLength = 0;

  for (const node of nodes) {
    const result = dfs(node.id, new Set());
    if (result.length + weights[node.id] > longestLength) {
      longestLength = result.length + weights[node.id];
      longestPath = [node.id, ...result.path];
    }
  }

  return longestPath;
}
