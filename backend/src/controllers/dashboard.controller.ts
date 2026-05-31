import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

export const listDashboards = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { workspaceId, projectId } = req.query;
    const where: any = { userId, deletedAt: null };
    if (workspaceId) where.workspaceId = workspaceId;
    if (projectId) where.projectId = projectId;

    const dashboards = await prisma.dashboard.findMany({
      where,
      include: { widgets: { orderBy: { position: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, dashboards);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createDashboard = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { name, description, projectId, workspaceId, isDefault, layout } = req.body;
    const dashboard = await prisma.dashboard.create({
      data: { name, description, projectId, workspaceId, userId, isDefault, layout: layout ? JSON.stringify(layout) : null },
    });
    return success(res, dashboard, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const dashboard = await prisma.dashboard.findUnique({
      where: { id: dashboardId },
      include: { widgets: { orderBy: { position: 'asc' } } },
    });
    if (!dashboard) return error(res, 'Dashboard not found', 404);
    return success(res, dashboard);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateDashboard = async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const { name, description, isDefault, layout } = req.body;
    const dashboard = await prisma.dashboard.update({
      where: { id: dashboardId },
      data: { name, description, isDefault, layout: layout ? JSON.stringify(layout) : undefined },
    });
    return success(res, dashboard);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteDashboard = async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    await prisma.dashboard.update({ where: { id: dashboardId }, data: { deletedAt: new Date() } });
    return success(res, { message: 'Dashboard deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Widgets ---
export const addWidget = async (req: Request, res: Response) => {
  try {
    const { dashboardId } = req.params;
    const { type, title, config, position, width, height } = req.body;
    const widget = await prisma.dashboardWidget.create({
      data: { dashboardId, type, title, config: JSON.stringify(config), position, width, height },
    });
    return success(res, widget, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateWidget = async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const { type, title, config, position, width, height } = req.body;
    const widget = await prisma.dashboardWidget.update({
      where: { id: widgetId },
      data: { type, title, config: config ? JSON.stringify(config) : undefined, position, width, height },
    });
    return success(res, widget);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteWidget = async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    await prisma.dashboardWidget.delete({ where: { id: widgetId } });
    return success(res, { message: 'Widget deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Widget Data Endpoint ---
export const getWidgetData = async (req: Request, res: Response) => {
  try {
    const { widgetId } = req.params;
    const widget = await prisma.dashboardWidget.findUnique({ where: { id: widgetId }, include: { dashboard: true } });
    if (!widget) return error(res, 'Widget not found', 404);

    const config = JSON.parse(widget.config);
    let data: any = {};

    switch (widget.type) {
      case 'PIE_CHART':
      case 'BAR_CHART': {
        const projectId = config.projectId || widget.dashboard.projectId;
        if (config.groupBy === 'status') {
          const issues = await prisma.issue.findMany({ where: { projectId, deletedAt: null }, include: { status: true } });
          const grouped: Record<string, number> = {};
          issues.forEach(i => { grouped[i.status.name] = (grouped[i.status.name] || 0) + 1; });
          data = Object.entries(grouped).map(([name, count]) => ({ name, count }));
        } else if (config.groupBy === 'priority') {
          const issues = await prisma.issue.groupBy({ by: ['priority'], where: { projectId, deletedAt: null }, _count: true });
          data = issues.map(i => ({ name: i.priority, count: i._count }));
        } else if (config.groupBy === 'type') {
          const issues = await prisma.issue.groupBy({ by: ['type'], where: { projectId, deletedAt: null }, _count: true });
          data = issues.map(i => ({ name: i.type, count: i._count }));
        }
        break;
      }
      case 'STATS': {
        const projectId = config.projectId || widget.dashboard.projectId;
        const total = await prisma.issue.count({ where: { projectId, deletedAt: null } });
        const completed = await prisma.issue.count({ where: { projectId, deletedAt: null, status: { name: 'Done' } } });
        data = { total, completed, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
        break;
      }
      case 'ACTIVITY_STREAM': {
        const projectId = config.projectId || widget.dashboard.projectId;
        data = await prisma.activity.findMany({
          where: { issue: { projectId } },
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } }, issue: { select: { key: true, summary: true } } },
          orderBy: { createdAt: 'desc' },
          take: config.limit || 10,
        });
        break;
      }
      default:
        data = {};
    }

    return success(res, data);
  } catch (e: any) {
    return error(res, e.message);
  }
};
