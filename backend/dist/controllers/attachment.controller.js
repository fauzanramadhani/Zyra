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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addAttachment = addAttachment;
exports.deleteAttachment = deleteAttachment;
const fs = __importStar(require("fs"));
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
const websocket_service_1 = require("../services/websocket.service");
async function addAttachment(req, res) {
    const userId = req.user?.id;
    const { issueId } = req.params;
    const file = req.file;
    if (!file) {
        return (0, response_1.sendError)(res, 400, 'No file was uploaded');
    }
    try {
        const issue = await db_1.default.issue.findUnique({ where: { id: issueId } });
        if (!issue) {
            // Remove orphaned file from disk
            fs.unlinkSync(file.path);
            return (0, response_1.sendError)(res, 404, 'Issue not found');
        }
        const fileUrl = `/uploads/${file.filename}`;
        const attachment = await db_1.default.attachment.create({
            data: {
                issueId,
                filename: file.originalname,
                fileUrl,
                mimeType: file.mimetype,
                size: file.size,
                uploadedById: userId,
            },
            include: {
                uploadedBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        // Write Activity Log
        await db_1.default.activity.create({
            data: {
                issueId,
                userId: userId,
                action: 'ADD_ATTACHMENT',
                details: JSON.stringify({ filename: attachment.filename, size: attachment.size }),
            },
        });
        (0, websocket_service_1.emitToProject)(issue.projectId, 'attachment:added', { issueId, attachment });
        return (0, response_1.sendCreated)(res, 'Attachment uploaded successfully', attachment);
    }
    catch (error) {
        console.error('Add attachment error:', error);
        // Attempt clean up of file on failure
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        return (0, response_1.sendError)(res, 500, 'Failed to save attachment metadata');
    }
}
async function deleteAttachment(req, res) {
    const userId = req.user?.id;
    const { attachmentId } = req.params;
    try {
        const attachment = await db_1.default.attachment.findUnique({ where: { id: attachmentId } });
        if (!attachment)
            return (0, response_1.sendError)(res, 404, 'Attachment not found');
        const issue = await db_1.default.issue.findUnique({ where: { id: attachment.issueId } });
        // Verify file exists and remove it
        const uploadDir = process.env.UPLOAD_DIR || '../../uploads';
        const filename = attachment.fileUrl.replace('/uploads/', '');
        const fsPath = `${uploadDir}/${filename}`;
        if (fs.existsSync(fsPath)) {
            fs.unlinkSync(fsPath);
        }
        await db_1.default.attachment.delete({ where: { id: attachmentId } });
        // Write Activity Log
        await db_1.default.activity.create({
            data: {
                issueId: attachment.issueId,
                userId: userId,
                action: 'DELETE_ATTACHMENT',
                details: JSON.stringify({ filename: attachment.filename }),
            },
        });
        (0, websocket_service_1.emitToProject)(issue.projectId, 'attachment:deleted', { issueId: attachment.issueId, attachmentId });
        return (0, response_1.sendSuccess)(res, 'Attachment removed successfully');
    }
    catch (error) {
        console.error('Delete attachment error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to delete attachment');
    }
}
