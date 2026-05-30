import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Create estimation session for a sprint
export const createSession = async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;
    const session = await prisma.estimationSession.create({
      data: { sprintId, status: 'ACTIVE' },
    });
    res.status(201).json({ data: session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create estimation session' });
  }
};

// Get active session for a sprint
export const getActiveSession = async (req: Request, res: Response) => {
  try {
    const { sprintId } = req.params;
    const session = await prisma.estimationSession.findFirst({
      where: { sprintId, status: 'ACTIVE' },
      include: {
        votes: {
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    });
    res.json({ data: session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch session' });
  }
};

// Set current issue being estimated
export const setCurrentIssue = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { issueId } = req.body;

    const session = await prisma.estimationSession.update({
      where: { id: sessionId },
      data: { currentIssueId: issueId },
    });

    // Clear previous votes for this issue in this session
    await prisma.estimationVote.deleteMany({
      where: { sessionId, issueId },
    });

    res.json({ data: session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to set current issue' });
  }
};

// Submit a vote
export const submitVote = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user.id;
    const { issueId, value } = req.body;

    if (!issueId) { res.status(400).json({ error: 'issueId is required' }); return; }

    const vote = await prisma.estimationVote.upsert({
      where: { sessionId_issueId_userId: { sessionId, issueId, userId } },
      update: { value },
      create: { sessionId, issueId, userId, value },
    });

    res.json({ data: vote });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit vote' });
  }
};

// Reveal votes for current issue
export const revealVotes = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { issueId } = req.body;

    const votes = await prisma.estimationVote.findMany({
      where: { sessionId, issueId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });

    const values = votes.filter((v) => v.value !== null).map((v) => v.value!);
    const average = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    const consensus = values.length > 0 && new Set(values).size === 1;

    res.json({
      data: {
        votes,
        average: Math.round(average * 10) / 10,
        consensus,
        participantCount: votes.length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reveal votes' });
  }
};

// Accept estimation and update issue story points
export const acceptEstimation = async (req: Request, res: Response) => {
  try {
    const { issueId, storyPoints } = req.body;

    await prisma.issue.update({
      where: { id: issueId },
      data: { storyPoints },
    });

    res.json({ message: 'Estimation accepted', storyPoints });
  } catch (err) {
    res.status(500).json({ error: 'Failed to accept estimation' });
  }
};

// Complete session
export const completeSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const session = await prisma.estimationSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED' },
    });
    res.json({ data: session });
  } catch (err) {
    res.status(500).json({ error: 'Failed to complete session' });
  }
};
