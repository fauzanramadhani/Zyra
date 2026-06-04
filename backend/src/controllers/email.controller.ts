import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- Email Inboxes ---
export const listInboxes = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const inboxes = await prisma.emailInbox.findMany({
      where: { projectId, deletedAt: null },
      include: { _count: { select: { emails: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, inboxes);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createInbox = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { emailAddress, defaultType, defaultPriority, assigneeId } = req.body;
    if (!emailAddress || !defaultType) {
      return error(res, 'emailAddress and defaultType are required', 400);
    }

    // Cek semua record dengan email ini (termasuk soft-deleted)
    const existing = await prisma.emailInbox.findFirst({
      where: { emailAddress },
    });

    if (existing) {
      if (existing.deletedAt) {
        // Record sudah soft-deleted — hapus permanen dulu biar unique constraint tidak conflict
        await prisma.emailInbox.delete({ where: { id: existing.id } });
      } else {
        return error(res, `Email address "${emailAddress}" is already in use by another gateway.`, 409);
      }
    }

    const inbox = await prisma.emailInbox.create({
      data: { projectId, emailAddress, defaultType, defaultPriority, assigneeId },
    });
    return success(res, inbox, 201);
  } catch (e: any) {
    // Prisma unique constraint violation (safety net)
    if (e.code === 'P2002' || (e.message && e.message.includes('Unique constraint'))) {
      return error(res, 'Webhook URL / email address is already in use.', 409);
    }
    return error(res, e.message);
  }
};

export const updateInbox = async (req: Request, res: Response) => {
  try {
    const { inboxId } = req.params;
    const data = req.body;
    const inbox = await prisma.emailInbox.update({ where: { id: inboxId }, data });
    return success(res, inbox);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteInbox = async (req: Request, res: Response) => {
  try {
    const { inboxId } = req.params;
    await prisma.emailInbox.update({ where: { id: inboxId }, data: { deletedAt: new Date() } });
    return success(res, { message: 'Inbox deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Process Incoming Email (webhook from mail service) ---
export const processIncomingEmail = async (req: Request, res: Response) => {
  try {
    const { inboxId } = req.params;
    const { fromEmail, fromName, subject, body } = req.body;

    const inbox = await prisma.emailInbox.findUnique({ where: { id: inboxId } });
    if (!inbox || !inbox.enabled) return error(res, 'Inbox not found or disabled', 404);

    const email = await prisma.incomingEmail.create({
      data: { inboxId, fromEmail, fromName, subject, body },
    });

    // Create issue from email
    const project = await prisma.project.findUnique({
      where: { id: inbox.projectId },
      include: { boards: { include: { columns: { orderBy: { position: 'asc' } } } } },
    });
    if (!project) return error(res, 'Project not found', 404);

    const todoCol = project.boards[0]?.columns[0];
    if (!todoCol) return error(res, 'No board column', 400);

    const lastIssue = await prisma.issue.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: 'desc' } });
    const nextNum = lastIssue ? parseInt(lastIssue.key.split('-')[1]) + 1 : 1;
    const key = `${project.key}-${nextNum}`;

    const issue = await prisma.issue.create({
      data: {
        key,
        summary: subject || 'Email Issue',
        description: `<p><strong>From:</strong> ${fromName || fromEmail}</p><hr/>${body}`,
        type: inbox.defaultType,
        priority: inbox.defaultPriority,
        statusId: todoCol.id,
        projectId: project.id,
        reporterId: project.leadId,
        assigneeId: inbox.assigneeId,
      },
    });

    await prisma.incomingEmail.update({
      where: { id: email.id },
      data: { issueId: issue.id, processedAt: new Date(), status: 'PROCESSED' },
    });

    return success(res, { email, issue: { key: issue.key, id: issue.id } }, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- List Emails ---
export const listEmails = async (req: Request, res: Response) => {
  try {
    const { inboxId } = req.params;
    const { status } = req.query;
    const where: any = { inboxId };
    if (status) where.status = status;

    const emails = await prisma.incomingEmail.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return success(res, emails);
  } catch (e: any) {
    return error(res, e.message);
  }
};
