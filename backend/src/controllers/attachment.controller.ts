import { Response } from 'express';
import * as fs from 'fs';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { emitToProject } from '../services/websocket.service';

export async function addAttachment(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { issueId } = req.params;
  const file = req.file;

  if (!file) {
    return sendError(res, 400, 'No file was uploaded');
  }

  try {
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) {
      // Remove orphaned file from disk
      fs.unlinkSync(file.path);
      return sendError(res, 404, 'Issue not found');
    }

    const fileUrl = `/uploads/${file.filename}`;

    const attachment = await prisma.attachment.create({
      data: {
        issueId,
        filename: file.originalname,
        fileUrl,
        mimeType: file.mimetype,
        size: file.size,
        uploadedById: userId!,
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    // Write Activity Log
    await prisma.activity.create({
      data: {
        issueId,
        userId: userId!,
        action: 'ADD_ATTACHMENT',
        details: JSON.stringify({ filename: attachment.filename, size: attachment.size }),
      },
    });

    emitToProject(issue.projectId, 'attachment:added', { issueId, attachment });

    return sendCreated(res, 'Attachment uploaded successfully', attachment);
  } catch (error: any) {
    console.error('Add attachment error:', error);
    // Attempt clean up of file on failure
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return sendError(res, 500, 'Failed to save attachment metadata');
  }
}

export async function deleteAttachment(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { attachmentId } = req.params;

  try {
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) return sendError(res, 404, 'Attachment not found');

    const issue = await prisma.issue.findUnique({ where: { id: attachment.issueId } });

    // Verify file exists and remove it
    const uploadDir = process.env.UPLOAD_DIR || '../../uploads';
    const filename = attachment.fileUrl.replace('/uploads/', '');
    const fsPath = `${uploadDir}/${filename}`;

    if (fs.existsSync(fsPath)) {
      fs.unlinkSync(fsPath);
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });

    // Write Activity Log
    await prisma.activity.create({
      data: {
        issueId: attachment.issueId,
        userId: userId!,
        action: 'DELETE_ATTACHMENT',
        details: JSON.stringify({ filename: attachment.filename }),
      },
    });

    emitToProject(issue!.projectId, 'attachment:deleted', { issueId: attachment.issueId, attachmentId });

    return sendSuccess(res, 'Attachment removed successfully');
  } catch (error: any) {
    console.error('Delete attachment error:', error);
    return sendError(res, 500, 'Failed to delete attachment');
  }
}
