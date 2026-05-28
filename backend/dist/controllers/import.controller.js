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
exports.previewImport = previewImport;
exports.startImport = startImport;
exports.getImportJobStatus = getImportJobStatus;
exports.listImportJobs = listImportJobs;
const fs = __importStar(require("fs"));
const csv_parse_1 = require("csv-parse");
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
const csvMapper_1 = require("../utils/csvMapper");
const import_queue_1 = require("../services/import.queue");
async function previewImport(req, res) {
    const file = req.file;
    if (!file) {
        return (0, response_1.sendError)(res, 400, 'No CSV file uploaded');
    }
    try {
        const records = [];
        const parser = fs.createReadStream(file.path).pipe((0, csv_parse_1.parse)({
            columns: false,
            trim: true,
            skip_empty_lines: true,
            bom: true,
        }));
        let count = 0;
        try {
            for await (const record of parser) {
                records.push(record);
                count++;
                if (count >= 6) {
                    parser.destroy();
                    break;
                }
            }
        }
        catch (parseErr) {
            // Just catch end of stream / destroy errors
        }
        if (records.length === 0) {
            fs.unlinkSync(file.path);
            return (0, response_1.sendError)(res, 400, 'CSV file is empty');
        }
        const headers = records[0];
        const previewRows = records.slice(1);
        // Build mapping suggestions
        const mappingsSuggestions = headers.map((header, index) => ({
            header,
            targetField: (0, csvMapper_1.suggestFieldMapping)(header),
            sampleValues: previewRows.map((row) => row[index] || ''),
        }));
        return (0, response_1.sendSuccess)(res, 'CSV parsed for preview successfully', {
            filename: file.filename,
            originalName: file.originalname,
            headers,
            suggestedMappings: mappingsSuggestions,
            totalPreviewRows: previewRows.length,
        });
    }
    catch (error) {
        console.error('CSV Preview Error:', error);
        if (file && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
        return (0, response_1.sendError)(res, 500, 'Failed to parse CSV file for preview');
    }
}
async function startImport(req, res) {
    const userId = req.user?.id;
    const { projectId } = req.params;
    const { filename, mappings, options } = req.body;
    if (!filename || !mappings) {
        return (0, response_1.sendError)(res, 400, 'Filename and column mappings are required');
    }
    const uploadDir = process.env.UPLOAD_DIR || '../../uploads';
    const filePath = `${uploadDir}/${filename}`;
    if (!fs.existsSync(filePath)) {
        return (0, response_1.sendError)(res, 400, 'Uploaded file not found or expired');
    }
    try {
        // 1. Estimate total rows for progress tracking
        let totalRows = 0;
        const countParser = fs.createReadStream(filePath).pipe((0, csv_parse_1.parse)({
            columns: false,
            trim: true,
            skip_empty_lines: true,
            bom: true,
        }));
        for await (const _ of countParser) {
            totalRows++;
        }
        // Subtract header row
        if (totalRows > 0)
            totalRows--;
        // 2. Create import job record
        const job = await db_1.default.importJob.create({
            data: {
                filename,
                projectId,
                status: 'PENDING',
                progress: 0,
                totalRows,
                successRows: 0,
                failedRows: 0,
                createdBy: userId,
            },
        });
        // 3. Save mapping template as configuration history
        await db_1.default.importMapping.create({
            data: {
                projectId,
                mappingTemplate: JSON.stringify(mappings),
                createdBy: userId,
            },
        });
        // 4. Dispatch job to BullMQ
        await import_queue_1.importQueue.add(`import-${job.id}`, {
            jobId: job.id,
            filePath,
            projectId,
            mappings,
            options: options || {
                autoCreateUsers: true,
                autoCreateStatuses: true,
                autoCreateLabels: true,
                duplicateHandling: 'create_new',
            },
            userId,
        });
        return (0, response_1.sendCreated)(res, 'Import job initialized', job);
    }
    catch (error) {
        console.error('Start Import Error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to schedule CSV import job');
    }
}
async function getImportJobStatus(req, res) {
    const { jobId } = req.params;
    try {
        const job = await db_1.default.importJob.findUnique({
            where: { id: jobId },
            include: {
                errors: {
                    take: 50, // limit to first 50 errors
                    orderBy: { rowNumber: 'asc' },
                },
            },
        });
        if (!job)
            return (0, response_1.sendError)(res, 404, 'Import job not found');
        return (0, response_1.sendSuccess)(res, 'Job status loaded', job);
    }
    catch (error) {
        console.error('Get Job Status Error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to load job details');
    }
}
async function listImportJobs(req, res) {
    const { projectId } = req.query;
    try {
        const jobs = await db_1.default.importJob.findMany({
            where: projectId ? { projectId: projectId } : {},
            orderBy: { startedAt: 'desc' },
            take: 10,
        });
        return (0, response_1.sendSuccess)(res, 'Import jobs loaded', jobs);
    }
    catch (error) {
        console.error('List import jobs error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to fetch import job history');
    }
}
