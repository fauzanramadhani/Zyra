import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Bulk update issues (status, assignee, sprint, priority)
export const bulkUpdateIssues = async (req: Request, res: Response) => {
  try {
    const { issueIds, updates } = req.body;

    if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
      res.status(400).json({ error: 'issueIds array is required' });
      return;
    }
    if (!updates || Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'updates object is required' });
      return;
    }

    // Allowed fields for bulk update
    const allowedFields = ['statusId', 'assigneeId', 'sprintId', 'priority', 'type', 'epicId'];
    const updateData: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: 'No valid fields to update' });
      return;
    }

    const result = await prisma.issue.updateMany({
      where: { id: { in: issueIds }, deletedAt: null },
      data: updateData,
    });

    res.json({ data: { updatedCount: result.count } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk update issues' });
  }
};

// Bulk move issues to sprint
export const bulkMoveToSprint = async (req: Request, res: Response) => {
  try {
    const { issueIds, sprintId } = req.body;

    if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
      res.status(400).json({ error: 'issueIds array is required' });
      return;
    }

    const result = await prisma.issue.updateMany({
      where: { id: { in: issueIds }, deletedAt: null },
      data: { sprintId: sprintId || null },
    });

    res.json({ data: { updatedCount: result.count } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk move issues' });
  }
};

// Bulk delete issues (soft delete)
export const bulkDeleteIssues = async (req: Request, res: Response) => {
  try {
    const { issueIds } = req.body;

    if (!issueIds || !Array.isArray(issueIds) || issueIds.length === 0) {
      res.status(400).json({ error: 'issueIds array is required' });
      return;
    }

    const result = await prisma.issue.updateMany({
      where: { id: { in: issueIds }, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    res.json({ data: { deletedCount: result.count } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk delete issues' });
  }
};

// Bulk add labels
export const bulkAddLabels = async (req: Request, res: Response) => {
  try {
    const { issueIds, labelIds } = req.body;

    if (!issueIds || !Array.isArray(issueIds) || !labelIds || !Array.isArray(labelIds)) {
      res.status(400).json({ error: 'issueIds and labelIds arrays are required' });
      return;
    }

    const data: { issueId: string; labelId: string }[] = [];
    for (const issueId of issueIds) {
      for (const labelId of labelIds) {
        data.push({ issueId, labelId });
      }
    }

    await prisma.issueLabel.createMany({ data, skipDuplicates: true });
    res.json({ message: 'Labels added to issues' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to bulk add labels' });
  }
};
