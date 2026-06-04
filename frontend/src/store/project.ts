import { defineStore } from 'pinia';
import api from '../services/api';
import { joinProject, leaveProject } from '../services/socket';

export interface ProjectMember {
  id: string;
  role: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export interface Project {
  id: string;
  name: string;
  key: string;
  description?: string;
  leadId: string;
  boards: any[];
  members?: ProjectMember[];
}

export interface BoardColumn {
  id: string;
  name: string;
  position: number;
  issues: any[];
}

export interface Board {
  id: string;
  name: string;
  type: string;
  columns: BoardColumn[];
}

export interface Sprint {
  id: string;
  name: string;
  goal?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  issues: any[];
}

/** Sort a column's issues by fractional order ascending */
function sortByOrder(issues: any[]): any[] {
  return [...issues].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export const useProjectStore = defineStore('project', {
  state: () => ({
    projects: [] as Project[],
    currentProject: null as Project | null,
    currentBoard: null as Board | null,
    sprints: [] as Sprint[],
    loading: false,
    // Snapshot used for optimistic rollback on failed move
    _columnsSnapshot: null as BoardColumn[] | null,
    // Track issues currently being moved locally to skip own socket echoes
    _pendingMoveIds: new Set<string>(),
  }),
  actions: {
    async fetchProjects(workspaceId: string) {
      this.loading = true;
      try {
        const response = await api.get('/projects', { params: { workspaceId } });
        if (response.data.success) {
          this.projects = response.data.data;
        }
      } catch (error) {
        console.error('Fetch projects failed:', error);
      } finally {
        this.loading = false;
      }
    },

    async createProject(projectData: { name: string; key: string; description?: string; workspaceId: string }) {
      try {
        const response = await api.post('/projects', projectData);
        if (response.data.success) {
          const newProj = response.data.data;
          this.projects.push(newProj);
          return newProj;
        }
      } catch (error: any) {
        const msg = error.response?.data?.message || 'Failed to create project';
        throw new Error(msg);
      }
    },

    async fetchProjectDetails(projectId: string) {
      try {
        const response = await api.get(`/projects/${projectId}`);
        if (response.data.success) {
          const prevProject = this.currentProject;
          if (prevProject) leaveProject(prevProject.id);
          this.currentProject = response.data.data;
          joinProject(projectId);
        }
      } catch (error) {
        console.error('Fetch project details failed:', error);
      }
    },

    async fetchBoard(boardId: string, sprintId?: string) {
      try {
        const params: any = {};
        if (sprintId) params.sprintId = sprintId;

        const response = await api.get(`/boards/${boardId}`, { params });
        if (response.data.success) {
          const board = response.data.data;
          // Ensure all columns' issues are sorted by order
          if (board?.columns) {
            board.columns.forEach((col: BoardColumn) => {
              col.issues = sortByOrder(col.issues);
            });
          }
          this.currentBoard = board;
        }
      } catch (error) {
        console.error('Fetch board failed:', error);
      }
    },

    /** Take a deep snapshot of columns for rollback on API failure */
    snapshotColumns() {
      if (!this.currentBoard) return;
      this._columnsSnapshot = JSON.parse(JSON.stringify(this.currentBoard.columns));
    },

    /** Restore columns from the last snapshot (on API failure) */
    rollbackColumns() {
      if (!this.currentBoard || !this._columnsSnapshot) return;
      this.currentBoard.columns = this._columnsSnapshot;
      this._columnsSnapshot = null;
    },

    /**
     * Move an issue to a new column at a precise position.
     * afterIssueId  = the card immediately ABOVE the drop point
     * beforeIssueId = the card immediately BELOW the drop point
     */
    async moveIssueStatus(
      issueId: string,
      fromStatusId: string,
      toStatusId: string,
      beforeIssueId?: string | null,
      afterIssueId?: string | null,
    ) {
      if (!this.currentBoard) return;

      const messageId = `${issueId}-${Date.now()}`;
      // Mark this messageId as pending local move
      this._pendingMoveIds.add(messageId);

      try {
        // Call backend with full positional context
        await api.put(`/issues/${issueId}/move`, {
          statusId: toStatusId,
          beforeIssueId: beforeIssueId || null,
          afterIssueId: afterIssueId || null,
          messageId,
        });
        // Snapshot no longer needed after success
        this._columnsSnapshot = null;
      } catch (error) {
        console.error('Move failed, rolling back optimistic update...', error);
        this.rollbackColumns();
        this._pendingMoveIds.delete(messageId);
        return;
      }
    },

    async fetchSprints(projectId: string) {
      try {
        const response = await api.get(`/projects/${projectId}/sprints`);
        if (response.data.success) {
          this.sprints = response.data.data;
        }
      } catch (error) {
        console.error('Fetch sprints failed:', error);
      }
    },

    async createSprint(projectId: string, name: string, goal?: string) {
      try {
        const response = await api.post(`/projects/${projectId}/sprints`, { name, goal });
        if (response.data.success) {
          this.sprints.unshift(response.data.data);
        }
      } catch (error) {
        console.error('Create sprint failed:', error);
      }
    },

    async deleteIssue(issueId: string) {
      try {
        const response = await api.delete(`/issues/${issueId}`);
        if (response.data.success) {
          this.handleSocketIssueDeleted({ issueId });
          return true;
        }
      } catch (err) {
        console.error('Failed to delete issue:', err);
      }
      return false;
    },

    async archiveIssue(issueId: string) {
      try {
        const response = await api.post('/trash/archive', { type: 'issue', id: issueId });
        if (response.data.success) {
          this.handleSocketIssueDeleted({ issueId });
          return true;
        }
      } catch (err) {
        console.error('Failed to archive issue:', err);
      }
      return false;
    },

    // ── Socket Event Handlers ──────────────────────────────────────────────────

    handleSocketBoardUpdate(payload: {
      issueId: string;
      fromStatusId: string;
      toStatusId: string;
      issue: any;
      messageId?: string;
    }) {
      if (!this.currentBoard) return;
      const { issueId, fromStatusId, toStatusId, issue, messageId } = payload;

      // Skip socket echo for moves we initiated (optimistic update already applied)
      if (messageId && this._pendingMoveIds.has(messageId)) {
        this._pendingMoveIds.delete(messageId);
        return;
      }

      const sourceCol = this.currentBoard.columns.find((c) => c.id === fromStatusId);
      const destCol = this.currentBoard.columns.find((c) => c.id === toStatusId);

      if (sourceCol) {
        const idx = sourceCol.issues.findIndex((i) => i.id === issueId);
        if (idx !== -1) sourceCol.issues.splice(idx, 1);
      }

      if (destCol) {
        const idx = destCol.issues.findIndex((i) => i.id === issueId);
        if (idx === -1) {
          destCol.issues.push(issue);
        } else {
          destCol.issues[idx] = issue;
        }
        // Re-sort by fractional order
        destCol.issues = sortByOrder(destCol.issues);
      }
    },

    handleSocketIssueCreated(issue: any) {
      if (!this.currentBoard) return;
      const column = this.currentBoard.columns.find((c) => c.id === issue.statusId);
      if (column) {
        const exists = column.issues.some((i) => i.id === issue.id);
        if (!exists) {
          column.issues.push(issue);
          column.issues = sortByOrder(column.issues);
        }
      }
    },

    handleSocketIssueUpdated(issue: any) {
      if (!this.currentBoard) return;
      for (const col of this.currentBoard.columns) {
        const idx = col.issues.findIndex((i) => i.id === issue.id);
        if (idx !== -1) {
          col.issues[idx] = { ...col.issues[idx], ...issue };
          col.issues = sortByOrder(col.issues);
          break;
        }
      }
    },

    handleSocketIssueDeleted(payload: { issueId: string }) {
      if (!this.currentBoard) return;
      for (const col of this.currentBoard.columns) {
        const idx = col.issues.findIndex((i) => i.id === payload.issueId);
        if (idx !== -1) {
          col.issues.splice(idx, 1);
          break;
        }
      }
    },
  },
});
