import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- Wiki Spaces ---
export const listSpaces = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    if (!projectId) {
      return error(res, 'projectId is required', 400);
    }
    const where: any = { deletedAt: null, projectId: projectId as string };

    const spaces = await prisma.wikiSpace.findMany({
      where,
      include: { _count: { select: { pages: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, spaces);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createSpace = async (req: Request, res: Response) => {
  try {
    const { name, description, projectId } = req.body;

    if (!projectId) {
      return error(res, 'projectId is required', 400);
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true }
    });

    if (!project) {
      return error(res, 'Project not found', 404);
    }

    const workspaceId = project.workspaceId;

    const space = await prisma.wikiSpace.create({
      data: { name, description, projectId, workspaceId },
    });
    return success(res, space, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateSpace = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const { name, description } = req.body;
    const space = await prisma.wikiSpace.update({ where: { id: spaceId }, data: { name, description } });
    return success(res, space);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteSpace = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    await prisma.wikiSpace.update({ where: { id: spaceId }, data: { deletedAt: new Date() } });
    return success(res, { message: 'Wiki space deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Wiki Pages ---
export const listPages = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const pages = await prisma.wikiPage.findMany({
      where: { spaceId, deletedAt: null, parentId: null },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
        },
      },
      orderBy: { position: 'asc' },
    });
    return success(res, pages);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createPage = async (req: Request, res: Response) => {
  try {
    const { spaceId } = req.params;
    const userId = (req as any).user.id;
    const { title, content, parentId, position } = req.body;
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);

    const page = await prisma.wikiPage.create({
      data: { title, content, slug, spaceId, parentId, authorId: userId, position: position || 0 },
    });
    return success(res, page, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const getPage = async (req: Request, res: Response) => {
  try {
    const { pageId } = req.params;
    const page = await prisma.wikiPage.findUnique({
      where: { id: pageId },
      include: {
        children: { where: { deletedAt: null }, orderBy: { position: 'asc' } },
        revisions: { orderBy: { version: 'desc' }, take: 10 },
      },
    });
    if (!page) return error(res, 'Page not found', 404);
    return success(res, page);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updatePage = async (req: Request, res: Response) => {
  try {
    const { pageId } = req.params;
    const userId = (req as any).user.id;
    const { title, content, position } = req.body;

    // Save revision before updating
    const current = await prisma.wikiPage.findUnique({ where: { id: pageId } });
    if (current && current.content) {
      const lastRevision = await prisma.wikiRevision.findFirst({
        where: { pageId },
        orderBy: { version: 'desc' },
      });
      await prisma.wikiRevision.create({
        data: {
          pageId,
          content: current.content,
          editedBy: userId,
          version: (lastRevision?.version || 0) + 1,
        },
      });
    }

    const data: any = {};
    if (title) {
      data.title = title;
      data.slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80);
    }
    if (content !== undefined) data.content = content;
    if (position !== undefined) data.position = position;

    const page = await prisma.wikiPage.update({ where: { id: pageId }, data });
    return success(res, page);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deletePage = async (req: Request, res: Response) => {
  try {
    const { pageId } = req.params;
    await prisma.wikiPage.update({ where: { id: pageId }, data: { deletedAt: new Date() } });
    return success(res, { message: 'Page deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const getPageRevisions = async (req: Request, res: Response) => {
  try {
    const { pageId } = req.params;
    const revisions = await prisma.wikiRevision.findMany({
      where: { pageId },
      orderBy: { version: 'desc' },
    });
    return success(res, revisions);
  } catch (e: any) {
    return error(res, e.message);
  }
};
