<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200 font-sans">
    <div class="flex-shrink-0 pb-6 border-b border-slate-200 dark:border-zyra-gray-darkBorder mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Project Settings</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Configure project identifiers, visibility settings, and delete actions.</p>
        </div>
      </div>
    </div>

    <!-- Forms Grid -->
    <div class="flex-grow overflow-y-auto min-h-0 pr-1">
    <div class="grid grid-cols-1 gap-8">
      <!-- General Settings -->
      <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-200 dark:border-zyra-gray-darkBorder bg-slate-50/50 dark:bg-slate-800/50">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white">Project Details</h2>
          <p class="text-xs text-slate-500 dark:text-slate-400">Update project name, key identifier, and visibility representation.</p>
        </div>
        <div class="p-6">
          <form @submit.prevent="saveProject" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Project Name</label>
                <input type="text" v-model="projectForm.name" required maxlength="80" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>

              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Project Key</label>
                <input type="text" v-model="projectForm.key" required maxlength="5" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition uppercase" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Visibility</label>
                <select v-model="projectForm.visibility" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition">
                  <option value="PUBLIC">Public (Accessible by all workspace members)</option>
                  <option value="PRIVATE">Private (Restricted to added members only)</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Project Icon</label>
                <input type="text" v-model="projectForm.icon" placeholder="Emoji, e.g. 🚀, 💻, 🍊" maxlength="10" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
              <textarea v-model="projectForm.description" rows="3" maxlength="500" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" placeholder="Add a short description about this project..."></textarea>
            </div>

            <div class="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
              <button type="submit" :disabled="saving" class="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition shadow-sm">
                {{ saving ? 'Saving...' : 'Save Project Details' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-red-200 dark:border-red-900 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-red-100 dark:border-red-900 bg-red-50/30 dark:bg-red-950/30">
          <h2 class="text-lg font-bold text-red-800">Danger Zone</h2>
          <p class="text-xs text-red-600/80">Permanent or sweeping changes to project storage.</p>
        </div>
        <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Archive / Delete Project</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400">Archiving locks the board, while soft-deleting relocates issues into the Project Trash Bin.</p>
          </div>
          <div class="flex gap-3">
            <button @click="archiveProject" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition">
              Archive Project
            </button>
            <button @click="deleteProject" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition shadow-sm">
              Delete Project
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>

    <!-- Confirm Dialog -->
    <AppConfirmDialog
      :model-value="confirmDialog.show"
      @update:model-value="confirmDialog.show = $event"
      :title="confirmDialog.title"
      :description="confirmDialog.message"
      variant="danger"
      confirm-text="Confirm"
      @confirm="onConfirm"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useProjectStore } from '../store/project';
import { useToastStore } from '../store/toast';
import AppConfirmDialog from '../components/ui/AppConfirmDialog.vue';
import api from '../services/api';

export default defineComponent({
  name: 'ProjectSettings',
  components: { AppConfirmDialog },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const projectStore = useProjectStore();
    const toast = useToastStore();

    const projectId = computed(() => route.params.projectId as string);
    const saving = ref(false);

    const confirmDialog = ref({ show: false, title: '', message: '', action: () => {} });

    const showConfirm = (title: string, message: string, action: () => void) => {
      confirmDialog.value = { show: true, title, message, action };
    };

    const onConfirm = async () => {
      confirmDialog.value.show = false;
      await confirmDialog.value.action();
    };

    const projectForm = ref({
      name: '',
      key: '',
      description: '',
      visibility: 'PUBLIC',
      icon: ''
    });

    const fetchProjectDetails = async () => {
      try {
        const detailsRes = await api.get(`/projects/${projectId.value}`);
        if (detailsRes.data.success) {
          const p = detailsRes.data.data;
          projectForm.value = {
            name: p.name,
            key: p.key,
            description: p.description || '',
            visibility: p.visibility || 'PUBLIC',
            icon: p.icon || ''
          };
        }
      } catch (err) {
        console.error('Failed to load project details:', err);
      }
    };

    onMounted(() => {
      fetchProjectDetails();
    });

    const saveProject = async () => {
      saving.value = true;
      try {
        const res = await api.patch(`/projects/${projectId.value}`, projectForm.value);
        if (res.data.success) {
          toast.success('Project settings saved successfully!');
          await projectStore.fetchProjectDetails(projectId.value);
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to update project settings');
      } finally {
        saving.value = false;
      }
    };

    const archiveProject = async () => {
      showConfirm('Archive Project', 'Are you sure you want to archive this project? It will become read-only.', async () => {
        try {
          const res = await api.post('/trash/archive', { type: 'project', id: projectId.value });
          if (res.data.success) {
            toast.success('Project archived successfully!');
            router.push('/workspace');
          }
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to archive project');
        }
      });
    };

    const deleteProject = async () => {
      showConfirm('Delete Project', 'Are you sure you want to delete this project? This will move it to the Trash Bin.', async () => {
        try {
          const res = await api.delete(`/projects/${projectId.value}`);
          if (res.data.success) {
            toast.success('Project soft-deleted successfully!');
            router.push('/workspace');
          }
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to delete project');
        }
      });
    };

    return {
      projectForm,
      saving,
      saveProject,
      archiveProject,
      deleteProject,
      confirmDialog,
      onConfirm
    };
  }
});
</script>
