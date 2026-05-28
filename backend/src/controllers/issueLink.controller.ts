import { Response } from 'express';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { emitToProject } from '../services/websocket.service';

// Valid link types and their inverse
const LINK_TYPE_INVERSE: Record<string, string> = {
  BLOCKS: 'IS_BLOCKED_BY',
  IS_BLOCKED_BY: 'BLOCKS',
  RELATES_TO: 'RELATES_TO',
  DUPLICATES: 'IS_DUPLICATED_BY',
  IS_DUPLICATED_BY: 'DUPLICATES',
};

const VALID_LINK_TYPES = Object.keys(LINK_TYPE_INVERSE);

/**
 * GET /issues/:issueId/links
 * Returns all links for an issue (both outward and inward), normalized.
 */
export async function getIssueLinks(req: AuthenticatedRequest, res: Response) {
  const { issueId } = req.params;

  try {
    const issue = await prisma.issue.findUnique({ where: { id: issueId }, select: { id: true } });
    if (!issue) return sendError(res, 404, 'Issue not found');

    const [outward, inward] = await Promise.all([
      prisma.issueLink.findMany({
        where: { sourceId: issueId },
        include: {
          target: {
            select: { id: true, key: true, summary: true, type: true, priority: true, statusId: true, status: { select: { name: true } } },
          },
        },
      }),
      prisma.issueLink.findMany({
        where: { targetId: issueId },
        include: {
          source: {
            select: { id: true, key: true, summary: true, type: true, priority: true, statusId: true, status: { select: { name: true } } },
          },
        },
      }),
    ]);

    // Normalize: each link shows the "other" issue and the relationship from this issue's perspective
    const links = [
      ...outward.map((l) => ({
        id: l.id,
        linkType: l.linkType,
        issue: l.target,
        direction: 'outward' as const,
      })),
      ...inward.map((l) => ({
        id: l.id,
        linkType: LINK_TYPE_INVERSE[l.linkType] || l.linkType,
        issue: l.source,
        direction: 'inward' as const,
      })),
    ];

    return sendSuccess(res, 'Issue links loaded', links);
  } catch (error: any) {
    console.error('Get issue links error:', error);
    return sendError(res, 500, 'Failed to load issue links');
  }
}

/**
 * POST /issues/:issueId/links
 * Body: { linkType, targetIssueId }
 * Creates a link from this issue to the target.
 */
export async function createIssueLink(req: AuthenticatedRequest, res: Response) {
  const { issueId } = req.params;
  const { linkType, targetIssueId } = req.body;

  if (!linkType || !targetIssueId) {
    return sendError(res, 400, 'linkType and targetIssueId are required');
  }

  if (!VALID_LINK_TYPES.includes(linkType)) {
    return sendError(res, 400, `Invalid linkType. Must be one of: ${VALID_LINK_TYPES.join(', ')}`);
  }

  if (issueId === targetIssueId) {
    return sendError(res, 400, 'Cannot link an issue to itself');
  }

  try {
    const [source, target] = await Promise.all([
      prisma.issue.findUnique({ where: { id: issueId }, select: { id: true, projectId: true } }),
      prisma.issue.findUnique({ where: { id: targetIssueId }, select: { id: true, projectId: true } }),
    ]);

    if (!source) return sendError(res, 404, 'Source issue not found');
    if (!target) return sendError(res, 404, 'Target issue not found');

    // Check for existing link (either direction)
    const existing = await prisma.issueLink.findFirst({
      where: {
        OR: [
          { sourceId: issueId, targetId: targetIssueId },
          { sourceId: targetIssueId, targetId: issueId },
        ],
      },
    });

    if (existing) {
      return sendError(res, 409, 'A link between these issues already exists');
    }

    const link = await prisma.issueLink.create({
      data: {
        linkType,
        sourceId: issueId,
        targetId: targetIssueId,
      },
      include: {
        target: {
          select: { id: true, key: true, summary: true, type: true, priority: true, statusId: true, status: { select: { name: true } } },
        },
        source: {
          select: { id: true, key: true, summary: true, type: true, priority: true, statusId: true, status: { select: { name: true } } },
        },
      },
    });

    // Emit to project so board cards can update blocked indicators
    emitToProject(source.projectId, 'issueLink:created', {
      id: link.id,
      linkType: link.linkType,
      sourceId: link.sourceId,
      targetId: link.targetId,
      source: link.source,
      target: link.target,
    });

    return sendCreated(res, 'Issue link created', {
      id: link.id,
      linkType: link.linkType,
      issue: link.target,
      direction: 'outward',
    });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return sendError(res, 409, 'This link already exists');
    }
    console.error('Create issue link error:', error);
    return sendError(res, 500, 'Failed to create issue link');
  }
}

/**
 * DELETE /issues/:issueId/links/:linkId
 */
export async function deleteIssueLink(req: AuthenticatedRequest, res: Response) {
  const { issueId, linkId } = req.params;

  try {
    const link = await prisma.issueLink.findUnique({
      where: { id: linkId },
      include: {
        source: { select: { projectId: true } },
      },
    });

    if (!link) return sendError(res, 404, 'Link not found');

    // Verify the link belongs to this issue (either direction)
    if (link.sourceId !== issueId && link.targetId !== issueId) {
      return sendError(res, 403, 'Link does not belong to this issue');
    }

    await prisma.issueLink.delete({ where: { id: linkId } });

    emitToProject(link.source.projectId, 'issueLink:deleted', {
      id: linkId,
      sourceId: link.sourceId,
      targetId: link.targetId,
      linkType: link.linkType,
    });

    return sendSuccess(res, 'Issue link deleted');
  } catch (error: any) {
    console.error('Delete issue link error:', error);
    return sendError(res, 500, 'Failed to delete issue link');
  }
}
