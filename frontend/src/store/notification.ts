import { defineStore } from 'pinia';
import api from '../services/api';
import { socket } from '../services/socket';

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link?: string | null;
  read: boolean;
  type: string;
  senderId?: string | null;
  createdAt: string;
}

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    notifications: [] as Notification[],
    unreadCount: 0,
    loading: false,
    page: 1,
    hasMore: true,
  }),
  actions: {
    async fetchNotifications(loadMore = false) {
      if (this.loading) return;
      if (!loadMore) {
        this.page = 1;
        this.hasMore = true;
        this.notifications = [];
      } else if (!this.hasMore) {
        return;
      }

      this.loading = true;
      try {
        const response = await api.get('/notifications', {
          params: { page: this.page, limit: 15 }
        });
        if (response.data.success) {
          const { notifications, unreadCount } = response.data.data;
          
          if (loadMore) {
            this.notifications = [...this.notifications, ...notifications];
          } else {
            this.notifications = notifications;
          }

          this.unreadCount = unreadCount;
          this.hasMore = notifications.length === 15;
          if (this.hasMore) this.page++;
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        this.loading = false;
      }
    },

    async markAsRead(id: string) {
      try {
        const response = await api.patch(`/notifications/${id}/read`);
        if (response.data.success) {
          const notif = this.notifications.find((n) => n.id === id);
          if (notif && !notif.read) {
            notif.read = true;
            this.unreadCount = Math.max(0, this.unreadCount - 1);
          }
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },

    async markAllAsRead() {
      try {
        const response = await api.patch('/notifications/read-all');
        if (response.data.success) {
          this.notifications.forEach((n) => (n.read = true));
          this.unreadCount = 0;
        }
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    },

    async deleteNotification(id: string) {
      try {
        const response = await api.delete(`/notifications/${id}`);
        if (response.data.success) {
          const notif = this.notifications.find((n) => n.id === id);
          if (notif && !notif.read) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
          }
          this.notifications = this.notifications.filter((n) => n.id !== id);
        }
      } catch (error) {
        console.error('Failed to delete notification:', error);
      }
    },

    setupSocketListener() {
      socket.off('notification:new'); // prevent duplicates
      socket.on('notification:new', (notif: Notification) => {
        this.notifications = [notif, ...this.notifications];
        this.unreadCount++;
      });
    }
  }
});
