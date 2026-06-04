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
    if (!name) return error(res, 'name is required', 400);
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
    const { type, title, config, y, position, width, height } = req.body;

    if (!type || !title) {
      return error(res, 'type and title are required', 400);
    }

    const widgetPosition = position ?? y ?? 0;

    const widget = await prisma.dashboardWidget.create({
      data: {
        dashboardId,
        type,
        title,
        config: JSON.stringify(config || {}),
        position: widgetPosition,
        width: width || 1,
        height: height || 1,
      },
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

    let config: any = {};
    try {
      config = JSON.parse(widget.config || '{}');
    } catch {
      config = {};
    }
    let data: any = {};

    switch (widget.type) {
      case 'PIE_CHART':
      case 'BAR_CHART':
      case 'LINE_CHART': {
        const projectId = config.projectId || widget.dashboard.projectId;
        if (config.groupBy === 'status') {
          const issues = await prisma.issue.findMany({ where: { projectId, deletedAt: null }, include: { status: true } });
          const grouped: Record<string, number> = {};
          issues.forEach(i => { grouped[i.status.name] = (grouped[i.status.name] || 0) + 1; });
          data = { labels: Object.keys(grouped), values: Object.values(grouped), items: Object.entries(grouped).map(([name, count]) => ({ name, count })) };
        } else if (config.groupBy === 'priority') {
          const issues = await prisma.issue.groupBy({ by: ['priority'], where: { projectId, deletedAt: null }, _count: true });
          data = { labels: issues.map(i => i.priority), values: issues.map(i => i._count), items: issues.map(i => ({ name: i.priority, count: i._count })) };
        } else if (config.groupBy === 'type') {
          const issues = await prisma.issue.groupBy({ by: ['type'], where: { projectId, deletedAt: null }, _count: true });
          data = { labels: issues.map(i => i.type), values: issues.map(i => i._count), items: issues.map(i => ({ name: i.type, count: i._count })) };
        } else {
          // Default: group by status
          const issues = await prisma.issue.findMany({ where: { projectId, deletedAt: null }, include: { status: true } });
          const grouped: Record<string, number> = {};
          issues.forEach(i => { grouped[i.status.name] = (grouped[i.status.name] || 0) + 1; });
          data = { labels: Object.keys(grouped), values: Object.values(grouped), items: Object.entries(grouped).map(([name, count]) => ({ name, count })) };
        }
        break;
      }
      case 'STATS': {
        const projectId = config.projectId || widget.dashboard.projectId;
        const doneColumns = await prisma.boardColumn.findMany({ where: { name: 'Done' }, select: { id: true } });
        const doneColumnIds = doneColumns.map(c => c.id);
        const total = await prisma.issue.count({ where: { projectId, deletedAt: null } });
        const completed = await prisma.issue.count({ where: { projectId, deletedAt: null, statusId: { in: doneColumnIds } } });
        data = { total, completed, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
        break;
      }
      case 'ACTIVITY_STREAM': {
        const projectId = config.projectId || widget.dashboard.projectId;
        const activities = await prisma.activity.findMany({
          where: { issue: { projectId } },
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } }, issue: { select: { key: true, summary: true } } },
          orderBy: { createdAt: 'desc' },
          take: config.limit || 10,
        });
        data = { items: activities };
        break;
      }
      case 'CALENDAR': {
        const projectId = config.projectId || widget.dashboard.projectId;
        const issues = await prisma.issue.findMany({
          where: { projectId, deletedAt: null, dueDate: { not: null } },
          select: { id: true, key: true, summary: true, dueDate: true, priority: true },
          orderBy: { dueDate: 'asc' },
          take: config.limit || 20,
        });
        data = { items: issues };
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
