"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanColumnName = cleanColumnName;
exports.suggestFieldMapping = suggestFieldMapping;
function cleanColumnName(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}
function suggestFieldMapping(header) {
    const cleaned = cleanColumnName(header);
    // Hard alias lists
    const mappings = {
        issueKey: ['issuekey', 'key', 'jirakey', 'ticketkey'],
        summary: ['summary', 'title', 'subject', 'name'],
        description: ['description', 'details', 'content'],
        status: ['status', 'workflowstatus', 'currentstatus'],
        priority: ['priority', 'severity', 'level'],
        assignee: ['assignee', 'assignedto', 'owner'],
        labels: ['labels', 'tags', 'categories'],
        storyPoints: ['storypoints', 'sp', 'points'],
        type: ['issuetype', 'type', 'tickettype', 'kind'],
    };
    // 1. Direct alias check
    for (const [field, aliases] of Object.entries(mappings)) {
        if (aliases.includes(cleaned)) {
            return field;
        }
    }
    return null; // Suggests treating as Custom Field
}
