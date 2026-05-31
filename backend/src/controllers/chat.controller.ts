import { Request, Response } from 'express';
import prisma from '../db';
import { success, error } from '../utils/response';

// --- Chat Integrations (Slack/Discord) ---
export const listIntegrations = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const integrations = await prisma.chatIntegration.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return success(res, integrations.map(i => ({ ...i, events: JSON.parse(i.events) })));
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const createIntegration = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { provider, webhookUrl, channelId, channelName, events } = req.body;
    const integration = await prisma.chatIntegration.create({
      data: {
        workspaceId,
        provider,
        webhookUrl,
        channelId,
        channelName,
        events: JSON.stringify(events),
      },
    });
    return success(res, integration, 201);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const updateIntegration = async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const { webhookUrl, channelId, channelName, events, enabled } = req.body;
    const data: any = {};
    if (webhookUrl) data.webhookUrl = webhookUrl;
    if (channelId) data.channelId = channelId;
    if (channelName) data.channelName = channelName;
    if (events) data.events = JSON.stringify(events);
    if (enabled !== undefined) data.enabled = enabled;

    const integration = await prisma.chatIntegration.update({ where: { id: integrationId }, data });
    return success(res, integration);
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const deleteIntegration = async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    await prisma.chatIntegration.update({ where: { id: integrationId }, data: { deletedAt: new Date() } });
    return success(res, { message: 'Integration deleted' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

export const testIntegration = async (req: Request, res: Response) => {
  try {
    const { integrationId } = req.params;
    const integration = await prisma.chatIntegration.findUnique({ where: { id: integrationId } });
    if (!integration) return error(res, 'Integration not found', 404);

    // Send test message via webhook
    const message = integration.provider === 'SLACK'
      ? { text: '🔔 Zyra test notification - integration is working!' }
      : { content: '🔔 Zyra test notification - integration is working!' };

    const response = await fetch(integration.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      return error(res, `Webhook returned ${response.status}`, 400);
    }

    return success(res, { message: 'Test message sent successfully' });
  } catch (e: any) {
    return error(res, e.message);
  }
};

// --- Send Notification (internal helper, also exposed as endpoint for testing) ---
export const sendNotification = async (req: Request, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { event, data: eventData } = req.body;

    const integrations = await prisma.chatIntegration.findMany({
      where: { workspaceId, enabled: true, deletedAt: null },
    });

    const results = [];
    for (const integration of integrations) {
      const events = JSON.parse(integration.events);
      if (!events.includes(event)) continue;

      const message = formatMessage(integration.provider, event, eventData);
      try {
        await fetch(integration.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message),
        });
        results.push({ integrationId: integration.id, status: 'sent' });
      } catch {
        results.push({ integrationId: integration.id, status: 'failed' });
      }
    }

    return success(res, { results });
  } catch (e: any) {
    return error(res, e.message);
  }
};

function formatMessage(provider: string, event: string, data: any) {
  const text = formatEventText(event, data);
  if (provider === 'SLACK') {
    return { text, blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }] };
  }
  // Discord
  return { content: text };
}

function formatEventText(event: string, data: any): string {
  switch (event) {
    case 'issue_created':
      return `📋 New issue created: **${data.key}** - ${data.summary}`;
    case 'issue_status_changed':
      return `🔄 ${data.key} moved from *${data.from}* to *${data.to}*`;
    case 'comment_added':
      return `💬 New comment on ${data.key} by ${data.author}`;
    case 'issue_assigned':
      return `👤 ${data.key} assigned to ${data.assignee}`;
    case 'sprint_started':
      return `🏃 Sprint started: ${data.name}`;
    case 'sprint_completed':
      return `✅ Sprint completed: ${data.name}`;
    default:
      return `🔔 ${event}: ${JSON.stringify(data)}`;
  }
}
