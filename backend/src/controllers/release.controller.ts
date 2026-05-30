import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List releases for a project
export const listReleases = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const releases = await prisma.release.findMany({
      where: { projectId, deletedAt: null },
      include: { issues: true },
      orderBy: { createdAt: 'desc' },
    });

    // Enrich with issue counts
    const enriched = await Promise.all(
      releases.map(async (r) => {
        const issueIds = r.issues.map((ri) => ri.issueId);
        const issues = issueIds.length > 0
          ? await prisma.issue.findMany({
              where: { id: { in: issueIds }, deletedAt: null },
              select: { id: true, key: true, summary: true, priority: true, type: true, statusId: true },
            })
          : [];
        return { ...r, issueCount: issues.length, issueDetails: issues };
      })
    );

    res.json({ data: enriched });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
};

// Create a release
export const createRelease = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, description, releaseDate } = req.body;

    if (!name) { res.status(400).json({ error: 'name is required' }); return; }

    const release = await prisma.release.create({
      data: {
        name,
        description: description || null,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
        projectId,
      },
    });

    res.status(201).json({ data: release });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create release' });
  }
};

// Update a release
export const updateRelease = async (req: Request, res: Response) => {
  try {
    const { releaseId } = req.params;
    const { name, description, status, releaseDate } = req.body;

    const release = await prisma.release.update({
      where: { id: releaseId },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(releaseDate !== undefined && { releaseDate: releaseDate ? new Date(releaseDate) : null }),
      },
    });

    res.json({ data: release });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update release' });
  }
};

// Delete a release
export const deleteRelease = async (req: Request, res: Response) => {
  try {
    const { releaseId } = req.params;
    await prisma.release.update({ where: { id: releaseId }, data: { deletedAt: new Date() } });
    res.json({ message: 'Release deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete release' });
  }
};

// Add issues to a release
export const addIssuesToRelease = async (req: Request, res: Response) => {
  try {
    const { releaseId } = req.params;
    const { issueIds } = req.body;

    if (!issueIds || !Array.isArray(issueIds)) {
      res.status(400).json({ error: 'issueIds array is required' });
      return;
    }

    const data = issueIds.map((issueId: string) => ({ releaseId, issueId }));
    await prisma.releaseIssue.createMany({ data, skipDuplicates: true });

    res.json({ message: 'Issues added to release' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add issues to release' });
  }
};

// Remove issue from a release
export const removeIssueFromRelease = async (req: Request, res: Response) => {
  try {
    const { releaseId, issueId } = req.params;
    await prisma.releaseIssue.deleteMany({ where: { releaseId, issueId } });
    res.json({ message: 'Issue removed from release' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove issue from release' });
  }
};
