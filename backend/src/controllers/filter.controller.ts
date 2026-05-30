import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List saved filters for a project
export const listFilters = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.id;

    const filters = await prisma.savedFilter.findMany({
      where: { projectId, userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: filters });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch filters' });
  }
};

// Create a saved filter
export const createFilter = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = (req as any).user.id;
    const { name, filters, isDefault } = req.body;

    if (!name || !filters) {
      res.status(400).json({ error: 'name and filters are required' });
      return;
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.savedFilter.updateMany({
        where: { projectId, userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const filter = await prisma.savedFilter.create({
      data: {
        name,
        projectId,
        userId,
        filters: JSON.stringify(filters),
        isDefault: isDefault || false,
      },
    });

    res.status(201).json({ data: filter });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create filter' });
  }
};

// Update a saved filter
export const updateFilter = async (req: Request, res: Response) => {
  try {
    const { filterId } = req.params;
    const userId = (req as any).user.id;
    const { name, filters, isDefault } = req.body;

    const existing = await prisma.savedFilter.findUnique({ where: { id: filterId } });
    if (!existing) { res.status(404).json({ error: 'Filter not found' }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: 'Not authorized' }); return; }

    if (isDefault) {
      await prisma.savedFilter.updateMany({
        where: { projectId: existing.projectId, userId, isDefault: true, id: { not: filterId } },
        data: { isDefault: false },
      });
    }

    const filter = await prisma.savedFilter.update({
      where: { id: filterId },
      data: {
        ...(name !== undefined && { name }),
        ...(filters !== undefined && { filters: JSON.stringify(filters) }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    res.json({ data: filter });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update filter' });
  }
};

// Delete a saved filter
export const deleteFilter = async (req: Request, res: Response) => {
  try {
    const { filterId } = req.params;
    const userId = (req as any).user.id;

    const existing = await prisma.savedFilter.findUnique({ where: { id: filterId } });
    if (!existing) { res.status(404).json({ error: 'Filter not found' }); return; }
    if (existing.userId !== userId) { res.status(403).json({ error: 'Not authorized' }); return; }

    await prisma.savedFilter.delete({ where: { id: filterId } });
    res.json({ message: 'Filter deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete filter' });
  }
};
