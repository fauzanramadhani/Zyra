import { defineStore } from 'pinia';
import api from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  username?: string;
  bio?: string;
  timezone?: string;
  language?: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  avatarUrl?: string;
  role: string;
}

export interface Session {
  id: string;
  deviceInfo: string;
  ipAddress: string;
  createdAt: string;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    workspaces: [] as Workspace[],
    currentWorkspace: null as Workspace | null,
    sessions: [] as Session[],
    loading: false,
  }),
  getters: {
    isAuthenticated: (state) => !!state.user,
  },
  actions: {
    async fetchMe() {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) return false;

      this.loading = true;
      try {
        const response = await api.get('/auth/me');
        if (response.data.success) {
          const { user, workspaces } = response.data.data;
          this.user = user;
          this.workspaces = workspaces;

          // Connect WebSockets on active user details load
          connectSocket(user.id);

          // Restore last selected workspace
          const cachedWorkspaceId = localStorage.getItem('currentWorkspaceId');
          if (cachedWorkspaceId) {
            const found = workspaces.find((w: Workspace) => w.id === cachedWorkspaceId);
            this.currentWorkspace = found || workspaces[0] || null;
          } else {
            this.currentWorkspace = workspaces[0] || null;
          }

          if (this.currentWorkspace) {
            localStorage.setItem('currentWorkspaceId', this.currentWorkspace.id);
          }

          return true;
        }
      } catch (err) {
        this.logout();
        return false;
      } finally {
        this.loading = false;
      }
      return false;
    },

    async login(credentials: { email: string; password: string }) {
      this.loading = true;
      try {
        const response = await api.post('/auth/login', credentials);
        if (response.data.success) {
          const { accessToken, refreshToken, user } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          this.user = user;
          await this.fetchMe();
          return true;
        }
      } catch (error: any) {
        const msg = error.response?.data?.message || 'Login failed';
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
      return false;
    },

    async register(userData: { email: string; password: string; firstName: string; lastName: string }) {
      this.loading = true;
      try {
        const response = await api.post('/auth/register', userData);
        if (response.data.success) {
          const { accessToken, refreshToken, user } = response.data.data;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);

          this.user = user;
          await this.fetchMe();
          return true;
        }
      } catch (error: any) {
        const msg = error.response?.data?.message || 'Registration failed';
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
      return false;
    },

    logout() {
      this.user = null;
      this.workspaces = [];
      this.currentWorkspace = null;
      this.sessions = [];
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentWorkspaceId');
      disconnectSocket();
    },

    selectWorkspace(workspace: Workspace) {
      this.currentWorkspace = workspace;
      localStorage.setItem('currentWorkspaceId', workspace.id);
    },

    async updateProfile(profileData: any) {
      this.loading = true;
      try {
        // Can be a FormData for avatar files or raw JSON
        const isFormData = profileData instanceof FormData;
        const response = await api.patch('/account/profile', profileData, {
          headers: {
            'Content-Type': isFormData ? 'multipart/form-data' : 'application/json'
          }
        });
        if (response.data.success) {
          this.user = response.data.data;
          return true;
        }
      } catch (error: any) {
        const msg = error.response?.data?.message || 'Failed to update profile';
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
      return false;
    },

    async changePassword(passwordData: any) {
      this.loading = true;
      try {
        const response = await api.patch('/account/password', passwordData);
        return response.data.success;
      } catch (error: any) {
        const msg = error.response?.data?.message || 'Failed to change password';
        throw new Error(msg);
      } finally {
        this.loading = false;
      }
    },

    async fetchSessions() {
      try {
        const response = await api.get('/account/sessions');
        if (response.data.success) {
          this.sessions = response.data.data;
        }
      } catch (error) {
        console.error('Failed to load active sessions:', error);
      }
    },

    async revokeSession(sessionId: string) {
      try {
        const response = await api.delete(`/account/sessions/${sessionId}`);
        if (response.data.success) {
          this.sessions = this.sessions.filter((s) => s.id !== sessionId);
          return true;
        }
      } catch (error) {
        console.error('Failed to revoke session:', error);
      }
      return false;
    }
  },
});
