import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- Git Integration CRUD ---
export const listIntegrations = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const integrations = await prisma.gitIntegration.findMany({
      where: { projectId },
      include: { _count: { select: { commits: true, branches: true, pullRequests: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, integrations);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createIntegration = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const { provider, repoUrl, repoName, accessToken, webhookSecret } = req.body;
    const integration = await prisma.gitIntegration.create({
      data: { projectId, provider, repoUrl, repoName, accessToken, webhookSecret },
    });
    return success(res, integration, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateIntegration = async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const data = req.body;
    const integration = await prisma.gitIntegration.update({
      where: { id: integrationId },
      data,
    });
    return success(res, integration);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteIntegration = async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    await prisma.gitIntegration.delete({ where: { id: integrationId } });
    return success(res, { message: 'Integration deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Git Commits ---
export const listCommits = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const commits = await prisma.gitCommit.findMany({
      where: { issueId },
      orderBy: { committedAt: 'desc' },
    });
    return success(res, commits);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const linkCommit = async (req: Request, res: Response) => {
  try {
    const { integrationId, sha, message, authorName, authorEmail, committedAt, url, issueId } = req.body;
    const commit = await prisma.gitCommit.create({
      data: { integrationId, sha, message, authorName, authorEmail, committedAt: new Date(committedAt), url, issueId },
    });
    return success(res, commit, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Git Branches ---
export const listBranches = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const branches = await prisma.gitBranch.findMany({
      where: { issueId },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, branches);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const linkBranch = async (req: Request, res: Response) => {
  try {
    const { integrationId, name, url, issueId } = req.body;
    const branch = await prisma.gitBranch.create({
      data: { integrationId, name, url, issueId },
    });
    return success(res, branch, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Git Pull Requests ---
export const listPullRequests = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const prs = await prisma.gitPullRequest.findMany({
      where: { issueId },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, prs);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const linkPullRequest = async (req: Request, res: Response) => {
  try {
    const { integrationId, prNumber, title, status, authorName, url, sourceBranch, targetBranch, issueId } = req.body;
    const pr = await prisma.gitPullRequest.create({
      data: { integrationId, prNumber, title, status, authorName, url, sourceBranch, targetBranch, issueId },
    });
    return success(res, pr, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Webhook Handler (GitHub/GitLab) ---
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const payload = req.body;
    const integration = await prisma.gitIntegration.findUnique({ where: { id: integrationId } });
    if (!integration) return error(res, 'Integration not found', 404);

    // Parse issue key from commit messages or branch names
    const issueKeyRegex = /([A-Z]+-\d+)/g;

    if (payload.commits) {
      for (const commit of payload.commits) {
        const matches = commit.message.match(issueKeyRegex);
        let issueId: string | undefined;
        if (matches) {
          const issue = await prisma.issue.findUnique({ where: { key: matches[0] } });
          if (issue) issueId = issue.id;
        }
        await prisma.gitCommit.upsert({
          where: { integrationId_sha: { integrationId, sha: commit.id || commit.sha } },
          create: {
            integrationId,
            sha: commit.id || commit.sha,
            message: commit.message,
            authorName: commit.author?.name || '',
            authorEmail: commit.author?.email || '',
            committedAt: new Date(commit.timestamp || commit.committed_date),
            url: commit.url,
            issueId,
          },
          update: { issueId },
        });
      }
    }

    if (payload.pull_request || payload.merge_request) {
      const pr = payload.pull_request || payload.merge_request;
      const matches = pr.title.match(issueKeyRegex) || pr.head?.ref?.match(issueKeyRegex);
      let issueId: string | undefined;
      if (matches) {
        const issue = await prisma.issue.findUnique({ where: { key: matches[0] } });
        if (issue) issueId = issue.id;
      }
      const prNumber = pr.number || pr.iid;
      await prisma.gitPullRequest.upsert({
        where: { integrationId_prNumber: { integrationId, prNumber } },
        create: {
          integrationId,
          prNumber,
          title: pr.title,
          status: pr.merged ? 'MERGED' : pr.state === 'closed' ? 'CLOSED' : 'OPEN',
          authorName: pr.user?.login || pr.author?.name || '',
          url: pr.html_url || pr.web_url,
          sourceBranch: pr.head?.ref || pr.source_branch || '',
          targetBranch: pr.base?.ref || pr.target_branch || '',
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          issueId,
        },
        update: {
          status: pr.merged ? 'MERGED' : pr.state === 'closed' ? 'CLOSED' : 'OPEN',
          mergedAt: pr.merged_at ? new Date(pr.merged_at) : null,
          issueId,
        },
      });

      // Auto-update issue status when PR is merged
      if (pr.merged && issueId) {
        // Find "Done" column for the project
        const issue = await prisma.issue.findUnique({ where: { id: issueId }, include: { project: { include: { boards: { include: { columns: true } } } } } });
        if (issue) {
          const doneCol = issue.project.boards[0]?.columns.find(c => c.name.toLowerCase().includes('done'));
          if (doneCol) {
            await prisma.issue.update({ where: { id: issueId }, data: { statusId: doneCol.id } });
          }
        }
      }
    }

    return success(res, { message: 'Webhook processed' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Branch Name Suggestion ---
export const suggestBranchName = async (req: Request, res: Response) => {
  try {
    const { issueId } = req.params;
    const issue = await prisma.issue.findUnique({ where: { id: issueId } });
    if (!issue) return error(res, 'Issue not found', 404);

    const typePrefix = issue.type.toLowerCase() === 'bug' ? 'fix' : 'feature';
    const slug = issue.summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
    const branchName = `${typePrefix}/${issue.key.toLowerCase()}-${slug}`;

    return success(res, { branchName });
  } catch (e: any) {
    return error(res, e.message);
  }
};
