<template>
  <div class="min-h-screen bg-slate-50 dark:bg-zyra-gray-darkBg py-6 md:py-10 px-4 md:px-6 font-sans">
    <div class="max-w-4xl mx-auto space-y-6 md:space-y-8">
      <!-- Breadcrumb / Header -->
      <div class="flex items-center justify-between pb-6 border-b border-slate-200 dark:border-zyra-gray-darkBorder">
        <div>
          <router-link to="/workspace" class="text-sm font-semibold text-orange-500 hover:underline flex items-center gap-1">
            <span class="text-xs">&larr;</span> Back to Workspaces
          </router-link>
          <h1 class="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 tracking-tight">Workspace Settings</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage workspace preferences, memberships, invitations, and active settings.</p>
        </div>
      </div>

      <!-- Main workspace settings forms -->
      <div class="grid grid-cols-1 gap-8">
        <!-- Details Card -->
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-sm overflow-hidden">
          <div class="p-6 border-b border-slate-200 dark:border-zyra-gray-darkBorder bg-slate-50/50 dark:bg-slate-800/50">
            <h2 class="text-lg font-bold text-slate-800 dark:text-white">Workspace Profile</h2>
            <p class="text-xs text-slate-500 dark:text-slate-400">Update your workspace identity, name, slug, and representation avatar.</p>
          </div>
          <div class="p-6 space-y-6">
            <form @submit.prevent="saveWorkspace" class="space-y-6">
              <!-- Avatar Upload -->
              <div class="flex items-center gap-6">
                <img :src="workspaceAvatar" class="w-16 h-16 rounded-xl object-cover shadow border border-slate-200 bg-slate-100" />
                <div class="space-y-1.5">
                  <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Workspace Logo</label>
                  <div class="flex items-center gap-3">
                    <input type="file" ref="avatarInput" @change="onAvatarChange" accept="image/*" class="hidden" />
                    <button type="button" @click="$refs.avatarInput.click()" class="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                      Upload Logo
                    </button>
                    <button type="button" v-if="workspaceForm.avatarUrl || avatarFile" @click="clearAvatar" class="text-xs font-bold text-red-500 hover:underline">
                      Remove
                    </button>
                  </div>
                </div>
              </div>

              <!-- Name & Slug fields -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-1.5">
                  <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Workspace Name</label>
                  <input type="text" v-model="workspaceForm.name" required maxlength="50" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
                </div>
                <div class="space-y-1.5">
                  <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Workspace Slug</label>
                  <input type="text" v-model="workspaceForm.slug" required maxlength="30" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
                </div>
              </div>

              <div class="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="submit" :disabled="loading" class="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition shadow-sm">
                  {{ loading ? 'Saving...' : 'Save Workspace' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Members & Invitations Card -->
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-sm overflow-hidden">
          <!-- Card Header & Navigation -->
          <div class="border-b border-slate-200 dark:border-zyra-gray-darkBorder bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4 flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-800 dark:text-white">Members & Invitations</h2>
            <button @click="showInviteModal = true" class="px-3.5 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-1.5 shadow-sm">
              <span>+ Invite Member</span>
            </button>
          </div>

          <!-- Active Members List -->
          <div class="p-6 space-y-6">
            <div class="space-y-4">
              <h3 class="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Active Members</h3>
              <div class="divide-y divide-slate-150 dark:divide-slate-700 border border-slate-200 dark:border-zyra-gray-darkBorder rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-800/30">
                <div v-for="m in members" :key="m.id" class="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  <div class="flex items-center gap-3">
                    <img :src="m.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + m.firstName" class="w-9 h-9 rounded-full shadow-sm" />
                    <div>
                      <p class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ m.firstName }} {{ m.lastName }}</p>
                      <p class="text-xs text-slate-500 dark:text-slate-400">{{ m.email }}</p>
                      <div v-if="['ADMIN', 'MEMBER', 'VIEWER'].includes(m.role)" class="mt-1 flex flex-wrap gap-1 items-center">
                        <span class="text-[10px] text-slate-400">Projects:</span>
                        <span v-if="m.allowedProjectIds && m.allowedProjectIds.length > 0" v-for="pid in m.allowedProjectIds" :key="pid" class="text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                          {{ getProjectName(pid) }}
                        </span>
                        <span v-else class="text-[10px] text-red-500 font-medium">None (No access)</span>
                      </div>
                      <div v-else class="mt-1">
                        <span class="text-[10px] text-green-600 dark:text-green-400 font-semibold bg-green-50 dark:bg-green-950/30 px-1.5 py-0.5 rounded">All Projects</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-full uppercase">
                      {{ m.role }}
                    </span>
                    <button v-if="canManage(m)" @click="openEditModal(m)" class="px-2.5 py-1 text-xs font-bold text-orange-500 hover:bg-orange-50 dark:hover:bg-slate-800 border border-orange-200 dark:border-slate-600 rounded transition">
                      Edit
                    </button>
                    <button v-if="canManage(m)" @click="removeMember(m.id)" class="text-xs font-bold text-red-500 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Pending Invitations -->
            <div v-if="invitations.length > 0" class="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700">
              <h3 class="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Pending Workspace Invitations</h3>
              <div class="divide-y divide-slate-150 dark:divide-slate-700 border border-slate-200 dark:border-zyra-gray-darkBorder rounded-xl overflow-hidden bg-slate-50/20 dark:bg-slate-800/30">
                <div v-for="inv in invitations" :key="inv.id" class="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                  <div>
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ inv.invitedEmail }}</p>
                    <p class="text-xs text-slate-400">Invited by: {{ inv.invitedBy }} &bull; Role: {{ inv.role }}</p>
                  </div>
                  <div class="flex items-center gap-3">
                    <span class="text-xs font-semibold px-2 py-0.5 border border-amber-200 bg-amber-50 text-amber-600 rounded-full">
                      {{ inv.status }}
                    </span>
                    <button @click="cancelInvite(inv.id)" class="text-xs font-bold text-slate-500 hover:text-red-500 hover:underline">
                      Revoke
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Transfer Workspace Ownership & Archive -->
        <div v-if="isOwner" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-red-200 dark:border-red-900 shadow-sm overflow-hidden">
          <div class="p-6 border-b border-red-100 dark:border-red-900 bg-red-50/30 dark:bg-red-950/30">
            <h2 class="text-lg font-bold text-red-800">Danger Zone</h2>
            <p class="text-xs text-red-600/80">Irreversible administrative actions for workspace managers.</p>
          </div>
          <div class="p-6 space-y-6 divide-y divide-slate-100">
            <!-- Transfer -->
            <div class="pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="space-y-1">
                <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Transfer Workspace Ownership</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Pass this workspace ownership to another active workspace administrator.</p>
              </div>
              <div class="flex gap-3">
                <select v-model="transferTargetId" class="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500">
                  <option value="">Select new owner...</option>
                  <option v-for="m in eligibleOwners" :key="m.id" :value="m.id">{{ m.firstName }} {{ m.lastName }}</option>
                </select>
                <button @click="transferOwnership" :disabled="!transferTargetId" class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-semibold transition disabled:opacity-50">
                  Transfer
                </button>
              </div>
            </div>

            <!-- Archive & Delete -->
            <div class="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="space-y-1">
                <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Archive / Delete Workspace</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Archive this workspace to make it read-only, or soft-delete it to recycle bin.</p>
              </div>
              <div class="flex gap-3">
                <button @click="archiveWorkspace" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition">
                  Archive Workspace
                </button>
                <button @click="deleteWorkspace" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition shadow-sm">
                  Delete Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Invite Member Modal -->
    <AppDialog v-model="showInviteModal" title="Invite Workspace Member" size="md">
      <form @submit.prevent="sendInvite" class="space-y-4">
        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Invited Email Address</label>
          <input type="email" v-model="inviteForm.email" required maxlength="255" placeholder="name@domain.com" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Workspace Role</label>
          <select v-model="inviteForm.role" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition">
            <option value="MEMBER">Member (Standard write access)</option>
            <option value="ADMIN">Admin (Workspace settings management)</option>
            <option value="VIEWER">Viewer (Read-only access)</option>
          </select>
        </div>

        <!-- Project Access Scope Multi-Select -->
        <div v-if="['ADMIN', 'MEMBER', 'VIEWER'].includes(inviteForm.role)" class="space-y-2">
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Allowed Projects</label>
          <p class="text-xs text-slate-500 mb-2">Select which projects this member is allowed to access.</p>
          <div class="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-2 bg-slate-50/50 dark:bg-slate-800/50">
            <div v-for="p in projects" :key="p.id" class="flex items-center gap-2">
              <input type="checkbox" :id="'invite-proj-' + p.id" :value="p.id" v-model="inviteForm.allowedProjectIds" class="rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
              <label :for="'invite-proj-' + p.id" class="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                {{ p.name }} <span class="text-xs text-slate-400">({{ p.key }})</span>
              </label>
            </div>
            <div v-if="projects.length === 0" class="text-xs text-slate-500 text-center py-2">No projects found. Create a project first.</div>
          </div>
        </div>
      </form>
      <template #footer="{ close }">
        <button type="button" @click="close" class="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
          Cancel
        </button>
        <button @click="sendInvite" :disabled="inviting" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition shadow-sm">
          {{ inviting ? 'Sending...' : 'Send Invitation' }}
        </button>
      </template>
    </AppDialog>

    <!-- Edit Member Modal -->
    <AppDialog v-model="showEditModal" title="Edit Workspace Member Access" size="md">
      <div v-if="editForm" class="space-y-4">
        <div class="flex items-center gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
          <img :src="editForm.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + editForm.firstName" class="w-10 h-10 rounded-full" />
          <div>
            <p class="text-sm font-bold text-slate-800 dark:text-slate-200">{{ editForm.firstName }} {{ editForm.lastName }}</p>
            <p class="text-xs text-slate-500 dark:text-slate-400">{{ editForm.email }}</p>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Workspace Role</label>
          <select v-model="editForm.role" class="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition">
            <option value="MEMBER">Member (Standard write access)</option>
            <option value="ADMIN">Admin (Workspace settings management)</option>
            <option value="VIEWER">Viewer (Read-only access)</option>
            <option value="SUPER_ADMIN">Super Admin (All projects, except kicking Owner)</option>
          </select>
        </div>

        <!-- Project Access Scope Multi-Select for Edit -->
        <div v-if="['ADMIN', 'MEMBER', 'VIEWER'].includes(editForm.role)" class="space-y-2">
          <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">Allowed Projects</label>
          <p class="text-xs text-slate-500 mb-2">Select which projects this member is allowed to access.</p>
          <div class="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-2 bg-slate-50/50 dark:bg-slate-800/50">
            <div v-for="p in projects" :key="p.id" class="flex items-center gap-2">
              <input type="checkbox" :id="'edit-proj-' + p.id" :value="p.id" v-model="editForm.allowedProjectIds" class="rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
              <label :for="'edit-proj-' + p.id" class="text-sm text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                {{ p.name }} <span class="text-xs text-slate-400">({{ p.key }})</span>
              </label>
            </div>
            <div v-if="projects.length === 0" class="text-xs text-slate-500 text-center py-2">No projects found.</div>
          </div>
        </div>
      </div>
      <template #footer="{ close }">
        <button type="button" @click="close" class="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
          Cancel
        </button>
        <button @click="saveEditMember" :disabled="savingMember" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition shadow-sm">
          {{ savingMember ? 'Saving...' : 'Save Changes' }}
        </button>
      </template>
    </AppDialog>

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
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';
import { useInvitationStore } from '../store/invitation';
import AppDialog from '../components/ui/AppDialog.vue';
import AppConfirmDialog from '../components/ui/AppConfirmDialog.vue';
import { useToastStore } from '../store/toast';
import api from '../services/api';

export default defineComponent({
  name: 'WorkspaceSettings',
  components: { AppDialog, AppConfirmDialog },
  setup() {
    const authStore = useAuthStore();
    const inviteStore = useInvitationStore();
    const toast = useToastStore();
    const router = useRouter();

    const workspace = computed(() => authStore.currentWorkspace);
    const loading = ref(false);
    const inviting = ref(false);
    const confirmDialog = ref({ show: false, title: '', message: '', action: () => {} });
    const showInviteModal = ref(false);
    const avatarFile = ref<File | null>(null);

    const workspaceForm = ref({
      name: workspace.value?.name || '',
      slug: workspace.value?.slug || '',
      avatarUrl: workspace.value?.avatarUrl || ''
    });

    const inviteForm = ref({
      email: '',
      role: 'MEMBER',
      allowedProjectIds: [] as string[]
    });

    const members = ref<any[]>([]);
    const projects = ref<any[]>([]);
    const transferTargetId = ref('');

    // Editing active workspace member
    const showEditModal = ref(false);
    const savingMember = ref(false);
    const editForm = ref<any>(null);

    const getProjectName = (projectId: string) => {
      const p = projects.value.find(proj => proj.id === projectId);
      return p ? p.name : projectId;
    };

    const fetchWorkspaceProjects = async () => {
      if (!workspace.value) return;
      try {
        const res = await api.get(`/projects?workspaceId=${workspace.value.id}`);
        if (res.data.success) {
          projects.value = res.data.data;
        }
      } catch (err) {
        console.error('Failed to load workspace projects:', err);
      }
    };

    const fetchMembers = async () => {
      if (!workspace.value) return;
      try {
        const res = await api.get(`/workspaces/${workspace.value.id}/members`);
        if (res.data.success) {
          members.value = res.data.data;
        }
      } catch (err) {
        console.error('Failed to load workspace members:', err);
      }
    };

    onMounted(async () => {
      if (!workspace.value) {
        router.push('/workspace');
        return;
      }
      fetchMembers();
      fetchWorkspaceProjects();
      inviteStore.fetchWorkspaceInvitations(workspace.value.id);
      inviteStore.setupSocketListener();
    });

    const workspaceAvatar = computed(() => {
      if (avatarFile.value) {
        return URL.createObjectURL(avatarFile.value);
      }
      return workspaceForm.value.avatarUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + workspaceForm.value.name;
    });

    const isOwner = computed(() => {
      return workspace.value?.role === 'OWNER';
    });

    const isAdmin = computed(() => {
      return workspace.value?.role === 'OWNER' || workspace.value?.role === 'ADMIN';
    });

    const invitations = computed(() => inviteStore.invitations);

    const eligibleOwners = computed(() => {
      return members.value.filter((m) => m.id !== authStore.user?.id && (m.role === 'ADMIN' || m.role === 'MEMBER'));
    });

    const onAvatarChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        avatarFile.value = target.files[0];
      }
    };

    const clearAvatar = () => {
      avatarFile.value = null;
      workspaceForm.value.avatarUrl = '';
    };

    const saveWorkspace = async () => {
      if (!workspace.value) return;
      loading.value = true;
      try {
        const formData = new FormData();
        formData.append('name', workspaceForm.value.name);
        formData.append('slug', workspaceForm.value.slug);
        
        if (avatarFile.value) {
          formData.append('avatar', avatarFile.value);
        } else if (!workspaceForm.value.avatarUrl) {
          formData.append('avatarUrl', ''); // empty triggers removal
        }

        const res = await api.patch(`/workspaces/${workspace.value.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (res.data.success) {
          // Re-fetch profile to load updated workspaces list
          await authStore.fetchMe();
          toast.success('Workspace updated successfully!');
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to update workspace');
      } finally {
        loading.value = false;
      }
    };

    const sendInvite = async () => {
      if (!workspace.value) return;
      inviting.value = true;
      try {
        const success = await inviteStore.createInvitation(
          workspace.value.id,
          inviteForm.value.email,
          inviteForm.value.role,
          inviteForm.value.allowedProjectIds
        );
        if (success) {
          toast.success('Invitation sent successfully!');
          inviteForm.value.email = '';
          inviteForm.value.allowedProjectIds = [];
          showInviteModal.value = false;
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to send invitation');
      } finally {
        inviting.value = false;
      }
    };

    const openEditModal = (member: any) => {
      editForm.value = {
        id: member.id,
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        avatarUrl: member.avatarUrl,
        role: member.role,
        allowedProjectIds: [...(member.allowedProjectIds || [])]
      };
      showEditModal.value = true;
    };

    const saveEditMember = async () => {
      if (!workspace.value || !editForm.value) return;
      savingMember.value = true;
      try {
        const res = await api.patch(`/workspaces/${workspace.value.id}/members/${editForm.value.id}`, {
          role: editForm.value.role,
          allowedProjectIds: editForm.value.allowedProjectIds
        });
        if (res.data.success) {
          toast.success('Member permissions updated successfully!');
          showEditModal.value = false;
          fetchMembers();
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to update workspace member');
      } finally {
        savingMember.value = false;
      }
    };

    const cancelInvite = async (id: string) => {
      confirmDialog.value = {
        show: true,
        title: 'Cancel Invitation',
        message: 'Are you sure you want to cancel this invitation?',
        action: async () => {
          try {
            const success = await inviteStore.cancelInvitation(id);
            if (success) {
              toast.success('Invitation cancelled!');
            }
          } catch (err: any) {
            toast.error(err.message || 'Failed to cancel invitation');
          }
        }
      };
    };

    const removeMember = async (targetUserId: string) => {
      if (!workspace.value) return;
      confirmDialog.value = {
        show: true,
        title: 'Remove Member',
        message: 'Are you sure you want to remove this member from the workspace?',
        action: async () => {
          try {
            const res = await api.delete(`/workspaces/${workspace.value!.id}/members/${targetUserId}`);
            if (res.data.success) {
              members.value = members.value.filter((m) => m.id !== targetUserId);
              toast.success('Member removed successfully.');
            }
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to remove member');
          }
        }
      };
    };

    const canManage = (member: any) => {
      if (member.id === authStore.user?.id) return false; // cannot remove self
      if (workspace.value?.role === 'OWNER') return true;
      if (workspace.value?.role === 'ADMIN' && member.role !== 'OWNER' && member.role !== 'ADMIN') return true;
      return false;
    };

    const transferOwnership = async () => {
      if (!workspace.value || !transferTargetId.value) return;
      confirmDialog.value = {
        show: true,
        title: 'Transfer Ownership',
        message: 'Are you sure you want to transfer ownership of this workspace? This demotes you to Admin.',
        action: async () => {
          try {
            const res = await api.post(`/workspaces/${workspace.value!.id}/transfer-ownership`, { newOwnerId: transferTargetId.value });
            if (res.data.success) {
              toast.success('Ownership transferred successfully!');
              await authStore.fetchMe();
              router.push('/workspace');
            }
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to transfer ownership');
          }
        }
      };
    };

    const archiveWorkspace = async () => {
      if (!workspace.value) return;
      confirmDialog.value = {
        show: true,
        title: 'Archive Workspace',
        message: 'Are you sure you want to archive this workspace? It will become read-only.',
        action: async () => {
          try {
            const res = await api.post('/trash/archive', { type: 'workspace', id: workspace.value!.id });
            if (res.data.success) {
              toast.success('Workspace archived successfully!');
              router.push('/workspace');
            }
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to archive workspace');
          }
        }
      };
    };

    const deleteWorkspace = async () => {
      if (!workspace.value) return;
      confirmDialog.value = {
        show: true,
        title: 'Delete Workspace',
        message: 'Are you sure you want to delete this workspace? This will move it to the recycle bin.',
        action: async () => {
          try {
            const res = await api.post('/trash/archive', { type: 'workspace', id: workspace.value!.id });
            if (res.data.success) {
              toast.success('Workspace soft-deleted successfully!');
              router.push('/workspace');
            }
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete workspace');
          }
        }
      };
    };

    const onConfirm = async () => {
      confirmDialog.value.show = false;
      await confirmDialog.value.action();
    };

    return {
      workspaceForm,
      inviteForm,
      loading,
      inviting,
      workspaceAvatar,
      avatarFile,
      showInviteModal,
      isOwner,
      isAdmin,
      members,
      projects,
      invitations,
      eligibleOwners,
      transferTargetId,
      showEditModal,
      savingMember,
      editForm,
      getProjectName,
      openEditModal,
      saveEditMember,
      onAvatarChange,
      clearAvatar,
      saveWorkspace,
      sendInvite,
      cancelInvite,
      removeMember,
      canManage,
      transferOwnership,
      archiveWorkspace,
      deleteWorkspace,
      confirmDialog,
      onConfirm
    };
  }
});
</script>
