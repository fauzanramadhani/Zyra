"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSprints = listSprints;
exports.createSprint = createSprint;
exports.updateSprint = updateSprint;
exports.completeSprint = completeSprint;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
async function listSprints(req, res) {
    const { projectId } = req.params;
    try {
        const sprints = await db_1.default.sprint.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            include: {
                issues: {
                    where: { deletedAt: null },
                },
            },
        });
        return (0, response_1.sendSuccess)(res, 'Sprints loaded', sprints);
    }
    catch (error) {
        console.error('List sprints error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to load sprints');
    }
}
async function createSprint(req, res) {
    const { projectId } = req.params;
    const { name, goal, startDate, endDate } = req.body;
    if (!name) {
        return (0, response_1.sendError)(res, 400, 'Sprint name is required');
    }
    try {
        const sprint = await db_1.default.sprint.create({
            data: {
                name,
                goal,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                projectId,
            },
        });
        return (0, response_1.sendCreated)(res, 'Sprint created successfully', sprint);
    }
    catch (error) {
        console.error('Create sprint error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to create sprint');
    }
}
async function updateSprint(req, res) {
    const { sprintId } = req.params;
    const { name, goal, startDate, endDate, status } = req.body;
    try {
        const sprint = await db_1.default.sprint.update({
            where: { id: sprintId },
            data: {
                name,
                goal,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined,
                status,
            },
        });
        return (0, response_1.sendSuccess)(res, 'Sprint updated successfully', sprint);
    }
    catch (error) {
        console.error('Update sprint error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to update sprint');
    }
}
async function completeSprint(req, res) {
    const { sprintId } = req.params;
    const { targetSprintId } = req.body; // Unfinished tickets go here, if null they go to backlog (sprintId = null)
    try {
        const sprint = await db_1.default.sprint.findUnique({
            where: { id: sprintId },
            include: {
                project: {
                    include: {
                        boards: {
                            include: {
                                columns: true,
                            },
                        },
                    },
                },
            },
        });
        if (!sprint)
            return (0, response_1.sendError)(res, 404, 'Sprint not found');
        // Find the 'Done' status column
        const defaultBoard = sprint.project.boards[0];
        const doneColumn = defaultBoard?.columns.find((col) => col.name.toLowerCase() === 'done');
        if (!doneColumn) {
            return (0, response_1.sendError)(res, 500, "Done column not defined on this project's board");
        }
        // Identify unfinished issues
        const unfinishedIssues = await db_1.default.issue.findMany({
            where: {
                sprintId,
                statusId: { not: doneColumn.id },
                deletedAt: null,
            },
        });
        await db_1.default.$transaction(async (tx) => {
            // 1. Move unfinished issues
            if (unfinishedIssues.length > 0) {
                const issueIds = unfinishedIssues.map((i) => i.id);
                await tx.issue.updateMany({
                    where: { id: { in: issueIds } },
                    data: { sprintId: targetSprintId || null },
                });
            }
            // 2. Mark sprint as completed
            await tx.sprint.update({
                where: { id: sprintId },
                data: { status: 'COMPLETED' },
            });
        });
        return (0, response_1.sendSuccess)(res, 'Sprint completed successfully', {
            completedSprintId: sprintId,
            movedIssuesCount: unfinishedIssues.length,
        });
    }
    catch (error) {
        console.error('Complete sprint error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to complete sprint');
    }
}
