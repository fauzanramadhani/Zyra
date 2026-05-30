import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Get burndown chart data for a sprint
export const getBurndownData = async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;

    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } });
    if (!sprint) { res.status(404).json({ error: 'Sprint not found' }); return; }
    if (!sprint.startDate || !sprint.endDate) {
      res.status(400).json({ error: 'Sprint must have start and end dates' });
      return;
    }

    // Get all issues in this sprint
    const issues = await prisma.issue.findMany({
      where: { sprintId, deletedAt: null },
      select: { id: true, storyPoints: true, statusId: true, createdAt: true, updatedAt: true },
    });

    // Get activities for status changes in this sprint's issues
    const issueIds = issues.map((i) => i.id);
    const activities = await prisma.activity.findMany({
      where: {
        issueId: { in: issueIds },
        action: 'UPDATE_STATUS',
        createdAt: { gte: sprint.startDate, lte: sprint.endDate || new Date() },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate total story points
    const totalPoints = issues.reduce((sum, i) => sum + (i.storyPoints || 1), 0);

    // Generate daily data points
    const startDate = new Date(sprint.startDate);
    const endDate = new Date(sprint.endDate || new Date());
    const days: { date: string; ideal: number; actual: number }[] = [];

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const dailyBurn = totalPoints / Math.max(totalDays, 1);

    // Get board columns to identify "done" columns (last column)
    const project = await prisma.project.findFirst({
      where: { sprints: { some: { id: sprintId } } },
      include: { boards: { include: { columns: { orderBy: { position: 'asc' } } } } },
    });

    const doneColumnIds = new Set<string>();
    if (project?.boards) {
      for (const board of project.boards) {
        const lastCol = board.columns[board.columns.length - 1];
        if (lastCol) doneColumnIds.add(lastCol.id);
      }
    }

    // Track completed points per day
    let remainingPoints = totalPoints;
    const completedByDay = new Map<string, number>();

    for (const activity of activities) {
      try {
        const details = JSON.parse(activity.details);
        if (details.newStatusId && doneColumnIds.has(details.newStatusId)) {
          const issue = issues.find((i) => i.id === activity.issueId);
          const points = issue?.storyPoints || 1;
          const dayKey = activity.createdAt.toISOString().split('T')[0];
          completedByDay.set(dayKey, (completedByDay.get(dayKey) || 0) + points);
        }
      } catch {}
    }

    // Build chart data
    for (let d = 0; d <= totalDays; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + d);
      const dateStr = currentDate.toISOString().split('T')[0];

      const ideal = Math.max(0, totalPoints - dailyBurn * d);
      const completedToday = completedByDay.get(dateStr) || 0;
      remainingPoints -= completedToday;

      days.push({
        date: dateStr,
        ideal: Math.round(ideal * 10) / 10,
        actual: Math.max(0, Math.round(remainingPoints * 10) / 10),
      });
    }

    res.json({
      data: {
        sprint: { id: sprint.id, name: sprint.name, startDate: sprint.startDate, endDate: sprint.endDate },
        totalPoints,
        totalIssues: issues.length,
        chartData: days,
      },
    });
  } catch (err) {
    console.error('Burndown error:', err);
    res.status(500).json({ error: 'Failed to generate burndown data' });
  }
};

// Get velocity chart data (story points completed per sprint)
export const getVelocityData = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const sprints = await prisma.sprint.findMany({
      where: { projectId, status: 'COMPLETED', deletedAt: null },
      orderBy: { endDate: 'desc' },
      take: limit,
    });

    // Get board columns to identify "done" columns
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { boards: { include: { columns: { orderBy: { position: 'asc' } } } } },
    });

    const doneColumnIds = new Set<string>();
    if (project?.boards) {
      for (const board of project.boards) {
        const lastCol = board.columns[board.columns.length - 1];
        if (lastCol) doneColumnIds.add(lastCol.id);
      }
    }

    const velocityData = await Promise.all(
      sprints.reverse().map(async (sprint) => {
        const issues = await prisma.issue.findMany({
          where: { sprintId: sprint.id, deletedAt: null },
          select: { storyPoints: true, statusId: true },
        });

        const totalCommitted = issues.reduce((sum, i) => sum + (i.storyPoints || 1), 0);
        const totalCompleted = issues
          .filter((i) => doneColumnIds.has(i.statusId))
          .reduce((sum, i) => sum + (i.storyPoints || 1), 0);

        return {
          sprintId: sprint.id,
          sprintName: sprint.name,
          startDate: sprint.startDate,
          endDate: sprint.endDate,
          committed: totalCommitted,
          completed: totalCompleted,
          issueCount: issues.length,
        };
      })
    );

    // Calculate average velocity
    const avgVelocity =
      velocityData.length > 0
        ? Math.round((velocityData.reduce((sum, v) => sum + v.completed, 0) / velocityData.length) * 10) / 10
        : 0;

    res.json({
      data: {
        sprints: velocityData,
        averageVelocity: avgVelocity,
      },
    });
  } catch (err) {
    console.error('Velocity error:', err);
    res.status(500).json({ error: 'Failed to generate velocity data' });
  }
};
