import { Response } from 'express';
import * as fs from 'fs';
import { parse } from 'csv-parse';
import prisma from '../db';
import { sendSuccess, sendCreated, sendError } from '../utils/response';
import { AuthenticatedRequest } from '../types';
import { suggestFieldMapping } from '../utils/csvMapper';
import { importQueue } from '../services/import.queue';

export async function previewImport(req: AuthenticatedRequest, res: Response) {
  const file = req.file;

  if (!file) {
    return sendError(res, 400, 'No CSV file uploaded');
  }

  try {
    const records: string[][] = [];
    const parser = fs.createReadStream(file.path).pipe(
      parse({
        columns: false,
        trim: true,
        skip_empty_lines: true,
        bom: true,
      })
    );

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
    } catch (parseErr) {
      // Just catch end of stream / destroy errors
    }

    if (records.length === 0) {
      fs.unlinkSync(file.path);
      return sendError(res, 400, 'CSV file is empty');
    }

    const headers = records[0];
    const previewRows = records.slice(1);

    // Build mapping suggestions
    const mappingsSuggestions = headers.map((header, index) => ({
      header,
      targetField: suggestFieldMapping(header),
      sampleValues: previewRows.map((row) => row[index] || ''),
    }));

    return sendSuccess(res, 'CSV parsed for preview successfully', {
      filename: file.filename,
      originalName: file.originalname,
      headers,
      suggestedMappings: mappingsSuggestions,
      totalPreviewRows: previewRows.length,
    });
  } catch (error: any) {
    console.error('CSV Preview Error:', error);
    if (file && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    return sendError(res, 500, 'Failed to parse CSV file for preview');
  }
}

export async function startImport(req: AuthenticatedRequest, res: Response) {
  const userId = req.user?.id;
  const { projectId } = req.params;
  const { filename, mappings, options } = req.body;

  if (!filename || !mappings) {
    return sendError(res, 400, 'Filename and column mappings are required');
  }

  const uploadDir = process.env.UPLOAD_DIR || '../../uploads';
  const filePath = `${uploadDir}/${filename}`;

  if (!fs.existsSync(filePath)) {
    return sendError(res, 400, 'Uploaded file not found or expired');
  }

  try {
    // 1. Estimate total rows for progress tracking
    let totalRows = 0;
    const countParser = fs.createReadStream(filePath).pipe(
      parse({
        columns: false,
        trim: true,
        skip_empty_lines: true,
        bom: true,
      })
    );

    for await (const _ of countParser) {
      totalRows++;
    }
    // Subtract header row
    if (totalRows > 0) totalRows--;

    // 2. Create import job record
    const job = await prisma.importJob.create({
      data: {
        filename,
        projectId,
        status: 'PENDING',
        progress: 0,
        totalRows,
        successRows: 0,
        failedRows: 0,
        createdBy: userId!,
      },
    });

    // 3. Save mapping template as configuration history
    await prisma.importMapping.create({
      data: {
        projectId,
        mappingTemplate: JSON.stringify(mappings),
        createdBy: userId!,
      },
    });

    // 4. Dispatch job to BullMQ
    await importQueue.add(`import-${job.id}`, {
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

    return sendCreated(res, 'Import job initialized', job);
  } catch (error: any) {
    console.error('Start Import Error:', error);
    return sendError(res, 500, 'Failed to schedule CSV import job');
  }
}

export async function getImportJobStatus(req: AuthenticatedRequest, res: Response) {
  const { jobId } = req.params;

  try {
    const job = await prisma.importJob.findUnique({
      where: { id: jobId },
      include: {
        errors: {
          take: 50, // limit to first 50 errors
          orderBy: { rowNumber: 'asc' },
        },
      },
    });

    if (!job) return sendError(res, 404, 'Import job not found');

    return sendSuccess(res, 'Job status loaded', job);
  } catch (error: any) {
    console.error('Get Job Status Error:', error);
    return sendError(res, 500, 'Failed to load job details');
  }
}

export async function listImportJobs(req: AuthenticatedRequest, res: Response) {
  const { projectId } = req.query;

  try {
    const jobs = await prisma.importJob.findMany({
      where: projectId ? { projectId: projectId as string } : {},
      orderBy: { startedAt: 'desc' },
      take: 10,
    });

    return sendSuccess(res, 'Import jobs loaded', jobs);
  } catch (error: any) {
    console.error('List import jobs error:', error);
    return sendError(res, 500, 'Failed to fetch import job history');
  }
}
