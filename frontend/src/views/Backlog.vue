<template>
  <div class="flex-grow flex flex-col h-screen overflow-hidden text-[#172B4D] dark:text-slate-200">
    
    <!-- Header -->
    <div class="flex-shrink-0 px-3 md:px-6 pt-4 md:pt-6 pb-3 md:pb-4">
      <div class="flex justify-between items-center mb-3 md:mb-4">
        <div>
          <h1 class="text-base md:text-xl font-bold text-slate-800 dark:text-white">Backlog</h1>
          <p class="text-[10px] md:text-xs text-slate-400 dark:text-slate-500 mt-0.5 hidden sm:block">Plan sprints, prioritize work, and organize your product backlog</p>
        </div>
        <div class="flex items-center gap-1.5 md:gap-2">
          <button
            @click="showStatsDrawer = !showStatsDrawer"
            class="px-2 md:px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span class="hidden sm:inline">Stats</span>
          </button>
          <button
            @click="openCreateSprint"
            class="px-3 md:px-4 py-2 bg-zyra-primary hover:bg-zyra-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition flex items-center gap-1.5"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span class="hidden sm:inline">Create Sprint</span>
            <span class="sm:hidden">Sprint</span>
          </button>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="flex items-center gap-2 flex-wrap">
        <div class="relative w-full sm:flex-grow sm:max-w-xs">
          <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search issues..."
            class="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-zyra-primary transition min-h-[36px]"
          />
        </div>
        <select v-model="filterType" class="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 outline-none w-[calc(50%-4px)] sm:w-auto min-h-[36px]">
          <option value="">All Types</option>
          <option value="EPIC">Epic</option>
          <option value="STORY">Story</option>
          <option value="TASK">Task</option>
          <option value="BUG">Bug</option>
          <option value="SUBTASK">Subtask</option>
        </select>
        <select v-model="filterPriority" class="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 outline-none w-[calc(50%-4px)] sm:w-auto min-h-[36px]">
          <option value="">All Priorities</option>
          <option value="HIGHEST">Highest</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
          <option value="LOWEST">Lowest</option>
        </select>
        <select v-model="filterAssignee" class="text-xs border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 outline-none w-full sm:w-auto min-h-[36px]">
          <option value="">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          <option v-for="a in assignees" :key="a.id" :value="a.id">{{ a.firstName }} {{ a.lastName }}</option>
        </select>
        <button
          v-if="hasActiveFilters"
          @click="clearFilters"
          class="text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition px-2 py-1"
        >
          Clear filters
        </button>
      </div>
    </div>

    <!-- Bulk Actions Bar -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="selectedIssues.length > 0" class="flex-shrink-0 mx-6 mb-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl flex items-center gap-3 flex-wrap">
        <span class="text-xs font-bold text-orange-700 dark:text-orange-300">{{ selectedIssues.length }} selected</span>
        <select v-model="bulkSprintTarget" class="text-xs border border-orange-300 dark:border-orange-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 dark:text-slate-200 outline-none">
          <option value="">Move to sprint...</option>
          <option value="backlog">Backlog</option>
          <option v-for="s in sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <button v-if="bulkSprintTarget" @click="bulkMoveToSprint" class="px-3 py-1.5 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 transition">Move</button>
        <button @click="bulkDelete" class="px-3 py-1.5 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition ml-auto">Delete</button>
        <button @click="selectedIssues = []" class="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition">Clear</button>
      </div>
    </Transition>

    <!-- Main Scrollable Content -->
    <div class="flex-grow overflow-y-auto px-3 md:px-6 pb-6 space-y-3 md:space-y-4">
      
      <!-- Sprint Sections -->
      <div v-for="sprint in sortedSprints" :key="sprint.id" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-sm transition-all duration-200">
        <!-- Sprint Header -->
        <div
          class="px-4 py-3 min-h-[48px] flex items-center justify-between gap-3 cursor-pointer select-none"
          :class="sprint.status === 'ACTIVE' ? 'bg-green-50/50 dark:bg-green-900/10 border-b border-green-100 dark:border-green-900/30' : 'bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700'"
          @click="toggleCollapse(sprint.id)"
        >
          <div class="flex items-center gap-3 min-w-0">
            <svg
              class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200 flex-shrink-0"
              :class="{ '-rotate-90': collapsedSprints.has(sprint.id) }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            ><polyline points="6 9 12 15 18 9"/></svg>

            <h3 class="text-sm font-bold text-slate-800 dark:text-white truncate">{{ sprint.name }}</h3>
            
            <span
              class="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex-shrink-0"
              :class="sprintStatusClass(sprint.status)"
            >{{ sprint.status }}</span>

            <span v-if="sprint.goal" class="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[200px] hidden lg:inline">
              {{ sprint.goal }}
            </span>
          </div>

          <div class="flex items-center gap-2 flex-shrink-0" @click.stop>
            <span class="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              {{ (sprint.issues || []).length }} issues
            </span>
            <span v-if="sprint.startDate || sprint.endDate" class="text-[10px] text-slate-400 dark:text-slate-500 hidden md:inline">
              {{ sprint.startDate ? formatDate(sprint.startDate) : '?' }} → {{ sprint.endDate ? formatDate(sprint.endDate) : '?' }}
            </span>

            <!-- Sprint Actions -->
            <SprintActionsDropdown :sprint="sprint" @action="handleSprintAction(sprint, $event)" />
          </div>
        </div>

        <!-- Sprint Issues (Draggable) -->
        <div v-show="!collapsedSprints.has(sprint.id)">
          <VueDraggable
            v-model="sprint.issues"
            :key="sprint.id + '-' + dragKey"
            :disabled="hasActiveFilters"
            group="backlog-issues"
            :animation="200"
            ghost-class="backlog-ghost"
            drag-class="backlog-drag"
            class="p-2 min-h-[48px] space-y-1"
            @add="(evt) => onSprintAdd(evt, sprint.id)"
          >
            <BacklogIssueCard
              v-for="issue in filteredSprintIssues(sprint)"
              :key="issue.id"
              :issue="issue"
              :data-id="issue.id"
              :selected="selectedIssues.includes(issue.id)"
              @toggle-select="toggleSelect"
            />
          </VueDraggable>
          <div v-if="filteredSprintIssues(sprint).length === 0" class="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-500 italic">
            {{ hasActiveFilters ? 'No issues match filters' : 'Drag issues here to plan this sprint' }}
          </div>
        </div>
      </div>

      <!-- Backlog Section -->
      <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-sm overflow-hidden">
        <div
          class="px-4 py-3 bg-slate-800 dark:bg-slate-900 flex items-center justify-between cursor-pointer select-none"
          @click="backlogCollapsed = !backlogCollapsed"
        >
          <div class="flex items-center gap-3">
            <svg
              class="w-3.5 h-3.5 text-slate-400 transition-transform duration-200"
              :class="{ '-rotate-90': backlogCollapsed }"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            ><polyline points="6 9 12 15 18 9"/></svg>
            <h3 class="text-sm font-bold text-white">Backlog</h3>
            <span class="text-[11px] text-slate-400 font-medium">{{ filteredBacklogIssues.length }} issues</span>
          </div>
        </div>

        <div v-show="!backlogCollapsed">
          <VueDraggable
            v-model="backlogIssues"
            :key="'backlog-' + dragKey"
            :disabled="hasActiveFilters"
            group="backlog-issues"
            :animation="200"
            ghost-class="backlog-ghost"
            drag-class="backlog-drag"
            class="p-2 min-h-[48px] space-y-1"
            @add="onBacklogAdd"
          >
            <BacklogIssueCard
              v-for="issue in filteredBacklogIssues"
              :key="issue.id"
              :issue="issue"
              :data-id="issue.id"
              :selected="selectedIssues.includes(issue.id)"
              @toggle-select="toggleSelect"
            />
          </VueDraggable>
          <div v-if="filteredBacklogIssues.length === 0" class="px-4 py-8 text-center text-xs text-slate-400 dark:text-slate-500 italic">
            {{ hasActiveFilters ? 'No issues match filters' : 'No issues in backlog. Create cards from the Board view.' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Sprint Stats Drawer -->
    <AppDrawer v-model="showStatsDrawer" title="Sprint Statistics" side="right" width="max-w-md">
      <div v-if="activeSprintStats" class="p-4">
        <SprintStatsCard :stats="activeSprintStats" />
      </div>
      <div v-else class="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>No active sprint stats available.</p>
        <p class="mt-1">Start a sprint to see statistics here.</p>
      </div>
    </AppDrawer>

    <!-- Sprint Edit Dialog -->
    <SprintEditDialog
      v-model="showEditDialog"
      :sprint="editingSprint"
      @submit="handleSprintSubmit"
    />

    <!-- Sprint Complete Dialog -->
    <SprintCompleteDialog
      v-model="showCompleteDialog"
      :sprint="completingSprint"
      :sprints="sprints"
      @complete="handleCompleteSprint"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectStore } from '../store/project';
import { VueDraggable } from 'vue-draggable-plus';
import AppDrawer from '../components/ui/AppDrawer.vue';
import BacklogIssueCard from '../components/backlog/BacklogIssueCard.vue';
import SprintActionsDropdown from '../components/sprint/SprintActionsDropdown.vue';
import SprintEditDialog from '../components/sprint/SprintEditDialog.vue';
import SprintCompleteDialog from '../components/sprint/SprintCompleteDialog.vue';
import SprintStatsCard from '../components/sprint/SprintStatsCard.vue';
import api from '../services/api';
import { useToastStore } from '../store/toast';
import { socket, joinProject, leaveProject } from '../services/socket';

export default defineComponent({
  name: 'BacklogPlanner',
  components: { VueDraggable, AppDrawer, BacklogIssueCard, SprintActionsDropdown, SprintEditDialog, SprintCompleteDialog, SprintStatsCard },
  setup() {
    const route = useRoute();
    const projectStore = useProjectStore();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    // Data
    const sprints = ref<any[]>([]);
    const backlogIssues = ref<any[]>([]);
    const assignees = ref<any[]>([]);

    // UI State
    const collapsedSprints = ref(new Set<string>());
    const backlogCollapsed = ref(false);
    const selectedIssues = ref<string[]>([]);
    const bulkSprintTarget = ref('');
    const showStatsDrawer = ref(false);
    const activeSprintStats = ref<any>(null);
    const dragKey = ref(0);

    // Filters
    const searchQuery = ref('');
    const filterType = ref('');
    const filterPriority = ref('');
    const filterAssignee = ref('');

    // Dialogs
    const showEditDialog = ref(false);
    const editingSprint = ref<any>(null);
    const showCompleteDialog = ref(false);
    const completingSprint = ref<any>(null);

    const hasActiveFilters = computed(() => !!(searchQuery.value || filterType.value || filterPriority.value || filterAssignee.value));

    const sortedSprints = computed(() => {
      const order: Record<string, number> = { ACTIVE: 0, FUTURE: 1, COMPLETED: 2 };
      return [...sprints.value].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
    });

    const filterIssues = (issues: any[]) => {
      let result = issues;
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        result = result.filter((i) => i.summary?.toLowerCase().includes(q) || i.key?.toLowerCase().includes(q));
      }
      if (filterType.value) result = result.filter((i) => i.type === filterType.value);
      if (filterPriority.value) result = result.filter((i) => i.priority === filterPriority.value);
      if (filterAssignee.value) {
        if (filterAssignee.value === 'unassigned') result = result.filter((i) => !i.assigneeId);
        else result = result.filter((i) => i.assigneeId === filterAssignee.value);
      }
      return result;
    };

    const filteredSprintIssues = (sprint: any) => filterIssues(sprint.issues || []);
    const filteredBacklogIssues = computed(() => filterIssues(backlogIssues.value));

    const clearFilters = () => {
      searchQuery.value = '';
      filterType.value = '';
      filterPriority.value = '';
      filterAssignee.value = '';
    };

    // Data loading
    const loadData = async () => {
      if (!projectId.value) return;
      try {
        const [sprintRes, issuesRes] = await Promise.all([
          api.get(`/projects/${projectId.value}/sprints`),
          api.get(`/projects/${projectId.value}/issues`, { params: { sprintId: 'null' } }),
        ]);
        if (sprintRes.data.success) sprints.value = sprintRes.data.data;
        if (issuesRes.data.success) backlogIssues.value = issuesRes.data.data;

        // Extract unique assignees
        const allIssues = [...(sprintRes.data.data?.flatMap((s: any) => s.issues || []) || []), ...(issuesRes.data.data || [])];
        const seen = new Set<string>();
        assignees.value = allIssues
          .filter((i: any) => i.assignee && !seen.has(i.assigneeId) && seen.add(i.assigneeId))
          .map((i: any) => i.assignee);
        dragKey.value++;
      } catch (err) {
        console.error('Failed to load backlog data:', err);
      }
    };

    const loadSprintStats = async () => {
      const active = sprints.value.find((s) => s.status === 'ACTIVE');
      if (!active) { activeSprintStats.value = null; return; }
      try {
        const res = await api.get(`/sprints/${active.id}/stats`);
        if (res.data.success) activeSprintStats.value = res.data.data;
      } catch { activeSprintStats.value = null; }
    };

    watch(projectId, loadData, { immediate: true });
    watch(() => sprints.value, loadSprintStats, { deep: true });

    // Drag & Drop targeted handlers
    const onSprintAdd = async (evt: any, sprintId: string) => {
      const issueId = evt.item.getAttribute('data-id');
      if (!issueId) return;
      try {
        await api.patch(`/issues/${issueId}`, { sprintId });
        // Update local issue properties
        const allIssues = [...backlogIssues.value, ...sprints.value.flatMap(s => s.issues || [])];
        const issue = allIssues.find(i => i.id === issueId);
        if (issue) issue.sprintId = sprintId;
      } catch (err: any) {
        console.error('Failed to move issue to sprint:', err);
        const errMsg = err.response?.data?.message || 'Failed to move issue to sprint';
        toast.error(errMsg);
        await loadData();
      }
    };

    const onBacklogAdd = async (evt: any) => {
      const issueId = evt.item.getAttribute('data-id');
      if (!issueId) return;
      try {
        await api.patch(`/issues/${issueId}`, { sprintId: null });
        // Update local issue properties
        const allIssues = [...backlogIssues.value, ...sprints.value.flatMap(s => s.issues || [])];
        const issue = allIssues.find(i => i.id === issueId);
        if (issue) issue.sprintId = null;
      } catch (err: any) {
        console.error('Failed to move issue to backlog:', err);
        const errMsg = err.response?.data?.message || 'Failed to move issue to backlog';
        toast.error(errMsg);
        await loadData();
      }
    };

    // Sprint Actions
    const handleSprintAction = async (sprint: any, action: string) => {
      switch (action) {
        case 'start':
          try {
            await api.post(`/sprints/${sprint.id}/start`);
            await loadData();
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to start sprint');
          }
          break;
        case 'complete':
          completingSprint.value = sprint;
          showCompleteDialog.value = true;
          break;
        case 'reopen':
          try {
            await api.post(`/sprints/${sprint.id}/reopen`);
            await loadData();
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to reopen sprint');
          }
          break;
        case 'edit':
          editingSprint.value = sprint;
          showEditDialog.value = true;
          break;
        case 'stats':
          try {
            const res = await api.get(`/sprints/${sprint.id}/stats`);
            if (res.data.success) activeSprintStats.value = res.data.data;
            showStatsDrawer.value = true;
          } catch { /* ignore */ }
          break;
        case 'archive':
          try {
            await api.post(`/sprints/${sprint.id}/archive`);
            await loadData();
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to archive sprint');
          }
          break;
        case 'restore':
          try {
            await api.post(`/sprints/${sprint.id}/restore`);
            await loadData();
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to restore sprint');
          }
          break;
        case 'delete':
          if (!confirm(`Delete sprint "${sprint.name}"? Issues will be moved to backlog.`)) return;
          try {
            await api.delete(`/sprints/${sprint.id}`);
            await loadData();
          } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete sprint');
          }
          break;
      }
    };

    const openCreateSprint = () => {
      editingSprint.value = null;
      showEditDialog.value = true;
    };

    const handleSprintSubmit = async (form: any) => {
      try {
        if (editingSprint.value) {
          await api.patch(`/sprints/${editingSprint.value.id}`, form);
        } else {
          await api.post(`/projects/${projectId.value}/sprints`, form);
        }
        await loadData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to save sprint');
      }
    };

    const handleCompleteSprint = async (data: { targetSprintId: string | null }) => {
      if (!completingSprint.value) return;
      try {
        await api.post(`/sprints/${completingSprint.value.id}/complete`, data);
        completingSprint.value = null;
        await loadData();
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to complete sprint');
      }
    };

    // Selection
    const toggleSelect = (issueId: string) => {
      const idx = selectedIssues.value.indexOf(issueId);
      if (idx >= 0) selectedIssues.value.splice(idx, 1);
      else selectedIssues.value.push(issueId);
    };

    const toggleCollapse = (sprintId: string) => {
      if (collapsedSprints.value.has(sprintId)) collapsedSprints.value.delete(sprintId);
      else collapsedSprints.value.add(sprintId);
    };

    // Bulk operations
    const bulkMoveToSprint = async () => {
      if (selectedIssues.value.length === 0 || !bulkSprintTarget.value) return;
      try {
        await api.post('/issues/bulk-move-sprint', {
          issueIds: selectedIssues.value,
          sprintId: bulkSprintTarget.value === 'backlog' ? null : bulkSprintTarget.value,
        });
        selectedIssues.value = [];
        bulkSprintTarget.value = '';
        await loadData();
        toast.success('Issues moved successfully');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to move issues');
      }
    };

    const bulkDelete = async () => {
      if (selectedIssues.value.length === 0) return;
      if (!confirm(`Delete ${selectedIssues.value.length} issues?`)) return;
      try {
        await api.post('/issues/bulk-delete', { issueIds: selectedIssues.value });
        selectedIssues.value = [];
        await loadData();
        toast.success('Issues deleted successfully');
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to delete issues');
      }
    };

    // Helpers
    const sprintStatusClass = (status: string) => {
      const map: Record<string, string> = {
        ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        FUTURE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        COMPLETED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
        ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
      };
      return map[status] || 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // Socket realtime sync
    const socketEvents = [
      'sprint:created', 'sprint:updated', 'sprint:started',
      'sprint:completed', 'sprint:reopened', 'sprint:archived',
      'sprint:restored', 'sprint:deleted', 'issue:updated',
    ];

    onMounted(() => {
      if (projectId.value) joinProject(projectId.value);
      socketEvents.forEach((event) => socket.on(event, loadData));
    });

    onUnmounted(() => {
      if (projectId.value) leaveProject(projectId.value);
      socketEvents.forEach((event) => socket.off(event, loadData));
    });

    return {
      projectStore, sprints, backlogIssues, assignees,
      collapsedSprints, backlogCollapsed, selectedIssues, bulkSprintTarget,
      showStatsDrawer, activeSprintStats,
      searchQuery, filterType, filterPriority, filterAssignee,
      hasActiveFilters, sortedSprints, filteredSprintIssues, filteredBacklogIssues,
      clearFilters, onSprintAdd, onBacklogAdd,
      showEditDialog, editingSprint, showCompleteDialog, completingSprint,
      handleSprintAction, openCreateSprint, handleSprintSubmit, handleCompleteSprint,
      toggleSelect, toggleCollapse, bulkMoveToSprint, bulkDelete,
      sprintStatusClass, formatDate, dragKey,
    };
  },
});
</script>

<style scoped>
.backlog-ghost {
  opacity: 0.4;
  background: rgb(249 115 22 / 0.1);
  border: 2px dashed rgb(249 115 22 / 0.4);
  border-radius: 0.5rem;
}
.backlog-drag {
  opacity: 0.9;
  transform: rotate(1deg);
  box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.2);
}
</style>
