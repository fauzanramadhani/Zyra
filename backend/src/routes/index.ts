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
router.patch('/sprints/:sprintId', authenticateToken, sprintController.updateSprint);
router.post('/sprints/:sprintId/complete', authenticateToken, sprintController.completeSprint);

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

export default router;
