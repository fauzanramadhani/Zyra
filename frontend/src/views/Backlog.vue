<template>
  <div class="flex-grow p-6 flex flex-col h-screen overflow-hidden text-[#172B4D] dark:text-slate-200">
    
    <!-- Header -->
    <div class="flex justify-between items-center mb-6">
      <div>
        <h1 class="text-xl font-bold text-slate-800 dark:text-white">{{ projectStore.currentProject?.name || 'Project' }} Backlog</h1>
        <p class="text-xs text-slate-400">Plan work, schedule sprints, and organize your product backlog</p>
      </div>

      <button
        @click="showCreateSprintModal = true"
        class="px-4 py-2 bg-zyra-primary hover:bg-zyra-primary-hover text-white text-sm font-bold rounded-lg shadow transition"
      >
        Create Sprint
      </button>
    </div>

    <!-- Main List Scroll Container -->
    <div class="flex-grow overflow-y-auto space-y-6 pr-1">
      
      <!-- Sprints Section -->
      <div v-for="sprint in sprints" :key="sprint.id" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder overflow-hidden">
        <div class="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-zyra-gray-darkBorder flex justify-between items-center flex-wrap gap-2">
          <div class="flex items-center gap-3">
            <h3 class="font-bold text-sm text-slate-800 dark:text-white">{{ sprint.name }}</h3>
            <span
              class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
              :class="sprintStatusClass(sprint.status)"
            >
              {{ sprint.status }}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-xs text-slate-400 font-medium mr-2">
              {{ sprint.issues?.length || 0 }} issues
            </span>
            <button
              v-if="sprint.status === 'ACTIVE'"
              @click="openCompleteSprintModal(sprint)"
              class="px-3 py-1 bg-zyra-primary hover:bg-zyra-primary-hover text-white text-xs font-bold rounded shadow transition"
            >
              Complete Sprint
            </button>
            <button
              v-else-if="sprint.status === 'FUTURE'"
              @click="startSprint(sprint.id)"
              class="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded shadow transition"
            >
              Start Sprint
            </button>
          </div>
        </div>

        <!-- Issues List inside Sprint -->
        <div class="divide-y divide-gray-150 dark:divide-slate-700 p-2 min-h-[50px] bg-slate-50/20 dark:bg-slate-800/20">
          <div v-if="!sprint.issues || sprint.issues.length === 0" class="py-4 text-center text-xs text-slate-400">
            Drag issues here or use the selector to assign tasks to this sprint
          </div>

          <div
            v-for="issue in sprint.issues"
            :key="issue.id"
            class="flex justify-between items-center p-3 bg-white dark:bg-zyra-gray-darkCard hover:bg-slate-50 dark:hover:bg-slate-700 transition border border-transparent dark:border-slate-700 rounded-lg mb-1 last:mb-0 shadow-sm"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-500 font-extrabold text-[8px] tracking-wider">
                {{ issue.type }}
              </span>
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wide flex-shrink-0">{{ issue.key }}</span>
              <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[400px]">{{ issue.summary }}</p>
            </div>

            <div class="flex items-center gap-3 flex-shrink-0">
              <!-- Reassign Sprint dropdown -->
              <select
                @change="reassignIssueSprint(issue.id, $event)"
                class="border border-gray-200 dark:border-slate-600 rounded px-2 py-0.5 text-[10px] bg-white dark:bg-slate-800 dark:text-slate-200 outline-none"
              >
                <option :value="sprint.id" selected>{{ sprint.name }}</option>
                <option value="backlog">Backlog</option>
                <option v-for="s in otherSprints(sprint.id)" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Backlog Section -->
      <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder overflow-hidden">
        <div class="px-5 py-4 bg-slate-900 text-white flex justify-between items-center">
          <h3 class="font-bold text-sm">{{ projectStore.currentProject?.name || 'Product' }} Backlog</h3>
          <span class="text-xs text-slate-400">{{ backlogIssues.length }} issues in backlog</span>
        </div>

        <div class="divide-y divide-gray-150 dark:divide-slate-700 p-2">
          <div v-if="backlogIssues.length === 0" class="py-12 text-center text-xs text-slate-400">
            No issues found in backlog. Create cards using the board view.
          </div>

          <div
            v-for="issue in backlogIssues"
            :key="issue.id"
            class="flex justify-between items-center p-3 bg-white dark:bg-zyra-gray-darkCard hover:bg-slate-50 dark:hover:bg-slate-700 transition border border-transparent dark:border-slate-700 rounded-lg mb-1 last:mb-0 shadow-sm"
          >
            <div class="flex items-center gap-3 min-w-0">
              <span class="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-500 font-extrabold text-[8px] tracking-wider">
                {{ issue.type }}
              </span>
              <span class="text-xs font-bold text-slate-400 uppercase tracking-wide flex-shrink-0">{{ issue.key }}</span>
              <p class="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[400px]">{{ issue.summary }}</p>
            </div>

            <div class="flex items-center gap-3 flex-shrink-0">
              <select
                @change="reassignIssueSprint(issue.id, $event)"
                class="border border-gray-200 dark:border-slate-600 rounded px-2 py-0.5 text-[10px] bg-white dark:bg-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="backlog" selected>Backlog</option>
                <option v-for="s in sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

    </div>

    <!-- Complete Sprint Modal -->
    <AppDialog v-model="showCompleteSprintModal" title="Complete Sprint" :description="`Complete: ${selectedSprint?.name}. Any open, incomplete issues will be automatically re-allocated.`" size="sm">
      <form @submit.prevent="completeSprint" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 mb-1.5">Move incomplete issues to</label>
          <select v-model="targetSprintId" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 outline-none">
            <option value="null">Backlog</option>
            <option v-for="s in futureSprints" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
      </form>
      <template #footer="{ close }">
        <button type="button" @click="close" class="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">Cancel</button>
        <button @click="completeSprint" class="px-4 py-1.5 bg-zyra-primary text-white text-xs font-bold rounded hover:bg-zyra-primary-hover shadow-sm">Complete Sprint</button>
      </template>
    </AppDialog>

    <!-- Create Sprint Modal -->
    <AppDialog v-model="showCreateSprintModal" title="Create New Sprint" size="sm">
      <form @submit.prevent="createSprint" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sprint Name</label>
          <input type="text" v-model="newSprintName" required placeholder="e.g. PHX Sprint 2" maxlength="80" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none" />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Goal / Description</label>
          <textarea v-model="newSprintGoal" rows="2" placeholder="e.g. Finalize login page styles" maxlength="500" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none"></textarea>
        </div>
      </form>
      <template #footer="{ close }">
        <button type="button" @click="close" class="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">Cancel</button>
        <button @click="createSprint" class="px-4 py-1.5 bg-zyra-primary text-white text-xs font-bold rounded hover:bg-zyra-primary-hover shadow-sm">Create</button>
      </template>
    </AppDialog>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectStore } from '../store/project';
import AppDialog from '../components/ui/AppDialog.vue';
import api from '../services/api';

export default defineComponent({
  name: 'BacklogPlanner',
  components: { AppDialog },
  setup() {
    const route = useRoute();
    const projectStore = useProjectStore();

    const sprints = ref<any[]>([]);
    const backlogIssues = ref<any[]>([]);

    // Sprint creation modal
    const showCreateSprintModal = ref(false);
    const newSprintName = ref('');
    const newSprintGoal = ref('');

    // Sprint complete modal
    const showCompleteSprintModal = ref(false);
    const selectedSprint = ref<any>(null);
    const targetSprintId = ref('null');

    const projectId = computed(() => route.params.projectId as string);

    const loadPlannerData = async () => {
      if (!projectId.value) return;

      try {
        // Fetch sprints
        const sprintRes = await api.get(`/projects/${projectId.value}/sprints`);
        if (sprintRes.data.success) {
          sprints.value = sprintRes.data.data;
        }

        // Fetch backlog issues (issues with sprintId = null)
        const issuesRes = await api.get(`/projects/${projectId.value}/issues`, {
          params: { sprintId: 'null' },
        });
        if (issuesRes.data.success) {
          backlogIssues.value = issuesRes.data.data;
        }
      } catch (err) {
        console.error('Failed to load planner data:', err);
      }
    };

    watch(projectId, loadPlannerData, { immediate: true });

    const createSprint = async () => {
      try {
        const response = await api.post(`/projects/${projectId.value}/sprints`, {
          name: newSprintName.value,
          goal: newSprintGoal.value,
        });

        if (response.data.success) {
          showCreateSprintModal.value = false;
          newSprintName.value = '';
          newSprintGoal.value = '';
          await loadPlannerData();
        }
      } catch (err) {
        console.error('Failed to create sprint:', err);
      }
    };

    const startSprint = async (sprintId: string) => {
      try {
        await api.patch(`/sprints/${sprintId}`, {
          status: 'ACTIVE',
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
        await loadPlannerData();
      } catch (err) {
        console.error('Failed to start sprint:', err);
      }
    };

    const openCompleteSprintModal = (sprint: any) => {
      selectedSprint.value = sprint;
      showCompleteSprintModal.value = true;
    };

    const completeSprint = async () => {
      if (!selectedSprint.value) return;

      const targetVal = targetSprintId.value === 'null' ? null : targetSprintId.value;
      try {
        await api.post(`/sprints/${selectedSprint.value.id}/complete`, {
          targetSprintId: targetVal,
        });

        showCompleteSprintModal.value = false;
        selectedSprint.value = null;
        targetSprintId.value = 'null';
        await loadPlannerData();
      } catch (err) {
        console.error('Failed to complete sprint:', err);
      }
    };

    const reassignIssueSprint = async (issueId: string, event: Event) => {
      const selectEl = event.target as HTMLSelectElement;
      const targetVal = selectEl.value;
      const sprintId = targetVal === 'backlog' ? null : targetVal;

      try {
        await api.patch(`/issues/${issueId}`, { sprintId });
        await loadPlannerData();
      } catch (err) {
        console.error('Failed to reassign issue sprint:', err);
        selectEl.value = 'backlog'; // fallback visual selection
      }
    };

    const otherSprints = (excludeId: string) => {
      return sprints.value.filter((s) => s.id !== excludeId);
    };

    const futureSprints = computed(() => {
      return sprints.value.filter((s) => s.status === 'FUTURE');
    });

    const sprintStatusClass = (status: string) => {
      if (status === 'ACTIVE') return 'bg-green-100 text-green-700';
      if (status === 'COMPLETED') return 'bg-gray-200 text-gray-600';
      return 'bg-blue-100 text-blue-700';
    };

    return {
      projectStore,
      sprints,
      backlogIssues,
      showCreateSprintModal,
      newSprintName,
      newSprintGoal,
      createSprint,
      startSprint,
      showCompleteSprintModal,
      selectedSprint,
      targetSprintId,
      openCompleteSprintModal,
      completeSprint,
      reassignIssueSprint,
      otherSprints,
      futureSprints,
      sprintStatusClass,
    };
  },
});
</script>
