import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// List issue templates for a project
export const listTemplates = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const templates = await prisma.issueTemplate.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: templates });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

// Create an issue template
export const createTemplate = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { name, type, summary, description, priority, labels, storyPoints } = req.body;

    if (!name || !type) {
      res.status(400).json({ error: 'name and type are required' });
      return;
    }

    const template = await prisma.issueTemplate.create({
      data: {
        name,
        projectId,
        type,
        summary: summary || null,
        description: description || null,
        priority: priority || null,
        labels: labels ? JSON.stringify(labels) : null,
        storyPoints: storyPoints || null,
      },
    });

    res.status(201).json({ data: template });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create template' });
  }
};

// Update an issue template
export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const { name, type, summary, description, priority, labels, storyPoints } = req.body;

    const template = await prisma.issueTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined && { name }),
        ...(type !== undefined && { type }),
        ...(summary !== undefined && { summary }),
        ...(description !== undefined && { description }),
        ...(priority !== undefined && { priority }),
        ...(labels !== undefined && { labels: labels ? JSON.stringify(labels) : null }),
        ...(storyPoints !== undefined && { storyPoints }),
      },
    });

    res.json({ data: template });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
};

// Delete an issue template
export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    await prisma.issueTemplate.update({ where: { id: templateId }, data: { deletedAt: new Date() } });
    res.json({ message: 'Template deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete template' });
  }
};

// Get a single template (for pre-filling issue creation)
export const getTemplate = async (req: Request, res: Response) => {
  try {
    const { templateId } = req.params;
    const template = await prisma.issueTemplate.findUnique({ where: { id: templateId } });
    if (!template || template.deletedAt) { res.status(404).json({ error: 'Template not found' }); return; }
    res.json({ data: template });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};
