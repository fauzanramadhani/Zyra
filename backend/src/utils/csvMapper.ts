export function cleanColumnName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function suggestFieldMapping(header: string): string | null {
  const cleaned = cleanColumnName(header);

  // Hard alias lists
  const mappings: { [key: string]: string[] } = {
    issueKey: ['issuekey', 'key', 'jirakey', 'ticketkey'],
    summary: ['summary', 'title', 'subject', 'name'],
    description: ['description', 'details', 'content'],
    status: ['status', 'workflowstatus', 'currentstatus'],
    priority: ['priority', 'severity', 'level'],
    assignee: ['assignee', 'assignedto', 'owner'],
    labels: ['labels', 'tags', 'categories'],
    storyPoints: ['storypoints', 'sp', 'points'],
    type: ['issuetype', 'type', 'tickettype', 'kind'],
    parentKey: ['parentkey', 'parent', 'epiclink', 'parentid'],
    sprint: ['sprint', 'sprintname', 'sprintid'],
    dueDate: ['duedate', 'due', 'deadlinetime', 'deadline'],
  };

  // 1. Direct alias check
  for (const [field, aliases] of Object.entries(mappings)) {
    if (aliases.includes(cleaned)) {
      return field;
    }
  }

  return null; // Suggests treating as Custom Field
}
