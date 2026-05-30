<template>
  <div class="flex-grow p-3 sm:p-4 md:p-6 flex flex-col h-screen overflow-hidden text-[#172B4D] dark:text-slate-200">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 md:pb-6 border-b border-slate-200 dark:border-zyra-gray-darkBorder">
      <div>
        <h1 class="text-xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Trash &amp; Recycle Bin</h1>
        <p class="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">Review and restore soft-deleted or archived issues, boards, sprints, and comments inside this workspace.</p>
      </div>
      <button @click="fetchTrash" class="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs md:text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition flex-shrink-0">
        Refresh
      </button>
    </div>

    <div class="flex-grow overflow-y-auto space-y-6 md:space-y-8 pb-4">
    <div v-if="isEmpty" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-sm p-12 text-center flex flex-col items-center justify-center space-y-3">
      <span class="text-5xl">🗑️</span>
      <h3 class="text-lg font-bold text-slate-700">Trash Bin is Empty</h3>
      <p class="text-sm text-slate-400 max-w-sm">Items that are soft-deleted or archived within this workspace will show up here for 30 days before permanent deletion.</p>
    </div>

    <!-- Items Lists -->
    <div v-else class="space-y-8">
      <!-- Deleted/Archived Issues List -->
      <div v-if="issues.length > 0" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-zyra-gray-darkBorder bg-slate-50/50 dark:bg-slate-800/50">
          <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider">Soft-Deleted & Archived Issues</h2>
        </div>
        <div class="divide-y divide-slate-150">
          <div v-for="iss in issues" :key="iss.id" class="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">{{ iss.key }}</span>
                <span class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ iss.summary }}</span>
              </div>
              <p class="text-xs text-slate-400 mt-1">
                Project: {{ iss.project?.name }} &bull; 
                Status: {{ iss.archivedAt ? 'Archived' : 'Deleted' }}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button @click="restoreItem('issue', iss.id)" class="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-bold transition">
                Restore
              </button>
              <button @click="purgeItem('issue', iss.id)" class="text-xs font-bold text-red-500 hover:underline">
                Purge
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Deleted/Archived Sprints -->
      <div v-if="sprints.length > 0" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-zyra-gray-darkBorder bg-slate-50/50 dark:bg-slate-800/50">
          <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider">Soft-Deleted & Archived Sprints</h2>
        </div>
        <div class="divide-y divide-slate-150">
          <div v-for="spr in sprints" :key="spr.id" class="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            <div>
              <p class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ spr.name }}</p>
              <p class="text-xs text-slate-400 mt-1">Project: {{ spr.project?.name }} &bull; Goal: {{ spr.goal || 'None' }}</p>
            </div>
            <div class="flex items-center gap-3">
              <button @click="restoreItem('sprint', spr.id)" class="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-bold transition">
                Restore
              </button>
              <button @click="purgeItem('sprint', spr.id)" class="text-xs font-bold text-red-500 hover:underline">
                Purge
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Deleted/Archived Boards -->
      <div v-if="boards.length > 0" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-zyra-gray-darkBorder bg-slate-50/50 dark:bg-slate-800/50">
          <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider">Soft-Deleted & Archived Boards</h2>
        </div>
        <div class="divide-y divide-slate-150">
          <div v-for="bd in boards" :key="bd.id" class="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            <div>
              <p class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ bd.name }}</p>
              <p class="text-xs text-slate-400 mt-1">Project: {{ bd.project?.name }} &bull; Type: {{ bd.type }}</p>
            </div>
            <div class="flex items-center gap-3">
              <button @click="restoreItem('board', bd.id)" class="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-bold transition">
                Restore
              </button>
              <button @click="purgeItem('board', bd.id)" class="text-xs font-bold text-red-500 hover:underline">
                Purge
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Deleted/Archived Comments -->
      <div v-if="comments.length > 0" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-sm overflow-hidden">
        <div class="p-4 border-b border-slate-200 dark:border-zyra-gray-darkBorder bg-slate-50/50 dark:bg-slate-800/50">
          <h2 class="text-sm font-bold text-slate-700 uppercase tracking-wider">Soft-Deleted & Archived Comments</h2>
        </div>
        <div class="divide-y divide-slate-150">
          <div v-for="c in comments" :key="c.id" class="p-3 md:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            <div>
              <p class="text-sm text-slate-700 line-clamp-2">{{ c.body }}</p>
              <p class="text-xs text-slate-400 mt-1">Issue Context ID: {{ c.issueId }}</p>
            </div>
            <div class="flex items-center gap-3">
              <button @click="restoreItem('comment', c.id)" class="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-bold transition">
                Restore
              </button>
              <button @click="purgeItem('comment', c.id)" class="text-xs font-bold text-red-500 hover:underline">
                Purge
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>

    <AppConfirmDialog
      v-model="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      variant="danger"
      confirm-text="Delete Permanently"
      @confirm="onConfirm"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../store/auth';
import { useToastStore } from '../store/toast';
import AppConfirmDialog from '../components/ui/AppConfirmDialog.vue';
import api from '../services/api';

export default defineComponent({
  name: 'TrashBin',
  components: { AppConfirmDialog },
  setup() {
    const authStore = useAuthStore();
    const toast = useToastStore();
    const loading = ref(false);

    const projects = ref<any[]>([]);
    const issues = ref<any[]>([]);
    const sprints = ref<any[]>([]);
    const boards = ref<any[]>([]);
    const comments = ref<any[]>([]);

    const fetchTrash = async () => {
      const workspaceId = authStore.currentWorkspace?.id;
      if (!workspaceId) return;

      loading.value = true;
      try {
        const res = await api.get('/trash', { params: { workspaceId } });
        if (res.data.success) {
          const d = res.data.data;
          projects.value = d.projects || [];
          issues.value = d.issues || [];
          sprints.value = d.sprints || [];
          boards.value = d.boards || [];
          comments.value = d.comments || [];
        }
      } catch (err) {
        console.error('Failed to load trash list:', err);
      } finally {
        loading.value = false;
      }
    };

    onMounted(() => {
      fetchTrash();
    });

    const isEmpty = computed(() => {
      return (
        projects.value.length === 0 &&
        issues.value.length === 0 &&
        sprints.value.length === 0 &&
        boards.value.length === 0 &&
        comments.value.length === 0
      );
    });

    const confirmDialog = ref({ show: false, title: '', message: '', action: () => {} });

    const restoreItem = async (type: string, id: string) => {
      try {
        const res = await api.post('/trash/restore', { type, id });
        if (res.data.success) {
          toast.success(`${type} restored successfully.`);
          await fetchTrash();
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to restore item');
      }
    };

    const purgeItem = async (type: string, id: string) => {
      confirmDialog.value = {
        show: true,
        title: 'Permanent Delete',
        message: `Are you sure you want to permanently delete this ${type}? This action CANNOT be undone.`,
        action: async () => {
          try {
            const res = await api.delete('/trash/purge', { data: { type, id } });
            if (res.data.success) {
              toast.success(`${type} permanently deleted.`);
              await fetchTrash();
            }
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to permanently delete item');
          }
        }
      };
    };

    const onConfirm = async () => {
      confirmDialog.value.show = false;
      await confirmDialog.value.action();
    };

    return {
      projects,
      issues,
      sprints,
      boards,
      comments,
      isEmpty,
      fetchTrash,
      restoreItem,
      purgeItem,
      confirmDialog,
      onConfirm
    };
  }
});
</script>
