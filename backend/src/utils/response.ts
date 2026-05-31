import { Response } from 'express';

interface MetaData {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: any;
}

export function sendResponse(
  res: Response,
  statusCode: number,
  success: boolean,
  message: string,
  data: any = null,
  meta: MetaData | null = null
) {
  const responsePayload: any = {
    success,
    message,
    data,
  };

  if (meta) {
    responsePayload.meta = {
      page: meta.page,
      limit: meta.limit,
      total: meta.total,
      ...meta,
    };
  }

  return res.status(statusCode).json(responsePayload);
}

export function sendSuccess(res: Response, message: string, data: any = null, meta: MetaData | null = null) {
  return sendResponse(res, 200, true, message, data, meta);
}

export function sendCreated(res: Response, message: string, data: any = null) {
  return sendResponse(res, 201, true, message, data);
}

export function sendError(res: Response, statusCode: number, message: string, data: any = null) {
  return sendResponse(res, statusCode, false, message, data);
}

// Shorthand helpers
export function success(res: Response, data: any, statusCode: number = 200) {
  return sendResponse(res, statusCode, true, 'OK', data);
}

export function error(res: Response, message: string, statusCode: number = 500) {
  return sendResponse(res, statusCode, false, message);
}
