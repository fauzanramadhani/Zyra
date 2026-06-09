import { defineStore } from 'pinia';
import api from '../services/api';
import { socket } from '../services/socket';
import { useAuthStore } from './auth';

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  invitedEmail: string;
  invitedBy: string;
  role: string;
  status: string;
  expiresAt: string;
  workspace?: {
    id: string;
    name: string;
    slug: string;
  };
  sender?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
}

export const useInvitationStore = defineStore('invitation', {
  state: () => ({
    invitations: [] as WorkspaceInvitation[],
    userInvitations: [] as WorkspaceInvitation[],
    loading: false
  }),
  actions: {
    async fetchWorkspaceInvitations(workspaceId: string) {
      this.loading = true;
      try {
        const response = await api.get(`/workspaces/${workspaceId}/invitations`);
        if (response.data.success) {
          this.invitations = response.data.data;
        }
      } catch (error) {
        console.error('Failed to load workspace invitations:', error);
      } finally {
        this.loading = false;
      }
    },

    async fetchUserInvitations() {
      this.loading = true;
      try {
        const response = await api.get('/invitations/user');
        if (response.data.success) {
          this.userInvitations = response.data.data;
        }
      } catch (error) {
        console.error('Failed to load user invitations:', error);
      } finally {
        this.loading = false;
      }
    },

    async createInvitation(workspaceId: string, email: string, role: string, allowedProjectIds?: string[]) {
      this.loading = true;
      try {
        const response = await api.post('/invitations', { workspaceId, email, role, allowedProjectIds });
        if (response.data.success) {
          this.invitations = [response.data.data, ...this.invitations];
          return true;
        }
      } catch (error: any) {
        const msg = error.response?.data?.message || 'Failed to send invitation';
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
      return false;
    },

    async acceptInvitation(id: string) {
      this.loading = true;
      try {
        const response = await api.post(`/invitations/${id}/accept`);
        if (response.data.success) {
          this.userInvitations = this.userInvitations.filter((i) => i.id !== id);
          
          // Re-fetch user session to load newly joined workspace
          const authStore = useAuthStore();
          await authStore.fetchMe();
          return true;
        }
      } catch (error: any) {
        const msg = error.response?.data?.message || 'Failed to accept invitation';
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
      return false;
    },

    async rejectInvitation(id: string) {
      this.loading = true;
      try {
        const response = await api.post(`/invitations/${id}/reject`);
        if (response.data.success) {
          this.userInvitations = this.userInvitations.filter((i) => i.id !== id);
          return true;
        }
      } catch (error: any) {
        const msg = error.response?.data?.message || 'Failed to reject invitation';
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
      return false;
    },

    async cancelInvitation(id: string) {
      this.loading = true;
      try {
        const response = await api.delete(`/invitations/${id}`);
        if (response.data.success) {
          this.invitations = this.invitations.filter((i) => i.id !== id);
          return true;
        }
      } catch (error: any) {
        const msg = error.response?.data?.message || 'Failed to cancel invitation';
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
      return false;
    },

    setupSocketListener() {
      socket.off('invitation:received');
      socket.off('invitation:accepted');
      socket.off('invitation:rejected');

      socket.on('invitation:received', () => {
        this.fetchUserInvitations();
      });

      socket.on('invitation:accepted', (data: any) => {
        // If workspace manager has this workspace open, update invitation list state
        const authStore = useAuthStore();
        if (authStore.currentWorkspace) {
          this.fetchWorkspaceInvitations(authStore.currentWorkspace.id);
        }
      });

      socket.on('invitation:rejected', (data: any) => {
        const authStore = useAuthStore();
        if (authStore.currentWorkspace) {
          this.fetchWorkspaceInvitations(authStore.currentWorkspace.id);
        }
      });
    }
  }
});
