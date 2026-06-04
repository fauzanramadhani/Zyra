import prisma from '../db';

export const recalculateGoalProgress = async (goalId: string, tx?: any) => {
  const db = tx || prisma;
  const goal = await db.goal.findUnique({
    where: { id: goalId, deletedAt: null },
    include: { linkedItems: true }
  });

  if (!goal) return;

  let newProgress = goal.progress;

  if (goal.type === 'OBJECTIVE') {
    // Objectives aggregate child Key Results
    const children = await db.goal.findMany({
      where: { parentId: goalId, type: 'KEY_RESULT', deletedAt: null }
    });

    if (children.length === 0) {
      newProgress = 0;
    } else {
      const totalProgressSum = children.reduce((sum: number, child: any) => sum + child.progress, 0);
      newProgress = Math.round(totalProgressSum / children.length);
    }
  } else if (goal.type === 'KEY_RESULT') {
    if (goal.trackingMethod === 'AUTOMATIC') {
      const links = goal.linkedItems;
      if (links.length === 0) {
        newProgress = 0;
      } else {
        let totalProgressSum = 0;
        for (const link of links) {
          if (link.entityType === 'PROJECT') {
            const total = await db.issue.count({ where: { projectId: link.entityId, deletedAt: null } });
            const done = await db.issue.count({
              where: {
                projectId: link.entityId,
                status: { name: { equals: 'Done', mode: 'insensitive' } },
                deletedAt: null
              }
            });
            totalProgressSum += total > 0 ? (done / total) * 100 : 0;
          } else if (link.entityType === 'EPIC') {
            const total = await db.issue.count({
              where: {
                OR: [
                  { epicId: link.entityId },
                  { parentId: link.entityId }
                ],
                deletedAt: null
              }
            });
            if (total === 0) {
              const epicIssue = await db.issue.findUnique({
                where: { id: link.entityId },
                include: { status: true }
              });
              const isEpicDone = epicIssue?.status?.name?.toLowerCase() === 'done';
              totalProgressSum += isEpicDone ? 100 : 0;
            } else {
              const done = await db.issue.count({
                where: {
                  OR: [
                    { epicId: link.entityId },
                    { parentId: link.entityId }
                  ],
                  status: { name: { equals: 'Done', mode: 'insensitive' } },
                  deletedAt: null
                }
              });
              totalProgressSum += (done / total) * 100;
            }
          }
        }
        newProgress = Math.round(totalProgressSum / links.length);
      }
    }
  }

  newProgress = Math.min(100, Math.max(0, newProgress));

  if (goal.progress !== newProgress) {
    const oldValue = goal.progress;
    await db.goal.update({
      where: { id: goalId },
      data: { progress: newProgress }
    });

    // Create history log
    await db.goalProgressHistory.create({
      data: {
        goalId,
        changedById: goal.ownerId,
        oldValue: oldValue,
        newValue: newProgress,
        progress: newProgress,
        note: `System auto-update (progress: ${oldValue}% -> ${newProgress}%).`,
      }
    });
  }

  // Recalculate parent goal recursively if this is a Key Result and has a parent
  if (goal.type === 'KEY_RESULT' && goal.parentId) {
    await recalculateGoalProgress(goal.parentId, db);
  }
};

export const syncGoalProgressOnIssueChange = async (issueId: string, projectId: string, epicId?: string | null, parentId?: string | null) => {
  try {
    const whereConditions: any[] = [
      { entityType: 'PROJECT', entityId: projectId }
    ];
    if (epicId) {
      whereConditions.push({ entityType: 'EPIC', entityId: epicId });
    }
    if (parentId) {
      whereConditions.push({ entityType: 'EPIC', entityId: parentId });
    }
    // Also include the issue itself in case it is an Epic directly linked to a Key Result
    whereConditions.push({ entityType: 'EPIC', entityId: issueId });

    const links = await prisma.goalLink.findMany({
      where: {
        OR: whereConditions
      },
      select: { goalId: true }
    });

    const uniqueGoalIds = Array.from(new Set(links.map(l => l.goalId)));

    for (const goalId of uniqueGoalIds) {
      await recalculateGoalProgress(goalId);
    }
  } catch (err) {
    console.error('Error syncing goal progress on issue change:', err);
  }
};

