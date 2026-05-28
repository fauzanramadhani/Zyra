"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
// Controller imports
const authController = __importStar(require("../controllers/auth.controller"));
const workspaceController = __importStar(require("../controllers/workspace.controller"));
const projectController = __importStar(require("../controllers/project.controller"));
const boardController = __importStar(require("../controllers/board.controller"));
const sprintController = __importStar(require("../controllers/sprint.controller"));
const issueController = __importStar(require("../controllers/issue.controller"));
const commentController = __importStar(require("../controllers/comment.controller"));
const attachmentController = __importStar(require("../controllers/attachment.controller"));
const analyticsController = __importStar(require("../controllers/analytics.controller"));
const auditController = __importStar(require("../controllers/audit.controller"));
const importController = __importStar(require("../controllers/import.controller"));
const invitationController = __importStar(require("../controllers/invitation.controller"));
const notificationController = __importStar(require("../controllers/notification.controller"));
const accountController = __importStar(require("../controllers/account.controller"));
const trashController = __importStar(require("../controllers/trash.controller"));
const router = (0, express_1.Router)();
// --- Auth Routes ---
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.post('/auth/refresh', authController.refresh);
router.get('/auth/me', auth_middleware_1.authenticateToken, authController.me);
// --- Workspace Routes ---
router.get('/workspaces', auth_middleware_1.authenticateToken, workspaceController.listWorkspaces);
router.post('/workspaces', auth_middleware_1.authenticateToken, workspaceController.createWorkspace);
router.patch('/workspaces/:workspaceId', auth_middleware_1.authenticateToken, upload_middleware_1.upload.single('avatar'), workspaceController.updateWorkspace);
router.post('/workspaces/:workspaceId/transfer-ownership', auth_middleware_1.authenticateToken, workspaceController.transferOwnership);
router.get('/workspaces/:workspaceId/members', auth_middleware_1.authenticateToken, workspaceController.getWorkspaceMembers);
router.post('/workspaces/:workspaceId/members', auth_middleware_1.authenticateToken, workspaceController.addWorkspaceMember);
router.delete('/workspaces/:workspaceId/members/:userId', auth_middleware_1.authenticateToken, workspaceController.removeWorkspaceMember);
// --- Project Routes ---
router.get('/projects', auth_middleware_1.authenticateToken, projectController.listProjects);
router.post('/projects', auth_middleware_1.authenticateToken, projectController.createProject);
router.get('/projects/:projectId', auth_middleware_1.authenticateToken, projectController.getProject);
router.patch('/projects/:projectId', auth_middleware_1.authenticateToken, projectController.updateProject);
router.post('/projects/:projectId/members', auth_middleware_1.authenticateToken, projectController.addProjectMember);
router.delete('/projects/:projectId/members/:userId', auth_middleware_1.authenticateToken, projectController.removeProjectMember);
router.delete('/projects/:projectId', auth_middleware_1.authenticateToken, projectController.deleteProject);
// --- Board & Column Routes ---
router.get('/boards/:boardId', auth_middleware_1.authenticateToken, boardController.getBoard);
router.post('/boards/:boardId/columns', auth_middleware_1.authenticateToken, boardController.createColumn);
router.put('/boards/:boardId/columns/reorder', auth_middleware_1.authenticateToken, boardController.reorderColumns);
router.put('/columns/:columnId', auth_middleware_1.authenticateToken, boardController.updateColumn);
router.delete('/columns/:columnId', auth_middleware_1.authenticateToken, boardController.deleteColumn);
// --- Sprint Routes ---
router.get('/projects/:projectId/sprints', auth_middleware_1.authenticateToken, sprintController.listSprints);
router.post('/projects/:projectId/sprints', auth_middleware_1.authenticateToken, sprintController.createSprint);
router.patch('/sprints/:sprintId', auth_middleware_1.authenticateToken, sprintController.updateSprint);
router.post('/sprints/:sprintId/complete', auth_middleware_1.authenticateToken, sprintController.completeSprint);
// --- Issue Routes ---
router.get('/projects/:projectId/issues', auth_middleware_1.authenticateToken, issueController.listIssues);
router.post('/projects/:projectId/issues', auth_middleware_1.authenticateToken, issueController.createIssue);
router.get('/issues/:issueId', auth_middleware_1.authenticateToken, issueController.getIssue);
router.patch('/issues/:issueId', auth_middleware_1.authenticateToken, issueController.updateIssue);
router.put('/issues/:issueId/move', auth_middleware_1.authenticateToken, issueController.moveIssue);
router.delete('/issues/:issueId', auth_middleware_1.authenticateToken, issueController.deleteIssue);
// --- Comment Routes ---
router.post('/issues/:issueId/comments', auth_middleware_1.authenticateToken, commentController.addComment);
router.put('/comments/:commentId', auth_middleware_1.authenticateToken, commentController.updateComment);
router.delete('/comments/:commentId', auth_middleware_1.authenticateToken, commentController.deleteComment);
// --- Attachment Routes ---
router.post('/issues/:issueId/attachments', auth_middleware_1.authenticateToken, upload_middleware_1.upload.single('file'), attachmentController.addAttachment);
router.delete('/attachments/:attachmentId', auth_middleware_1.authenticateToken, attachmentController.deleteAttachment);
// --- Workspace Invitation Routes ---
router.post('/invitations', auth_middleware_1.authenticateToken, invitationController.createInvitation);
router.post('/invitations/:id/accept', auth_middleware_1.authenticateToken, invitationController.acceptInvitation);
router.post('/invitations/:id/reject', auth_middleware_1.authenticateToken, invitationController.rejectInvitation);
router.delete('/invitations/:id', auth_middleware_1.authenticateToken, invitationController.deleteInvitation);
router.get('/workspaces/:workspaceId/invitations', auth_middleware_1.authenticateToken, invitationController.listWorkspaceInvitations);
router.get('/invitations/user', auth_middleware_1.authenticateToken, invitationController.listUserInvitations);
// --- Notification Routes ---
router.get('/notifications', auth_middleware_1.authenticateToken, notificationController.listNotifications);
router.patch('/notifications/:id/read', auth_middleware_1.authenticateToken, notificationController.readNotification);
router.patch('/notifications/read-all', auth_middleware_1.authenticateToken, notificationController.readAllNotifications);
router.delete('/notifications/:id', auth_middleware_1.authenticateToken, notificationController.deleteNotification);
// --- Account Settings Routes ---
router.patch('/account/profile', auth_middleware_1.authenticateToken, upload_middleware_1.upload.single('avatar'), accountController.updateProfile);
router.patch('/account/password', auth_middleware_1.authenticateToken, accountController.changePassword);
router.get('/account/sessions', auth_middleware_1.authenticateToken, accountController.listSessions);
router.delete('/account/sessions/:id', auth_middleware_1.authenticateToken, accountController.revokeSession);
// --- Trash & Soft Delete / Restore Routes ---
router.get('/trash', auth_middleware_1.authenticateToken, trashController.listTrash);
router.post('/trash/archive', auth_middleware_1.authenticateToken, trashController.archiveItem);
router.post('/trash/restore', auth_middleware_1.authenticateToken, trashController.restoreItem);
router.delete('/trash/purge', auth_middleware_1.authenticateToken, trashController.purgeItem);
// --- Analytics Routes ---
router.get('/projects/:projectId/analytics', auth_middleware_1.authenticateToken, analyticsController.getProjectAnalytics);
// --- Audit Log Routes ---
router.get('/audit-logs', auth_middleware_1.authenticateToken, auditController.getAuditLogs);
// --- CSV Import Routes ---
router.post('/projects/:projectId/imports/preview', auth_middleware_1.authenticateToken, upload_middleware_1.upload.single('file'), importController.previewImport);
router.post('/projects/:projectId/imports/start', auth_middleware_1.authenticateToken, importController.startImport);
router.get('/imports/jobs/:jobId', auth_middleware_1.authenticateToken, importController.getImportJobStatus);
router.get('/imports/jobs', auth_middleware_1.authenticateToken, importController.listImportJobs);
exports.default = router;
