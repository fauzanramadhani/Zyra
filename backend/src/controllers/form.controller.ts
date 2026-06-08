import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- Public Forms ---
export const listForms = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const forms = await prisma.publicForm.findMany({
      where: { projectId, deletedAt: null },
      include: { _count: { select: { submissions: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, forms.map(f => ({
      ...f,
      fields: (() => { try { return JSON.parse(f.fields || '[]'); } catch { return []; } })()
    })));
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createForm = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { title, description, fields, slug, defaultType, defaultPriority, notifyUsers } = req.body;
    const form = await prisma.publicForm.create({
      data: {
        projectId,
        title,
        description,
        fields: JSON.stringify(fields),
        slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        defaultType,
        defaultPriority,
        notifyUsers: notifyUsers ? JSON.stringify(notifyUsers) : null,
      },
    });
    return success(res, form, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateForm = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const { title, description, fields, enabled, defaultType, defaultPriority, notifyUsers } = req.body;
    const data: any = {};
    if (title) data.title = title;
    if (description !== undefined) data.description = description;
    if (fields) data.fields = JSON.stringify(fields);
    if (enabled !== undefined) data.enabled = enabled;
    if (defaultType) data.defaultType = defaultType;
    if (defaultPriority) data.defaultPriority = defaultPriority;
    if (notifyUsers) data.notifyUsers = JSON.stringify(notifyUsers);

    const form = await prisma.publicForm.update({ where: { id: formId }, data });
    return success(res, form);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteForm = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    await prisma.publicForm.update({ where: { id: formId }, data: { deletedAt: new Date() } });
    return success(res, { message: 'Form deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

import { IssueService } from '../services/issue.service';

// --- Public Submission (No Auth Required) ---
export const submitForm = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const form = await prisma.publicForm.findUnique({ where: { slug } });
    if (!form || !form.enabled) return error(res, 'Form not found or disabled', 404);

    const { data: formData } = req.body;
    const ipAddress = req.ip;

    // Create the issue from submission
    const project = await prisma.project.findUnique({
      where: { id: form.projectId },
      include: { boards: { include: { columns: { orderBy: { position: 'asc' } } } } },
    });
    if (!project) return error(res, 'Project not found', 404);

    const todoCol = project.boards[0]?.columns[0];
    if (!todoCol) return error(res, 'No board column', 400);

    const issue = await IssueService.createIssue({
      projectId: project.id,
      summary: formData.summary || formData.title || 'Form Submission',
      type: form.defaultType,
      statusId: todoCol.id,
      description: formData.description || JSON.stringify(formData),
      priority: form.defaultPriority,
      reporterId: project.leadId,
    });

    const submission = await prisma.formSubmission.create({
      data: {
        formId: form.id,
        data: JSON.stringify(formData),
        issueId: issue.id,
        ipAddress,
      },
    });

    // Notify configured users
    if (form.notifyUsers) {
      const userIds = (() => { try { return JSON.parse(form.notifyUsers || '[]'); } catch { return []; } })();
      for (const userId of userIds) {
        await prisma.notification.create({
          data: {
            userId,
            title: 'New Form Submission',
            message: `New submission on "${form.title}": ${issue.key}`,
            type: 'SYSTEM',
            link: `/issues/${issue.id}`,
          },
        });
      }
    }

    return success(res, { submission, issue: { key: issue.key } }, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const listSubmissions = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const submissions = await prisma.formSubmission.findMany({
      where: { formId },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, submissions.map(s => ({
      ...s,
      data: (() => { try { return JSON.parse(s.data || '{}'); } catch { return {}; } })()
    })));
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Get Form by Slug (Public) ---
export const getFormBySlug = async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const form = await prisma.publicForm.findUnique({ where: { slug } });
    if (!form || !form.enabled) return error(res, 'Form not found', 404);
    return success(res, {
      ...form,
      fields: (() => { try { return JSON.parse(form.fields || '[]'); } catch { return []; } })()
    });
  } catch (e: any) {
    return error(res, e.message);
  }
};
