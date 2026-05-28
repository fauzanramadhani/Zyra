"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProjectAnalytics = getProjectAnalytics;
const db_1 = __importDefault(require("../db"));
const response_1 = require("../utils/response");
async function getProjectAnalytics(req, res) {
    const { projectId } = req.params;
    try {
        // 1. Fetch all issues in the project
        const issues = await db_1.default.issue.findMany({
            where: { projectId, deletedAt: null },
            include: { status: true, assignee: true },
        });
        // 2. Compute status distribution
        const statusCounts = {};
        // 3. Compute priority distribution
        const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, HIGHEST: 0 };
        // 4. Compute type distribution
        const typeCounts = { STORY: 0, TASK: 0, BUG: 0, EPIC: 0 };
        // 5. Compute workload distribution per assignee
        const assigneeWorkload = {};
        let totalIssues = issues.length;
        let completedIssues = 0;
        let totalStoryPoints = 0;
        let completedStoryPoints = 0;
        issues.forEach((issue) => {
            // Status
            const statusName = issue.status.name;
            statusCounts[statusName] = (statusCounts[statusName] || 0) + 1;
            const isDone = statusName.toLowerCase() === 'done';
            if (isDone)
                completedIssues++;
            // Story points
            const points = issue.storyPoints || 0;
            totalStoryPoints += points;
            if (isDone)
                completedStoryPoints += points;
            // Priority
            priorityCounts[issue.priority] = (priorityCounts[issue.priority] || 0) + 1;
            // Type
            typeCounts[issue.type] = (typeCounts[issue.type] || 0) + 1;
            // Assignee workload
            const assigneeName = issue.assignee
                ? `${issue.assignee.firstName} ${issue.assignee.lastName}`
                : 'Unassigned';
            const assigneeId = issue.assigneeId || 'unassigned';
            if (!assigneeWorkload[assigneeId]) {
                assigneeWorkload[assigneeId] = { name: assigneeName, count: 0, points: 0 };
            }
            assigneeWorkload[assigneeId].count += 1;
            assigneeWorkload[assigneeId].points += points;
        });
        // 6. Fetch sprint stats
        const sprints = await db_1.default.sprint.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            take: 5,
        });
        const analyticsData = {
            summary: {
                totalIssues,
                completedIssues,
                completionRate: totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0,
                totalStoryPoints,
                completedStoryPoints,
            },
            statusDistribution: Object.entries(statusCounts).map(([status, count]) => ({ status, count })),
            priorityDistribution: Object.entries(priorityCounts).map(([priority, count]) => ({ priority, count })),
            typeDistribution: Object.entries(typeCounts).map(([type, count]) => ({ type, count })),
            assigneeWorkload: Object.values(assigneeWorkload),
            recentSprints: sprints.map((s) => ({
                id: s.id,
                name: s.name,
                status: s.status,
                startDate: s.startDate,
                endDate: s.endDate,
            })),
        };
        return (0, response_1.sendSuccess)(res, 'Project analytics loaded successfully', analyticsData);
    }
    catch (error) {
        console.error('Get project analytics error:', error);
        return (0, response_1.sendError)(res, 500, 'Failed to compute project metrics');
    }
}
