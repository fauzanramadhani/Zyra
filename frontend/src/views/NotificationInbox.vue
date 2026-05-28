<template>
  <div class="min-h-screen bg-slate-50 py-6 md:py-10 px-4 md:px-6 font-sans">
    <div class="max-w-4xl mx-auto space-y-6 md:space-y-8">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-6 border-b border-slate-200">
        <div>
          <router-link to="/workspace" class="text-sm font-semibold text-orange-500 hover:underline flex items-center gap-1">
            <span class="text-xs">&larr;</span> Back to Workspace
          </router-link>
          <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">Notification Center</h1>
          <p class="text-sm text-slate-500 mt-1">Review active updates, task assignments, and workspace invitations.</p>
        </div>
        <div class="flex items-center gap-3">
          <button @click="markAllAsRead" class="text-sm font-semibold text-slate-600 hover:text-slate-800 hover:underline">
            Mark all as read
          </button>
          <button @click="fetchNotifications(false)" class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition">
            Refresh
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="flex items-center justify-between border-b border-slate-200 pb-2">
        <div class="flex gap-4">
          <button @click="filter = 'all'" class="pb-2 text-sm font-bold border-b-2 transition" :class="filter === 'all' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-400 hover:text-slate-600'">
            All Updates
          </button>
          <button @click="filter = 'unread'" class="pb-2 text-sm font-bold border-b-2 transition" :class="filter === 'unread' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-400 hover:text-slate-600'">
            Unread ({{ unreadCount }})
          </button>
        </div>
      </div>

      <!-- Live User Invitations Inbox (Separate GitHub Style Segment) -->
      <div v-if="userInvitations.length > 0" class="space-y-4">
        <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
          <span>📨</span> Pending Organization & Workspace Invites
        </h2>
        <div class="grid grid-cols-1 gap-4">
          <div v-for="inv in userInvitations" :key="inv.id" class="p-5 bg-white border border-orange-200 rounded-xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse-subtle">
            <div class="space-y-1">
              <p class="text-sm font-extrabold text-slate-800">
                {{ inv.sender?.firstName }} {{ inv.sender?.lastName }} invited you to join workspace
                <span class="text-orange-600">"{{ inv.workspace?.name }}"</span>
              </p>
              <p class="text-xs text-slate-500">Role: {{ inv.role }} &bull; Expires: {{ formatDate(inv.expiresAt) }}</p>
            </div>
            <div class="flex items-center gap-3">
              <button @click="acceptInvite(inv.id)" :disabled="actioningInvite === inv.id" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-xs font-bold hover:bg-orange-600 transition shadow-sm disabled:opacity-50">
                {{ actioningInvite === inv.id ? 'Accepting...' : 'Accept Invite' }}
              </button>
              <button @click="rejectInvite(inv.id)" :disabled="actioningInvite === inv.id" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition disabled:opacity-50">
                Decline
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Notifications List -->
      <div v-if="filteredNotifications.length === 0" class="bg-white rounded-xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center space-y-3">
        <span class="text-5xl">🔔</span>
        <h3 class="text-lg font-bold text-slate-700">Inbox is Clean</h3>
        <p class="text-sm text-slate-400 max-w-sm">No new notifications here. Nice work!</p>
      </div>

      <div v-else class="space-y-4">
        <div class="divide-y divide-slate-150 border border-slate-200 bg-white rounded-xl overflow-hidden shadow-sm">
          <div
            v-for="notif in filteredNotifications"
            :key="notif.id"
            class="p-5 flex items-start justify-between gap-4 transition"
            :class="notif.read ? 'bg-white opacity-70' : 'bg-orange-50/10 border-l-4 border-orange-500'"
          >
            <div class="flex items-start gap-3">
              <span class="text-xl mt-0.5">{{ getTypeIcon(notif.type) }}</span>
              <div class="space-y-1">
                <p class="text-sm font-bold text-slate-800" :class="notif.read ? 'font-semibold' : 'font-extrabold'">
                  {{ notif.title }}
                </p>
                <p class="text-sm text-slate-600">{{ notif.message }}</p>
                <p class="text-[10px] text-slate-400 mt-1">{{ formatDate(notif.createdAt) }}</p>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-shrink-0">
              <button v-if="!notif.read" @click="markAsRead(notif.id)" class="text-xs font-bold text-orange-500 hover:underline">
                Mark Read
              </button>
              <button @click="deleteNotification(notif.id)" class="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 transition" title="Delete notification">
                &times;
              </button>
            </div>
          </div>
        </div>

        <!-- Load More -->
        <div v-if="hasMore" class="flex justify-center pt-4">
          <button @click="loadMore" :disabled="loading" class="px-5 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition disabled:opacity-50">
            {{ loading ? 'Loading...' : 'Load Older Notifications' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useNotificationStore } from '../store/notification';
import { useInvitationStore } from '../store/invitation';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'NotificationInbox',
  setup() {
    const notificationStore = useNotificationStore();
    const toast = useToastStore();
    const inviteStore = useInvitationStore();

    const filter = ref('all');
    const actioningInvite = ref('');

    const notifications = computed(() => notificationStore.notifications);
    const unreadCount = computed(() => notificationStore.unreadCount);
    const hasMore = computed(() => notificationStore.hasMore);
    const loading = computed(() => notificationStore.loading);
    const userInvitations = computed(() => inviteStore.userInvitations);

    const filteredNotifications = computed(() => {
      if (filter.value === 'unread') {
        return notifications.value.filter((n) => !n.read);
      }
      return notifications.value;
    });

    const fetchNotifications = async (loadMore = false) => {
      await notificationStore.fetchNotifications(loadMore);
    };

    onMounted(() => {
      fetchNotifications(false);
      inviteStore.fetchUserInvitations();
      inviteStore.setupSocketListener();
      notificationStore.setupSocketListener();
    });

    const loadMore = () => {
      fetchNotifications(true);
    };

    const markAsRead = async (id: string) => {
      await notificationStore.markAsRead(id);
    };

    const markAllAsRead = async () => {
      await notificationStore.markAllAsRead();
    };

    const deleteNotification = async (id: string) => {
      await notificationStore.deleteNotification(id);
    };

    const acceptInvite = async (id: string) => {
      actioningInvite.value = id;
      try {
        const success = await inviteStore.acceptInvitation(id);
        if (success) {
          toast.success('Successfully accepted invitation! You joined the workspace.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to accept invitation');
      } finally {
        actioningInvite.value = '';
      }
    };

    const rejectInvite = async (id: string) => {
      actioningInvite.value = id;
      try {
        const success = await inviteStore.rejectInvitation(id);
        if (success) {
          toast.info('Invitation declined.');
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to reject invitation');
      } finally {
        actioningInvite.value = '';
      }
    };

    const getTypeIcon = (type: string) => {
      switch (type.toUpperCase()) {
        case 'INVITATION':
          return '📨';
        case 'ASSIGNMENT':
          return '👤';
        case 'COMMENT':
          return '💬';
        case 'MENTION':
          return '📣';
        case 'ROLE_CHANGE':
          return '🔑';
        default:
          return '🔔';
      }
    };

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleString();
    };

    return {
      filter,
      actioningInvite,
      unreadCount,
      hasMore,
      loading,
      filteredNotifications,
      userInvitations,
      fetchNotifications,
      loadMore,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      acceptInvite,
      rejectInvite,
      getTypeIcon,
      formatDate
    };
  }
});
</script>

<style scoped>
.animate-pulse-subtle {
  animation: pulse-subtle 3s infinite ease-in-out;
}
@keyframes pulse-subtle {
  0%, 100% { border-color: rgba(249, 115, 22, 0.2); }
  50% { border-color: rgba(249, 115, 22, 0.6); }
}
</style>
