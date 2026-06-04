import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { upload } from '../middleware/upload.middleware';

// Controller imports
import * as authController from '../controllers/auth.controller';
import * as workspaceController from '../controllers/workspace.controller';
import * as projectController from '../controllers/project.controller';
import * as boardController from '../controllers/board.controller';
import * as sprintController from '../controllers/sprint.controller';
import * as issueController from '../controllers/issue.controller';
import * as commentController from '../controllers/comment.controller';
import * as attachmentController from '../controllers/attachment.controller';
import * as analyticsController from '../controllers/analytics.controller';
import * as auditController from '../controllers/audit.controller';
import * as importController from '../controllers/import.controller';
import * as invitationController from '../controllers/invitation.controller';
import * as notificationController from '../controllers/notification.controller';
import * as accountController from '../controllers/account.controller';
import * as trashController from '../controllers/trash.controller';
import * as issueLinkController from '../controllers/issueLink.controller';
import * as worklogController from '../controllers/worklog.controller';
import * as watcherController from '../controllers/watcher.controller';
import * as filterController from '../controllers/filter.controller';
import * as releaseController from '../controllers/release.controller';
import * as automationController from '../controllers/automation.controller';
import * as templateController from '../controllers/template.controller';
import * as estimationController from '../controllers/estimation.controller';
import * as bulkController from '../controllers/bulk.controller';
import * as chartsController from '../controllers/charts.controller';
// New Feature Controllers
import * as dashboardController from '../controllers/dashboard.controller';
import * as workflowController from '../controllers/workflow.controller';
import * as gitController from '../controllers/git.controller';
import * as recurringController from '../controllers/recurring.controller';
import * as slaController from '../controllers/sla.controller';
import * as goalController from '../controllers/goal.controller';
import * as approvalController from '../controllers/approval.controller';
import * as wikiController from '../controllers/wiki.controller';
import * as formController from '../controllers/form.controller';
import * as emailController from '../controllers/email.controller';
import * as chatController from '../controllers/chat.controller';
import * as timesheetController from '../controllers/timesheet.controller';
import * as ganttController from '../controllers/gantt.controller';
import * as aiController from '../controllers/ai.controller';

const router = Router();

// --- Auth Routes ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.get('/auth/me', authenticateToken, authController.me);

// --- Workspace Routes ---
router.get('/workspaces', authenticateToken, workspaceController.listWorkspaces);
router.post('/workspaces', authenticateToken, workspaceController.createWorkspace);
router.patch('/workspaces/:workspaceId', authenticateToken, upload.single('avatar'), workspaceController.updateWorkspace);
router.post('/workspaces/:workspaceId/transfer-ownership', authenticateToken, workspaceController.transferOwnership);
router.get('/workspaces/:workspaceId/members', authenticateToken, workspaceController.getWorkspaceMembers);
router.post('/workspaces/:workspaceId/members', authenticateToken, workspaceController.addWorkspaceMember);
router.delete('/workspaces/:workspaceId/members/:userId', authenticateToken, workspaceController.removeWorkspaceMember);

// --- Project Routes ---
router.get('/projects', authenticateToken, projectController.listProjects);
router.post('/projects', authenticateToken, projectController.createProject);
router.get('/projects/:projectId', authenticateToken, projectController.getProject);
router.patch('/projects/:projectId', authenticateToken, projectController.updateProject);
router.post('/projects/:projectId/members', authenticateToken, projectController.addProjectMember);
router.delete('/projects/:projectId/members/:userId', authenticateToken, projectController.removeProjectMember);
router.delete('/projects/:projectId', authenticateToken, projectController.deleteProject);

// --- Board & Column Routes ---
router.get('/boards/:boardId', authenticateToken, boardController.getBoard);
router.post('/boards/:boardId/columns', authenticateToken, boardController.createColumn);
router.put('/boards/:boardId/columns/reorder', authenticateToken, boardController.reorderColumns);
router.put('/columns/:columnId', authenticateToken, boardController.updateColumn);
router.delete('/columns/:columnId', authenticateToken, boardController.deleteColumn);

// --- Sprint Routes ---
router.get('/projects/:projectId/sprints', authenticateToken, sprintController.listSprints);
router.post('/projects/:projectId/sprints', authenticateToken, sprintController.createSprint);
router.post('/projects/:projectId/sprints/reorder', authenticateToken, sprintController.reorderSprints);
router.patch('/sprints/:sprintId', authenticateToken, sprintController.updateSprint);
router.post('/sprints/:sprintId/start', authenticateToken, sprintController.startSprint);
router.post('/sprints/:sprintId/complete', authenticateToken, sprintController.completeSprint);
router.post('/sprints/:sprintId/reopen', authenticateToken, sprintController.reopenSprint);
router.post('/sprints/:sprintId/archive', authenticateToken, sprintController.archiveSprint);
router.post('/sprints/:sprintId/restore', authenticateToken, sprintController.restoreSprint);
router.get('/sprints/:sprintId/stats', authenticateToken, sprintController.getSprintStats);
router.delete('/sprints/:sprintId', authenticateToken, sprintController.deleteSprint);

// --- Issue Routes ---
router.get('/projects/:projectId/issues', authenticateToken, issueController.listIssues);
router.post('/projects/:projectId/issues', authenticateToken, issueController.createIssue);
router.get('/issues/:issueId', authenticateToken, issueController.getIssue);
router.patch('/issues/:issueId', authenticateToken, issueController.updateIssue);
router.put('/issues/:issueId/move', authenticateToken, issueController.moveIssue);
router.delete('/issues/:issueId', authenticateToken, issueController.deleteIssue);

// --- Issue Link Routes ---
router.get('/issues/:issueId/links', authenticateToken, issueLinkController.getIssueLinks);
router.post('/issues/:issueId/links', authenticateToken, issueLinkController.createIssueLink);
router.delete('/issues/:issueId/links/:linkId', authenticateToken, issueLinkController.deleteIssueLink);

// --- Comment Routes ---
router.post('/issues/:issueId/comments', authenticateToken, commentController.addComment);
router.put('/comments/:commentId', authenticateToken, commentController.updateComment);
router.delete('/comments/:commentId', authenticateToken, commentController.deleteComment);

// --- Attachment Routes ---
router.post(
  '/issues/:issueId/attachments',
  authenticateToken,
  upload.single('file'),
  attachmentController.addAttachment
);
router.delete('/attachments/:attachmentId', authenticateToken, attachmentController.deleteAttachment);

// --- Workspace Invitation Routes ---
router.post('/invitations', authenticateToken, invitationController.createInvitation);
router.post('/invitations/:id/accept', authenticateToken, invitationController.acceptInvitation);
router.post('/invitations/:id/reject', authenticateToken, invitationController.rejectInvitation);
router.delete('/invitations/:id', authenticateToken, invitationController.deleteInvitation);
router.get('/workspaces/:workspaceId/invitations', authenticateToken, invitationController.listWorkspaceInvitations);
router.get('/invitations/user', authenticateToken, invitationController.listUserInvitations);

// --- Notification Routes ---
router.get('/notifications', authenticateToken, notificationController.listNotifications);
router.patch('/notifications/:id/read', authenticateToken, notificationController.readNotification);
router.patch('/notifications/read-all', authenticateToken, notificationController.readAllNotifications);
router.delete('/notifications/:id', authenticateToken, notificationController.deleteNotification);

// --- Account Settings Routes ---
router.patch('/account/profile', authenticateToken, upload.single('avatar'), accountController.updateProfile);
router.patch('/account/password', authenticateToken, accountController.changePassword);
router.get('/account/sessions', authenticateToken, accountController.listSessions);
router.delete('/account/sessions/:id', authenticateToken, accountController.revokeSession);

// --- Trash & Soft Delete / Restore Routes ---
router.get('/trash', authenticateToken, trashController.listTrash);
router.post('/trash/archive', authenticateToken, trashController.archiveItem);
router.post('/trash/restore', authenticateToken, trashController.restoreItem);
router.delete('/trash/purge', authenticateToken, trashController.purgeItem);

// --- Analytics Routes ---
router.get('/projects/:projectId/analytics', authenticateToken, analyticsController.getProjectAnalytics);

// --- Audit Log Routes ---
router.get('/audit-logs', authenticateToken, auditController.getAuditLogs);

// --- CSV Import Routes ---
router.post(
  '/projects/:projectId/imports/preview',
  authenticateToken,
  upload.single('file'),
  importController.previewImport
);
router.post('/projects/:projectId/imports/start', authenticateToken, importController.startImport);
router.get('/imports/jobs/:jobId', authenticateToken, importController.getImportJobStatus);
router.get('/imports/jobs', authenticateToken, importController.listImportJobs);

// --- Work Log / Time Tracking Routes ---
router.get('/issues/:issueId/worklogs', authenticateToken, worklogController.listWorkLogs);
router.post('/issues/:issueId/worklogs', authenticateToken, worklogController.addWorkLog);
router.patch('/worklogs/:logId', authenticateToken, worklogController.updateWorkLog);
router.delete('/worklogs/:logId', authenticateToken, worklogController.deleteWorkLog);
router.get('/issues/:issueId/time-summary', authenticateToken, worklogController.getIssueTimeSummary);

// --- Watcher Routes ---
router.get('/issues/:issueId/watchers', authenticateToken, watcherController.listWatchers);
router.post('/issues/:issueId/watch', authenticateToken, watcherController.watchIssue);
router.delete('/issues/:issueId/watch', authenticateToken, watcherController.unwatchIssue);
router.get('/issues/:issueId/watching', authenticateToken, watcherController.isWatching);

// --- Saved Filter Routes ---
router.get('/projects/:projectId/filters', authenticateToken, filterController.listFilters);
router.post('/projects/:projectId/filters', authenticateToken, filterController.createFilter);
router.patch('/filters/:filterId', authenticateToken, filterController.updateFilter);
router.delete('/filters/:filterId', authenticateToken, filterController.deleteFilter);

// --- Release / Version Routes ---
router.get('/projects/:projectId/releases', authenticateToken, releaseController.listReleases);
router.post('/projects/:projectId/releases', authenticateToken, releaseController.createRelease);
router.patch('/releases/:releaseId', authenticateToken, releaseController.updateRelease);
router.delete('/releases/:releaseId', authenticateToken, releaseController.deleteRelease);
router.post('/releases/:releaseId/issues', authenticateToken, releaseController.addIssuesToRelease);
router.delete('/releases/:releaseId/issues/:issueId', authenticateToken, releaseController.removeIssueFromRelease);

// --- Automation Rules Routes ---
router.get('/projects/:projectId/automations', authenticateToken, automationController.listRules);
router.post('/projects/:projectId/automations', authenticateToken, automationController.createRule);
router.get('/projects/:projectId/automations/stats', authenticateToken, automationController.getStats);
router.get('/projects/:projectId/automations/executions', authenticateToken, automationController.getExecutions);
router.patch('/automations/:ruleId', authenticateToken, automationController.updateRule);
router.delete('/automations/:ruleId', authenticateToken, automationController.deleteRule);
router.post('/automations/:ruleId/toggle', authenticateToken, automationController.toggleRule);
router.post('/automations/:ruleId/test', authenticateToken, automationController.testRule);

// --- Issue Template Routes ---
router.get('/projects/:projectId/templates', authenticateToken, templateController.listTemplates);
router.post('/projects/:projectId/templates', authenticateToken, templateController.createTemplate);
router.get('/templates/:templateId', authenticateToken, templateController.getTemplate);
router.patch('/templates/:templateId', authenticateToken, templateController.updateTemplate);
router.delete('/templates/:templateId', authenticateToken, templateController.deleteTemplate);

// --- Planning Poker / Estimation Routes ---
router.post('/sprints/:sprintId/estimation', authenticateToken, estimationController.createSession);
router.get('/sprints/:sprintId/estimation', authenticateToken, estimationController.getActiveSession);
router.patch('/estimation/:sessionId/current-issue', authenticateToken, estimationController.setCurrentIssue);
router.post('/estimation/:sessionId/vote', authenticateToken, estimationController.submitVote);
router.post('/estimation/:sessionId/reveal', authenticateToken, estimationController.revealVotes);
router.post('/estimation/:sessionId/accept', authenticateToken, estimationController.acceptEstimation);
router.post('/estimation/:sessionId/complete', authenticateToken, estimationController.completeSession);

// --- Bulk Operations Routes ---
router.post('/issues/bulk-update', authenticateToken, bulkController.bulkUpdateIssues);
router.post('/issues/bulk-move-sprint', authenticateToken, bulkController.bulkMoveToSprint);
router.post('/issues/bulk-delete', authenticateToken, bulkController.bulkDeleteIssues);
router.post('/issues/bulk-labels', authenticateToken, bulkController.bulkAddLabels);

// --- Charts (Burndown / Velocity) Routes ---
router.get('/sprints/:sprintId/burndown', authenticateToken, chartsController.getBurndownData);
router.get('/projects/:projectId/velocity', authenticateToken, chartsController.getVelocityData);

// --- Custom Dashboard Routes ---
router.get('/dashboards', authenticateToken, dashboardController.listDashboards);
router.post('/dashboards', authenticateToken, dashboardController.createDashboard);
router.get('/dashboards/:dashboardId', authenticateToken, dashboardController.getDashboard);
router.patch('/dashboards/:dashboardId', authenticateToken, dashboardController.updateDashboard);
router.delete('/dashboards/:dashboardId', authenticateToken, dashboardController.deleteDashboard);
router.post('/dashboards/:dashboardId/widgets', authenticateToken, dashboardController.addWidget);
router.patch('/widgets/:widgetId', authenticateToken, dashboardController.updateWidget);
router.delete('/widgets/:widgetId', authenticateToken, dashboardController.deleteWidget);
router.get('/widgets/:widgetId/data', authenticateToken, dashboardController.getWidgetData);

// --- Custom Workflow Routes ---
router.get('/projects/:projectId/workflows', authenticateToken, workflowController.listWorkflows);
router.post('/projects/:projectId/workflows', authenticateToken, workflowController.createWorkflow);
router.get('/workflows/:workflowId', authenticateToken, workflowController.getWorkflow);
router.patch('/workflows/:workflowId', authenticateToken, workflowController.updateWorkflow);
router.delete('/workflows/:workflowId', authenticateToken, workflowController.deleteWorkflow);
router.post('/workflows/:workflowId/states', authenticateToken, workflowController.addState);
router.patch('/workflow-states/:stateId', authenticateToken, workflowController.updateState);
router.delete('/workflow-states/:stateId', authenticateToken, workflowController.deleteState);
router.post('/workflows/:workflowId/transitions', authenticateToken, workflowController.addTransition);
router.delete('/workflow-transitions/:transitionId', authenticateToken, workflowController.deleteTransition);

// --- Git Integration Routes ---
router.get('/projects/:projectId/git', authenticateToken, gitController.listIntegrations);
router.post('/projects/:projectId/git', authenticateToken, gitController.createIntegration);
router.patch('/git/:integrationId', authenticateToken, gitController.updateIntegration);
router.delete('/git/:integrationId', authenticateToken, gitController.deleteIntegration);
router.get('/issues/:issueId/git/commits', authenticateToken, gitController.listCommits);
router.post('/git/commits', authenticateToken, gitController.linkCommit);
router.get('/issues/:issueId/git/branches', authenticateToken, gitController.listBranches);
router.post('/git/branches', authenticateToken, gitController.linkBranch);
router.get('/issues/:issueId/git/pull-requests', authenticateToken, gitController.listPullRequests);
router.post('/git/pull-requests', authenticateToken, gitController.linkPullRequest);
router.post('/git/:integrationId/webhook', gitController.handleWebhook);
router.get('/issues/:issueId/git/suggest-branch', authenticateToken, gitController.suggestBranchName);

// --- Recurring Issues Routes ---
router.get('/projects/:projectId/recurring', authenticateToken, recurringController.listRecurringIssues);
router.post('/projects/:projectId/recurring', authenticateToken, recurringController.createRecurringIssue);
router.patch('/recurring/:recurringId', authenticateToken, recurringController.updateRecurringIssue);
router.delete('/recurring/:recurringId', authenticateToken, recurringController.deleteRecurringIssue);
router.post('/recurring/:recurringId/trigger', authenticateToken, recurringController.triggerRecurringIssue);

// --- SLA Routes ---
router.get('/projects/:projectId/sla', authenticateToken, slaController.listPolicies);
router.post('/projects/:projectId/sla', authenticateToken, slaController.createPolicy);
router.patch('/sla/:policyId', authenticateToken, slaController.updatePolicy);
router.delete('/sla/:policyId', authenticateToken, slaController.deletePolicy);
router.get('/issues/:issueId/sla', authenticateToken, slaController.getIssueSlA);
router.post('/issues/:issueId/sla/start', authenticateToken, slaController.startSlaTracking);
router.post('/issues/:issueId/sla/respond', authenticateToken, slaController.markResponded);
router.post('/issues/:issueId/sla/resolve', authenticateToken, slaController.markResolved);
router.get('/projects/:projectId/sla/report', authenticateToken, slaController.getSlaReport);

// --- Goals & OKR Routes ---
router.get('/goals', authenticateToken, goalController.listGoals);
router.post('/goals', authenticateToken, goalController.createGoal);
router.get('/goals/:goalId', authenticateToken, goalController.getGoal);
router.patch('/goals/:goalId', authenticateToken, goalController.updateGoal);
router.post('/goals/:goalId/progress', authenticateToken, goalController.updateGoalProgressManual);
router.delete('/goals/:goalId', authenticateToken, goalController.deleteGoal);
router.post('/goals/:goalId/links', authenticateToken, goalController.linkEntity);
router.delete('/goals/:goalId/links/:linkId', authenticateToken, goalController.unlinkEntity);
router.post('/goals/:goalId/archive', authenticateToken, goalController.archiveGoal);
router.post('/goals/:goalId/unarchive', authenticateToken, goalController.unarchiveGoal);

// --- Approval Workflow Routes ---
router.get('/projects/:projectId/approvals/rules', authenticateToken, approvalController.listRules);
router.post('/projects/:projectId/approvals/rules', authenticateToken, approvalController.createRule);
router.patch('/approvals/rules/:ruleId', authenticateToken, approvalController.updateRule);
router.delete('/approvals/rules/:ruleId', authenticateToken, approvalController.deleteRule);
router.post('/issues/:issueId/approvals', authenticateToken, approvalController.requestApproval);
router.get('/issues/:issueId/approvals', authenticateToken, approvalController.listApprovalRequests);
router.post('/approvals/:requestId/respond', authenticateToken, approvalController.respondToApproval);
router.get('/approvals/pending', authenticateToken, approvalController.getPendingApprovals);

// --- Wiki / Knowledge Base Routes ---
router.get('/wiki/spaces', authenticateToken, wikiController.listSpaces);
router.post('/wiki/spaces', authenticateToken, wikiController.createSpace);
router.patch('/wiki/spaces/:spaceId', authenticateToken, wikiController.updateSpace);
router.delete('/wiki/spaces/:spaceId', authenticateToken, wikiController.deleteSpace);
router.get('/wiki/spaces/:spaceId/pages', authenticateToken, wikiController.listPages);
router.post('/wiki/spaces/:spaceId/pages', authenticateToken, wikiController.createPage);
router.get('/wiki/pages/:pageId', authenticateToken, wikiController.getPage);
router.patch('/wiki/pages/:pageId', authenticateToken, wikiController.updatePage);
router.delete('/wiki/pages/:pageId', authenticateToken, wikiController.deletePage);
router.get('/wiki/pages/:pageId/revisions', authenticateToken, wikiController.getPageRevisions);

// --- Public Forms Routes ---
router.get('/projects/:projectId/forms', authenticateToken, formController.listForms);
router.post('/projects/:projectId/forms', authenticateToken, formController.createForm);
router.patch('/forms/:formId', authenticateToken, formController.updateForm);
router.delete('/forms/:formId', authenticateToken, formController.deleteForm);
router.get('/forms/:formId/submissions', authenticateToken, formController.listSubmissions);
router.get('/public/forms/:slug', formController.getFormBySlug); // No auth - public
router.post('/public/forms/:slug/submit', formController.submitForm); // No auth - public

// --- Email-to-Issue Routes ---
router.get('/projects/:projectId/email-inboxes', authenticateToken, emailController.listInboxes);
router.post('/projects/:projectId/email-inboxes', authenticateToken, emailController.createInbox);
router.patch('/email-inboxes/:inboxId', authenticateToken, emailController.updateInbox);
router.delete('/email-inboxes/:inboxId', authenticateToken, emailController.deleteInbox);
router.post('/email-inboxes/:inboxId/incoming', emailController.processIncomingEmail); // Webhook from mail service
router.get('/email-inboxes/:inboxId/emails', authenticateToken, emailController.listEmails);

// --- Chat Integration (Slack/Discord) Routes ---
router.get('/workspaces/:workspaceId/chat-integrations', authenticateToken, chatController.listIntegrations);
router.post('/workspaces/:workspaceId/chat-integrations', authenticateToken, chatController.createIntegration);
router.patch('/chat-integrations/:integrationId', authenticateToken, chatController.updateIntegration);
router.delete('/chat-integrations/:integrationId', authenticateToken, chatController.deleteIntegration);
router.post('/chat-integrations/:integrationId/test', authenticateToken, chatController.testIntegration);
router.post('/workspaces/:workspaceId/chat-integrations/notify', authenticateToken, chatController.sendNotification);

// --- Timesheet & Time Reports Routes ---
router.get('/timesheets/me', authenticateToken, timesheetController.getMyTimesheet);
router.post('/timesheets/:timesheetId/entries', authenticateToken, timesheetController.addTimesheetEntry);
router.patch('/timesheets/entries/:entryId', authenticateToken, timesheetController.updateTimesheetEntry);
router.delete('/timesheets/entries/:entryId', authenticateToken, timesheetController.deleteTimesheetEntry);
router.post('/timesheets/:timesheetId/submit', authenticateToken, timesheetController.submitTimesheet);
router.post('/timesheets/:timesheetId/approve', authenticateToken, timesheetController.approveTimesheet);
router.get('/timesheets/summary', authenticateToken, timesheetController.getUserTimeSummary);
router.get('/projects/:projectId/time-report', authenticateToken, timesheetController.getTimeReport);

// --- Gantt & Dependency Graph Routes ---
router.get('/projects/:projectId/gantt', authenticateToken, ganttController.getGanttData);
router.get('/projects/:projectId/dependency-graph', authenticateToken, ganttController.getDependencyGraph);

// --- AI-Powered Features Routes ---
router.post('/projects/:projectId/ai/suggest-assignee', authenticateToken, aiController.suggestAssignee);
router.post('/projects/:projectId/ai/detect-duplicates', authenticateToken, aiController.detectDuplicates);
router.get('/projects/:projectId/ai/sprint-suggestions', authenticateToken, aiController.sprintPlanningSuggestions);
router.get('/issues/:issueId/ai/summary', authenticateToken, aiController.summarizeIssue);

export default router;
