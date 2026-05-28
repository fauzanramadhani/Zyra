"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendResponse = sendResponse;
exports.sendSuccess = sendSuccess;
exports.sendCreated = sendCreated;
exports.sendError = sendError;
function sendResponse(res, statusCode, success, message, data = null, meta = null) {
    const responsePayload = {
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
function sendSuccess(res, message, data = null, meta = null) {
    return sendResponse(res, 200, true, message, data, meta);
}
function sendCreated(res, message, data = null) {
    return sendResponse(res, 201, true, message, data);
}
function sendError(res, statusCode, message, data = null) {
    return sendResponse(res, statusCode, false, message, data);
}
