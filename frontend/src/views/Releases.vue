<template>
  <div class="flex-grow p-6 flex flex-col h-screen overflow-hidden text-[#172B4D] dark:text-slate-200">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-800 dark:text-white">Releases</h1>
          <p class="text-xs text-slate-400 mt-0.5">Track versions and release cycles</p>
        </div>
        <button @click="showCreateModal = true" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition shadow-sm">
          + New Release
        </button>
      </div>
    </div>

    <!-- Release List -->
    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Loading releases...</p>
      </div>
    </div>
    <div v-else-if="releases.length === 0" class="bg-white dark:bg-zyra-gray-darkCard border border-gray-200 dark:border-zyra-gray-darkBorder rounded-xl shadow-sm p-12 text-center">
      <div class="w-16 h-16 bg-orange-100 dark:bg-orange-950/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <PackageIcon class="w-8 h-8 text-orange-500" />
      </div>
      <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-2">No Releases Yet</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        Create your first release to track versions and ship with confidence
      </p>
    </div>
    <div v-else class="space-y-4 overflow-y-auto">
      <div v-for="release in releases" :key="release.id" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <span :class="statusBadgeClass(release.status)" class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase">
              {{ release.status }}
            </span>
            <h3 class="text-lg font-bold text-slate-800 dark:text-white">{{ release.name }}</h3>
          </div>
          <div class="flex items-center gap-2">
            <button @click="editRelease(release)" class="text-slate-400 hover:text-orange-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <PencilIcon class="w-4 h-4" />
            </button>
            <button @click="deleteRelease(release)" class="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <TrashIcon class="w-4 h-4" />
            </button>
          </div>
        </div>
        <p v-if="release.description" class="text-sm text-slate-600 dark:text-slate-400 mt-2">{{ release.description }}</p>
        <div class="flex items-center gap-4 mt-3 text-xs text-slate-500 dark:text-slate-400">
          <span v-if="release.releaseDate">📅 {{ formatDate(release.releaseDate) }}</span>
          <span>📦 {{ release.issueCount || 0 }} issues</span>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="closeModal">
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-zyra-gray-darkBorder p-6">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">{{ editingRelease ? 'Edit Release' : 'New Release' }}</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Name <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" class="w-full px-3 py-2.5 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-xl bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" placeholder="v1.0.0" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
              <textarea v-model="form.description" rows="3" class="w-full px-3 py-2.5 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-xl bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" placeholder="Release notes..."></textarea>
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Release Date</label>
              <input v-model="form.releaseDate" type="date" class="w-full px-3 py-2.5 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-xl bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" />
            </div>
            <div v-if="editingRelease">
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
              <SelectDropdown v-model="form.status" :options="statusOptions" placeholder="Select status..." />
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition">Cancel</button>
            <button @click="saveRelease" class="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition shadow-sm">
              {{ editingRelease ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="showDeleteConfirm = false">
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-6">
          <div class="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-xl flex items-center justify-center mb-4">
            <AlertTriangleIcon class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">Delete Release?</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Are you sure you want to delete <strong>"{{ deleteTarget?.name }}"</strong>?
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-500 mb-6">This action cannot be undone.</p>
          <div class="flex justify-end gap-3">
            <button @click="showDeleteConfirm = false" class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition">Cancel</button>
            <button @click="confirmDelete" class="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition shadow-sm">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import { Pencil as PencilIcon, Trash2 as TrashIcon, Package as PackageIcon, AlertTriangle as AlertTriangleIcon } from 'lucide-vue-next';
import SelectDropdown from '../components/SelectDropdown.vue';

export default defineComponent({
  name: 'Releases',
  components: { PencilIcon, TrashIcon, PackageIcon, AlertTriangleIcon, SelectDropdown },
  setup() {
    const route = useRoute();
    const projectId = computed(() => route.params.projectId as string);
    const releases = ref<any[]>([]);
    const loading = ref(false);
    const showCreateModal = ref(false);
    const editingRelease = ref<any>(null);
    const form = ref({ name: '', description: '', releaseDate: '', status: 'PLANNED' });
    const showDeleteConfirm = ref(false);
    const deleteTarget = ref<any>(null);

    const statusOptions = [
      { value: 'PLANNED', label: 'Planned' },
      { value: 'IN_PROGRESS', label: 'In Progress' },
      { value: 'RELEASED', label: 'Released' },
      { value: 'ARCHIVED', label: 'Archived' },
    ];

    const fetchReleases = async () => {
      loading.value = true;
      try {
        const res = await api.get(`/projects/${projectId.value}/releases`);
        releases.value = res.data.data || [];
      } catch { /* ignore */ }
      loading.value = false;
    };

    const saveRelease = async () => {
      if (!form.value.name.trim()) return;
      try {
        if (editingRelease.value) {
          await api.patch(`/releases/${editingRelease.value.id}`, form.value);
        } else {
          await api.post(`/projects/${projectId.value}/releases`, form.value);
        }
        closeModal();
        fetchReleases();
      } catch { /* ignore */ }
    };

    const editRelease = (release: any) => {
      editingRelease.value = release;
      form.value = {
        name: release.name,
        description: release.description || '',
        releaseDate: release.releaseDate ? release.releaseDate.split('T')[0] : '',
        status: release.status,
      };
      showCreateModal.value = true;
    };

    const deleteRelease = (release: any) => {
      deleteTarget.value = release;
      showDeleteConfirm.value = true;
    };

    const confirmDelete = async () => {
      if (!deleteTarget.value) return;
      try {
        await api.delete(`/releases/${deleteTarget.value.id}`);
        showDeleteConfirm.value = false;
        deleteTarget.value = null;
        fetchReleases();
      } catch { /* ignore */ }
    };

    const closeModal = () => {
      showCreateModal.value = false;
      editingRelease.value = null;
      form.value = { name: '', description: '', releaseDate: '', status: 'PLANNED' };
    };

    const statusBadgeClass = (status: string) => {
      const map: Record<string, string> = {
        PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        RELEASED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        ARCHIVED: 'bg-slate-100 text-slate-600 dark:bg-slate-700/30 dark:text-slate-400',
      };
      return map[status] || map.PLANNED;
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString();

    onMounted(fetchReleases);

    return { releases, loading, showCreateModal, editingRelease, form, saveRelease, editRelease, deleteRelease, closeModal, statusBadgeClass, formatDate, statusOptions, showDeleteConfirm, deleteTarget, confirmDelete };
  },
});
</script>
