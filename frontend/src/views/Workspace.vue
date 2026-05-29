<template>
  <div class="min-h-screen bg-slate-50 dark:bg-zyra-gray-darkBg text-slate-800 dark:text-slate-200 flex flex-col font-sans">
    <!-- Navbar Header -->
    <header class="bg-white dark:bg-zyra-gray-darkCard border-b border-gray-200 dark:border-zyra-gray-darkBorder px-6 py-4 flex justify-between items-center shadow-sm">
      <div class="flex items-center gap-3">
        <span class="text-2xl">🍊</span>
        <span class="font-extrabold text-xl tracking-tight text-zyra-primary">Zyra</span>
        <span class="px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded text-xs font-bold uppercase tracking-wider">Console</span>
      </div>

      <div class="flex items-center gap-4">
        <!-- User Avatar Dropdown -->
        <div class="relative" ref="userMenuRef">
          <button
            @click="showUserMenu = !showUserMenu"
            class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors duration-150 group"
            id="workspace-user-menu-btn"
          >
            <img :src="userAvatar" class="w-8 h-8 rounded-full border border-gray-200 shadow-sm" />
            <span class="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white">{{ userFullName }}</span>
            <svg class="w-4 h-4 text-slate-400 transition-transform" :class="{ 'rotate-180': showUserMenu }" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
          </button>

          <!-- Dropdown Menu -->
          <div
            v-if="showUserMenu"
            class="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-zyra-gray-darkCard border border-gray-200 dark:border-zyra-gray-darkBorder rounded-xl shadow-lg z-50 py-1 overflow-hidden"
          >
            <div class="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
              <p class="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{{ userFullName }}</p>
              <p class="text-[10px] text-slate-400 dark:text-slate-500 truncate">{{ authStore.user?.email }}</p>
            </div>
            <router-link
              v-if="authStore.currentWorkspace"
              to="/workspace-settings"
              @click="showUserMenu = false"
              class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-zyra-primary transition-colors w-full"
              id="workspace-settings-link"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              Workspace Settings
            </router-link>
            <router-link
              to="/notifications"
              @click="showUserMenu = false"
              class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-zyra-primary transition-colors w-full"
              id="workspace-notifications-link"
            >
              <BellIcon class="w-4 h-4" />
              <span class="flex-grow">Notifications</span>
              <span v-if="unreadCount > 0" class="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                {{ unreadCount }}
              </span>
            </router-link>
            <router-link
              to="/account"
              @click="showUserMenu = false"
              class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-zyra-primary transition-colors w-full"
              id="workspace-account-settings-link"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Account Settings
            </router-link>
            <div class="border-t border-gray-100 dark:border-slate-700 mt-1">
              <button
                @click="logout"
                class="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors w-full"
                id="workspace-sign-out-btn"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Main Content panels -->
    <main class="flex-grow max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <!-- Workspaces Panel (Left Column) -->
      <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-5 flex flex-col h-[75vh]">
        <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-100 dark:border-slate-700">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white">My Workspaces</h2>
          <button @click="showNewWorkspace = true" class="text-xs text-zyra-primary font-bold hover:underline">
            + New
          </button>
        </div>

        <!-- Workspaces list -->
        <div class="space-y-2 overflow-y-auto flex-grow pr-1">
          <div
            v-for="w in authStore.workspaces"
            :key="w.id"
            :class="{ 'border-zyra-primary bg-orange-50/50 dark:bg-orange-500/10': authStore.currentWorkspace?.id === w.id }"
            class="flex justify-between items-center p-3 border border-gray-200 dark:border-zyra-gray-darkBorder rounded-lg bg-white dark:bg-slate-800/50 hover:border-zyra-primary hover:bg-orange-50/20 dark:hover:bg-orange-500/10 transition duration-150 group"
          >
            <!-- Clickable workspace info -->
            <div class="flex-grow cursor-pointer" @click="selectWorkspace(w)">
              <p class="font-bold text-sm" :class="authStore.currentWorkspace?.id === w.id ? 'text-zyra-primary' : 'text-slate-800 dark:text-slate-200'">{{ w.name }}</p>
              <p class="text-[10px] text-slate-400 dark:text-slate-500">slug: {{ w.slug }}</p>
            </div>
            <!-- Role badge + Settings gear -->
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 text-[9px] font-extrabold rounded uppercase bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                {{ w.role }}
              </span>
              <router-link
                v-if="authStore.currentWorkspace?.id === w.id"
                to="/workspace-settings"
                class="p-1.5 rounded-md text-slate-400 hover:text-zyra-primary hover:bg-orange-50 transition opacity-0 group-hover:opacity-100"
                title="Workspace Settings"
                id="workspace-settings-gear-btn"
                @click.stop
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </router-link>
            </div>
          </div>
        </div>

        <!-- Active Workspace quick-actions -->
        <div v-if="authStore.currentWorkspace" class="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 space-y-2">
          <router-link
            to="/workspace-settings"
            class="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-zyra-primary border border-transparent hover:border-orange-200 transition"
            id="workspace-manage-btn"
          >
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Manage Workspace Settings
          </router-link>
          <p v-if="inviteMsg" class="text-[10px] text-green-600 font-bold px-1">{{ inviteMsg }}</p>
          <p v-if="inviteErr" class="text-[10px] text-red-500 font-bold px-1">{{ inviteErr }}</p>
        </div>
      </div>

      <!-- Projects Panel (Right Columns) -->
      <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-5 md:col-span-2 flex flex-col h-[75vh]">
        <div class="flex justify-between items-center mb-5 pb-3 border-b border-gray-100 dark:border-slate-700">
          <div>
            <h2 class="text-lg font-bold text-slate-800 dark:text-white">
              Projects in <span class="text-zyra-primary">{{ authStore.currentWorkspace?.name }}</span>
            </h2>
            <p class="text-xs text-slate-400">Select a project to open its Kanban board</p>
          </div>
          <button @click="showNewProject = true" class="px-3 py-1.5 bg-zyra-primary text-white text-xs font-bold rounded-lg hover:bg-zyra-primary-hover shadow transition">
            + New Project
          </button>
        </div>

        <!-- Projects Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto flex-grow pr-1">
          <div v-if="projectStore.projects.length === 0" class="col-span-full py-12 text-center text-slate-400">
            <FolderOpenIcon class="w-12 h-12 mx-auto text-slate-300 mb-2" />
            <p class="font-bold text-sm">No projects found in this workspace</p>
            <p class="text-xs mt-1">Create one using the button above to get started!</p>
          </div>

          <div
            v-for="p in projectStore.projects"
            :key="p.id"
            @click="openProject(p)"
            class="p-4 border border-gray-200 dark:border-zyra-gray-darkBorder rounded-xl hover:border-zyra-primary hover:shadow-md cursor-pointer transition duration-200 flex flex-col justify-between bg-white dark:bg-zyra-gray-darkCard group"
          >
            <div>
              <div class="flex justify-between items-start mb-2">
                <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-bold tracking-wider group-hover:bg-orange-50 group-hover:text-zyra-primary dark:group-hover:bg-orange-500/10">
                  {{ p.key }}
                </span>
                <span class="text-[10px] text-slate-400">Owner Lead</span>
              </div>
              <h3 class="font-bold text-base text-slate-800 dark:text-slate-100 group-hover:text-zyra-primary transition-colors">
                {{ p.name }}
              </h3>
              <p class="text-xs text-slate-500 mt-1 line-clamp-2">{{ p.description || 'No description provided.' }}</p>
            </div>
            
            <div class="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-xs text-slate-400">
              <span>{{ p.boards?.length || 1 }} Board</span>
              <span class="text-zyra-primary font-bold opacity-0 group-hover:opacity-100 transition duration-150">Open Board &rarr;</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Modal: Create Workspace -->
    <AppDialog v-model="showNewWorkspace" title="Create New Workspace" size="sm">
      <form @submit.prevent="createWorkspace" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Name</label>
          <input type="text" v-model="newWorkspaceName" required placeholder="e.g. Acme Team" maxlength="50" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Workspace Slug</label>
          <input type="text" v-model="newWorkspaceSlug" required placeholder="e.g. acme-team" maxlength="30" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none" />
        </div>
      </form>
      <template #footer="{ close }">
        <button type="button" @click="close" class="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">Cancel</button>
        <button @click="createWorkspace" class="px-3 py-1.5 bg-zyra-primary text-white text-xs font-bold rounded hover:bg-zyra-primary-hover shadow-sm">Create</button>
      </template>
    </AppDialog>

    <!-- Modal: Create Project -->
    <AppDialog v-model="showNewProject" title="Create New Project" size="md">
      <form @submit.prevent="createProject" class="space-y-4">
        <div class="grid grid-cols-3 gap-3">
          <div class="col-span-2">
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Name</label>
            <input type="text" v-model="newProjectName" required placeholder="Phoenix System" maxlength="80" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none" />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Key (Upper)</label>
            <input type="text" v-model="newProjectKey" required placeholder="PHX" maxlength="5" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none uppercase" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Description (Optional)</label>
          <textarea v-model="newProjectDesc" rows="2" placeholder="Describe the project scope..." maxlength="500" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none"></textarea>
        </div>
      </form>
      <template #footer="{ close }">
        <button type="button" @click="close" class="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">Cancel</button>
        <button @click="createProject" class="px-3 py-1.5 bg-zyra-primary text-white text-xs font-bold rounded hover:bg-zyra-primary-hover shadow-sm">Create Project</button>
      </template>
    </AppDialog>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useAuthStore, Workspace } from '../store/auth';
import { useProjectStore } from '../store/project';
import { useToastStore } from '../store/toast';
import { useNotificationStore } from '../store/notification';
import api from '../services/api';
import { FolderOpen as FolderOpenIcon, Bell as BellIcon } from 'lucide-vue-next';
import AppDialog from '../components/ui/AppDialog.vue';

export default defineComponent({
  name: 'WorkspaceSelector',
  components: {
    FolderOpenIcon,
    RouterLink,
    AppDialog,
    BellIcon,
  },
  setup() {
    const authStore = useAuthStore();
    const projectStore = useProjectStore();
    const toast = useToastStore();
    const notificationStore = useNotificationStore();

    const unreadCount = computed(() => notificationStore.unreadCount);

    onMounted(() => {
      notificationStore.fetchNotifications();
      notificationStore.setupSocketListener();
    });
    const router = useRouter();

    // User menu dropdown state
    const showUserMenu = ref(false);
    const userMenuRef = ref<HTMLElement | null>(null);

    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.value && !userMenuRef.value.contains(event.target as Node)) {
        showUserMenu.value = false;
      }
    };

    onMounted(() => document.addEventListener('mousedown', handleClickOutside));
    onBeforeUnmount(() => document.removeEventListener('mousedown', handleClickOutside));

    // Invite User Form
    const inviteEmail = ref('');
    const inviteMsg = ref('');
    const inviteErr = ref('');

    // Creation modals
    const showNewWorkspace = ref(false);
    const newWorkspaceName = ref('');
    const newWorkspaceSlug = ref('');

    const showNewProject = ref(false);
    const newProjectName = ref('');
    const newProjectKey = ref('');
    const newProjectDesc = ref('');

    const userAvatar = computed(() => authStore.user?.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex');
    const userFullName = computed(() => authStore.user ? `${authStore.user.firstName} ${authStore.user.lastName}` : '');

    // Auto slugify name when typed
    watch(newWorkspaceName, (name) => {
      newWorkspaceSlug.value = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    });

    watch(newProjectName, (name) => {
      newProjectKey.value = name
        .replace(/[^a-zA-Z0-9\s]+/g, '')
        .split(/\s+/)
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 4);
    });

    const selectWorkspace = (workspace: Workspace) => {
      authStore.selectWorkspace(workspace);
    };

    // Load projects of active workspace
    watch(
      () => authStore.currentWorkspace,
      (newWorkspace) => {
        if (newWorkspace) {
          projectStore.fetchProjects(newWorkspace.id);
        }
      },
      { immediate: true }
    );

    // Invite members to Workspace
    const inviteUser = async () => {
      inviteMsg.value = '';
      inviteErr.value = '';
      if (!inviteEmail.value || !authStore.currentWorkspace) return;

      try {
        await api.post(`/workspaces/${authStore.currentWorkspace.id}/members`, {
          email: inviteEmail.value,
          role: 'MEMBER',
        });
        inviteMsg.value = `Success! Added user ${inviteEmail.value}`;
        inviteEmail.value = '';
      } catch (err: any) {
        inviteErr.value = err.response?.data?.message || 'Failed to add user to workspace';
      }
    };

    // Create Workspace
    const createWorkspace = async () => {
      try {
        const response = await api.post('/workspaces', {
          name: newWorkspaceName.value,
          slug: newWorkspaceSlug.value,
        });
        if (response.data.success) {
          showNewWorkspace.value = false;
          newWorkspaceName.value = '';
          newWorkspaceSlug.value = '';
          // Reload workspaces
          await authStore.fetchMe();
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to create workspace');
      }
    };

    // Create Project
    const createProject = async () => {
      if (!authStore.currentWorkspace) return;

      try {
        await projectStore.createProject({
          name: newProjectName.value,
          key: newProjectKey.value,
          description: newProjectDesc.value,
          workspaceId: authStore.currentWorkspace.id,
        });

        showNewProject.value = false;
        newProjectName.value = '';
        newProjectKey.value = '';
        newProjectDesc.value = '';
      } catch (err: any) {
        toast.error(err.message || 'Failed to create project');
      }
    };

    const openProject = (project: any) => {
      router.push(`/project/${project.id}/board`);
    };

    const logout = () => {
      authStore.logout();
      router.push('/login');
    };

    return {
      authStore,
      projectStore,
      inviteEmail,
      inviteMsg,
      inviteErr,
      inviteUser,
      showUserMenu,
      userMenuRef,
      showNewWorkspace,
      newWorkspaceName,
      newWorkspaceSlug,
      createWorkspace,
      showNewProject,
      newProjectName,
      newProjectKey,
      newProjectDesc,
      createProject,
      selectWorkspace,
      openProject,
      userAvatar,
      userFullName,
      unreadCount,
      logout,
    };
  },
});
</script>
