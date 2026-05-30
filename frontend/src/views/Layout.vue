<template>
  <div class="min-h-screen flex bg-slate-50 dark:bg-zyra-gray-darkBg text-slate-800 dark:text-slate-200 font-sans">
    
    <!-- Mobile Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/50 z-30 lg:hidden"
        @click="sidebarOpen = false"
      ></div>
    </Transition>

    <!-- Sidebar Navigation -->
    <aside
      class="fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shadow-lg transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0 lg:flex-shrink-0"
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="flex flex-col">
        <!-- Brand header -->
        <div class="px-6 py-5 flex items-center justify-between border-b border-slate-800">
          <div class="flex items-center gap-3">
            <span class="text-2xl">🍊</span>
            <span class="font-extrabold text-lg text-white tracking-tight">Zyra</span>
          </div>
          <!-- Close button on mobile -->
          <button @click="sidebarOpen = false" class="lg:hidden p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <!-- Selected Project badge -->
        <div v-if="projectStore.currentProject" class="mx-4 my-4 p-3 bg-slate-800/50 rounded-lg flex items-center gap-3 overflow-hidden">
          <div class="flex-shrink-0 max-w-[80px] h-8 px-2 rounded bg-orange-500 text-white flex items-center justify-center font-bold text-[10px] uppercase">
            <span class="truncate">{{ projectStore.currentProject.key }}</span>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-white truncate">{{ projectStore.currentProject.name }}</p>
            <p class="text-[10px] text-slate-400">Software Project</p>
          </div>
        </div>

        <!-- Nav Links -->
        <nav class="px-3 space-y-1.5 overflow-y-auto max-h-[calc(100vh-280px)]">
          <router-link
            v-for="link in navLinks"
            :key="link.path"
            :to="`/project/${projectId}/${link.path}`"
            class="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-slate-800 hover:text-white transition duration-150"
            active-class="bg-orange-500/10 text-orange-500 hover:bg-orange-500/15 hover:text-orange-500"
            @click="sidebarOpen = false"
          >
            <component :is="link.icon" class="w-4 h-4 flex-shrink-0" />
            <span>{{ link.label }}</span>
          </router-link>
        </nav>
      </div>

      <!-- User footer area -->
      <div class="p-4 border-t border-slate-800 flex flex-col gap-2">
        <button
          @click="backToWorkspaces"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-bold hover:bg-slate-800 hover:text-white text-slate-400 transition"
        >
          <ArrowLeftIcon class="w-3.5 h-3.5" />
          <span>Change Workspace</span>
        </button>

        <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/40">
          <div class="flex items-center gap-2 min-w-0">
            <img :src="userAvatar" class="w-7 h-7 rounded-full shadow-sm border border-slate-700" />
            <span class="text-xs font-bold text-slate-200 truncate max-w-[80px]">{{ userFullName }}</span>
          </div>
          
          <button @click="logout" class="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition" title="Logout">
            <LogOutIcon class="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-grow flex flex-col overflow-x-hidden min-h-screen w-0">
      <!-- Mobile Top Bar -->
      <div class="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-zyra-gray-darkCard border-b border-slate-200 dark:border-zyra-gray-darkBorder sticky top-0 z-20">
        <button @click="sidebarOpen = true" class="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="flex items-center gap-2">
          <span class="text-lg">🍊</span>
          <span class="font-bold text-sm text-slate-800 dark:text-white">Zyra</span>
        </div>
        <div class="flex items-center gap-1">
          <img :src="userAvatar" class="w-7 h-7 rounded-full shadow-sm border border-slate-200 dark:border-slate-700" />
        </div>
      </div>

      <router-view />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';
import { useProjectStore } from '../store/project';

import {
  Layers as LayersIcon,
  ListTodo as ListTodoIcon,
  BarChart3 as BarChart3Icon,
  Upload as UploadIcon,
  ArrowLeft as ArrowLeftIcon,
  LogOut as LogOutIcon,
  Settings as SettingsIcon,
  Trash2 as TrashIcon,
  Tag as TagIcon,
  Zap as ZapIcon,
  FileText as FileTextIcon,
  Map as MapIcon,
} from 'lucide-vue-next';

export default defineComponent({
  name: 'ProjectLayout',
  components: {
    ArrowLeftIcon,
    LogOutIcon,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const authStore = useAuthStore();
    const projectStore = useProjectStore();
    const projectId = computed(() => route.params.projectId as string);
    const sidebarOpen = ref(false);

    onMounted(() => {
      if (projectId.value) {
        projectStore.fetchProjectDetails(projectId.value);
      }
    });

    const userAvatar = computed(() => authStore.user?.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex');
    const userFullName = computed(() => authStore.user ? `${authStore.user.firstName} ${authStore.user.lastName}` : '');

    const navLinks = [
      { label: 'Kanban Board', path: 'board', icon: LayersIcon },
      { label: 'Backlog & Sprints', path: 'backlog', icon: ListTodoIcon },
      { label: 'Roadmap', path: 'roadmap', icon: MapIcon },
      { label: 'Releases', path: 'releases', icon: TagIcon },
      { label: 'Analytics Insights', path: 'analytics', icon: BarChart3Icon },
      { label: 'Automation', path: 'automation', icon: ZapIcon },
      { label: 'Templates', path: 'templates', icon: FileTextIcon },
      { label: 'CSV Importer', path: 'import', icon: UploadIcon },
      { label: 'Project Settings', path: 'settings', icon: SettingsIcon },
      { label: 'Trash Bin', path: 'trash', icon: TrashIcon },
    ];

    const backToWorkspaces = () => {
      router.push('/workspace');
    };

    const logout = () => {
      authStore.logout();
      router.push('/login');
    };

    return {
      projectId,
      projectStore,
      navLinks,
      userAvatar,
      userFullName,
      sidebarOpen,
      backToWorkspaces,
      logout,
    };
  },
});
</script>
