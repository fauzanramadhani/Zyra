<template>
  <div class="p-4 md:p-8 bg-slate-50 min-h-screen space-y-6 md:space-y-8 font-sans">
    <!-- Header -->
    <div class="flex items-center justify-between pb-6 border-b border-slate-200">
      <div>
        <h1 class="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Project Settings</h1>
        <p class="text-sm text-slate-500 mt-1">Configure project identifiers, visibility settings, members, and delete actions.</p>
      </div>
    </div>

    <!-- Forms Grid -->
    <div class="grid grid-cols-1 gap-8">
      <!-- General Settings -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-slate-200 bg-slate-50/50">
          <h2 class="text-lg font-bold text-slate-800">Project Details</h2>
          <p class="text-xs text-slate-500">Update project name, key identifier, and visibility representation.</p>
        </div>
        <div class="p-6">
          <form @submit.prevent="saveProject" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700">Project Name</label>
                <input type="text" v-model="projectForm.name" required maxlength="80" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>

              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700">Project Key</label>
                <input type="text" v-model="projectForm.key" required maxlength="5" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition uppercase" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700">Visibility</label>
                <select v-model="projectForm.visibility" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition">
                  <option value="PUBLIC">Public (Accessible by all workspace members)</option>
                  <option value="PRIVATE">Private (Restricted to added members only)</option>
                </select>
              </div>

              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700">Project Icon</label>
                <input type="text" v-model="projectForm.icon" placeholder="Emoji, e.g. 🚀, 💻, 🍊" maxlength="10" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-sm font-semibold text-slate-700">Description</label>
              <textarea v-model="projectForm.description" rows="3" maxlength="500" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" placeholder="Add a short description about this project..."></textarea>
            </div>

            <div class="flex justify-end pt-4 border-t border-slate-100">
              <button type="submit" :disabled="saving" class="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition shadow-sm">
                {{ saving ? 'Saving...' : 'Save Project Details' }}
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Members Management -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="border-b border-slate-200 bg-slate-50/50 px-4 md:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-slate-800">Project Members</h2>
            <p class="text-xs text-slate-500">Manage memberships and roles specific to this software project.</p>
          </div>
          <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <select v-model="addMemberForm.email" class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
              <option value="">Select workspace user...</option>
              <option v-for="u in workspaceUsers" :key="u.id" :value="u.email">{{ u.firstName }} {{ u.lastName }} ({{ u.email }})</option>
            </select>
            <select v-model="addMemberForm.role" class="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500">
              <option value="MEMBER">Member</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
            <button @click="addProjectMember" :disabled="!addMemberForm.email || addingMember" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition shadow-sm disabled:opacity-50">
              Add
            </button>
          </div>
        </div>

        <div class="p-6">
          <div class="divide-y divide-slate-150 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/20">
            <div v-for="m in members" :key="m.id" class="p-4 flex items-center justify-between hover:bg-slate-50 transition">
              <div class="flex items-center gap-3">
                <img :src="m.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + m.firstName" class="w-8 h-8 rounded-full shadow-sm" />
                <div>
                  <p class="text-sm font-bold text-slate-800">{{ m.firstName }} {{ m.lastName }}</p>
                  <p class="text-xs text-slate-500">{{ m.email }}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-xs font-semibold px-2 py-0.5 border border-slate-200 bg-slate-50 text-slate-600 rounded">
                  {{ m.role }}
                </span>
                <button v-if="m.id !== currentUserId" @click="removeMember(m.id)" class="text-xs font-bold text-red-500 hover:text-red-600 hover:underline">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="bg-white rounded-xl border border-red-200 shadow-sm overflow-hidden">
        <div class="p-6 border-b border-red-100 bg-red-50/30">
          <h2 class="text-lg font-bold text-red-800">Danger Zone</h2>
          <p class="text-xs text-red-600/80">Permanent or sweeping changes to project storage.</p>
        </div>
        <div class="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div class="space-y-1">
            <h3 class="text-sm font-bold text-slate-800">Archive / Delete Project</h3>
            <p class="text-xs text-slate-500">Archiving locks the board, while soft-deleting relocates issues into the Project Trash Bin.</p>
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
import { useAuthStore } from '../store/auth';
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
    const authStore = useAuthStore();
    const toast = useToastStore();

    const projectId = computed(() => route.params.projectId as string);
    const saving = ref(false);
    const addingMember = ref(false);
    const members = ref<any[]>([]);
    const workspaceUsers = ref<any[]>([]);
    const currentUserId = computed(() => authStore.user?.id);

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

    const addMemberForm = ref({
      email: '',
      role: 'MEMBER'
    });

    const fetchProjectAndWorkspaceMembers = async () => {
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
          members.value = p.members.map((m: any) => ({
            id: m.user.id,
            email: m.user.email,
            firstName: m.user.firstName,
            lastName: m.user.lastName,
            avatarUrl: m.user.avatarUrl,
            role: m.role
          }));
        }

        // Fetch workspace members to allow adding
        if (authStore.currentWorkspace) {
          const wsRes = await api.get(`/workspaces/${authStore.currentWorkspace.id}/members`);
          if (wsRes.data.success) {
            workspaceUsers.value = wsRes.data.data.filter((u: any) => !members.value.some((m) => m.id === u.id));
          }
        }
      } catch (err) {
        console.error('Failed to load project configuration details:', err);
      }
    };

    onMounted(() => {
      fetchProjectAndWorkspaceMembers();
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

    const addProjectMember = async () => {
      addingMember.value = true;
      try {
        const res = await api.post(`/projects/${projectId.value}/members`, addMemberForm.value);
        if (res.data.success) {
          toast.success('Member added to project successfully!');
          addMemberForm.value.email = '';
          await fetchProjectAndWorkspaceMembers();
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to add project member');
      } finally {
        addingMember.value = false;
      }
    };

    const removeMember = async (targetUserId: string) => {
      showConfirm('Remove Member', 'Are you sure you want to remove this member from the project?', async () => {
        try {
          const res = await api.delete(`/projects/${projectId.value}/members/${targetUserId}`);
          if (res.data.success) {
            toast.success('Member removed successfully.');
            await fetchProjectAndWorkspaceMembers();
          }
        } catch (err: any) {
          toast.error(err.response?.data?.message || 'Failed to remove project member');
        }
      });
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
      addMemberForm,
      saving,
      addingMember,
      members,
      workspaceUsers,
      currentUserId,
      saveProject,
      addProjectMember,
      removeMember,
      archiveProject,
      deleteProject,
      confirmDialog,
      onConfirm
    };
  }
});
</script>
