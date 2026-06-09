<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-[#172B4D] dark:text-slate-200">

    <!-- Top Filter Header -->
    <div class="flex justify-between items-center mb-4 md:mb-6">
      <div>
        <h1 class="text-base md:text-xl font-bold text-slate-800 dark:text-white truncate">
          {{ projectStore.currentProject?.name || 'Loading Project...' }} Board
        </h1>
        <p class="text-[10px] md:text-xs text-slate-400 hidden sm:block">Kanban Board — Drag cards to precise positions</p>
      </div>
      <button
        @click="showCreateModal = true"
        class="px-3 md:px-4 py-2 bg-zyra-primary hover:bg-zyra-primary-hover text-white text-xs md:text-sm font-bold rounded-lg shadow transition flex-shrink-0"
      >
        <span class="hidden sm:inline">Create Issue</span>
        <span class="sm:hidden">+ New</span>
      </button>
    </div>

    <!-- Filters Row -->
    <div class="flex flex-wrap gap-2 md:gap-3 items-center mb-4 md:mb-6 p-3 md:p-4 bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-gray-200 dark:border-zyra-gray-darkBorder shadow-sm">
      <div class="relative w-full sm:w-48 md:w-64">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
          <SearchIcon class="w-4 h-4" />
        </span>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search issues..."
          class="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg outline-none focus:ring-1 focus:ring-zyra-primary focus:border-transparent bg-slate-50 dark:bg-slate-800 dark:text-slate-200"
        />
      </div>

      <!-- Sprint filter -->
      <select
        v-model="selectedSprintId"
        @change="loadBoard"
        class="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 dark:text-slate-200 outline-none w-full sm:w-auto sm:min-w-[160px]"
      >
        <option value="">All Sprints</option>
        <option value="backlog">📦 Backlog only</option>
        <option v-for="sprint in projectSprints" :key="sprint.id" :value="sprint.id">
          {{ sprint.name }} <span v-if="sprint.status === 'ACTIVE'">🟢</span>
        </option>
      </select>

      <select v-model="filterType" class="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 dark:text-slate-200 outline-none w-[calc(50%-4px)] sm:w-auto">
        <option value="">All Types</option>
        <option value="STORY">Stories</option>
        <option value="TASK">Tasks</option>
        <option value="BUG">Bugs</option>
        <option value="EPIC">Epics</option>
      </select>

      <select v-model="filterPriority" class="border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 dark:text-slate-200 outline-none w-[calc(50%-4px)] sm:w-auto">
        <option value="">All Priorities</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="HIGHEST">Highest</option>
      </select>

      <button
        v-if="searchQuery || filterType || filterPriority"
        @click="resetFilters"
        class="text-xs text-zyra-primary font-bold hover:underline"
      >
        Clear Filters
      </button>

      <!-- Item count badge -->
      <div class="ml-auto flex items-center gap-2">
        <span class="text-[10px] text-slate-400 font-medium hidden sm:inline">
          {{ totalIssueCount }} issue{{ totalIssueCount !== 1 ? 's' : '' }} visible
        </span>
        <!-- Drag Disabled Warning -->
        <div
          v-if="hasActiveFilters"
          class="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 px-2.5 py-1 rounded-lg"
        >
          <span>⚠</span>
          <span>Drag & drop disabled while filters are active</span>
        </div>
      </div>
    </div>

    <!-- Board columns grid -->
    <div v-if="projectStore.currentBoard" class="flex-grow flex gap-3 md:gap-4 overflow-x-auto pb-4 items-stretch select-none snap-x snap-mandatory scroll-smooth" ref="boardScrollRef">
      <div
        v-for="(col, colIdx) in projectStore.currentBoard.columns"
        :key="col.id"
        class="w-[85vw] sm:w-64 md:w-72 flex-shrink-0 bg-slate-100 dark:bg-zyra-gray-darkCard rounded-xl p-2 md:p-3 flex flex-col max-h-full border border-slate-200 dark:border-zyra-gray-darkBorder transition-colors snap-start"
        :class="{ 'border-orange-400 bg-orange-50/30': isDraggingOver === col.id }"
      >
        <!-- Column title header -->
        <div class="flex justify-between items-center mb-3.5 px-1">
          <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>{{ col.name }}</span>
            <span class="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-[10px] font-bold">
              {{ hasActiveFilters ? col.issues.filter(cardMatchesFilter).length : col.issues.length }}
            </span>
          </h3>
        </div>

        <!-- Issue Cards — Vue Draggable (vue-draggable-plus uses v-for directly inside) -->
        <VueDraggable
          v-model="col.issues"
          :group="{ name: 'issues', pull: !hasActiveFilters, put: !hasActiveFilters }"
          :animation="col.issues.length > 80 ? 0 : 150"
          :disabled="hasActiveFilters"
          ghost-class="drag-ghost"
          chosen-class="drag-chosen"
          drag-class="drag-active"
          class="column-scroll flex-grow overflow-y-auto pr-0.5 min-h-[60px]"
          @start="(evt) => onDragStart(col, evt)"
          @end="onDragEnd"
          @add="(evt) => onCardAdded(evt, col)"
          @update="(evt) => onCardReordered(evt, col)"
        >
          <!-- Cards rendered with v-for directly inside VueDraggable (correct vue-draggable-plus API) -->
          <div
            v-for="card in col.issues"
            :key="card.id"
            v-show="cardMatchesFilter(card)"
            :data-id="card.id"
            class="board-card bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 shadow-sm hover:shadow-md hover:border-orange-300 cursor-grab active:cursor-grabbing flex flex-col justify-between group mb-2.5"
            :class="[priorityBorderClass(card.priority)]"
            @click.stop="openIssueDetails(card.id)"
          >
            <!-- Blocked indicator -->
            <span
              v-if="card.isBlocked"
              class="inline-flex items-center gap-1 px-1.5 py-0.5 mb-1 rounded text-[9px] font-bold uppercase tracking-wide bg-red-100 text-red-700 border border-red-200 w-fit"
              title="This issue is blocked"
            >
              <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
              Blocked
            </span>
            <!-- Card title -->
            <h4 class="text-sm font-semibold text-slate-700 dark:text-slate-200 line-clamp-2 leading-snug mb-1">{{ card.summary }}</h4>

            <!-- SLA Badge Row -->
            <div v-if="card.slaTrackers && card.slaTrackers.length > 0" class="flex flex-wrap gap-1.5 mt-1.5 mb-1 select-none">
              <template v-for="sla in card.slaTrackers" :key="sla.id">
                <span 
                  v-if="sla.startWorkStatus !== 'NONE'"
                  class="px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1"
                  :class="slaBadgeClass(sla.startWorkStatus)"
                  :title="`Start Work SLA target: ${sla.startWorkTargetMinutes}m`"
                >
                  Start: {{ formatSlaTime(sla.startWorkStatus, sla.remainingStartWorkMs, sla.overdueStartWorkMs) }}
                </span>
                <span 
                  v-if="sla.resolutionStatus !== 'NONE'"
                  class="px-1.5 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1"
                  :class="slaBadgeClass(sla.resolutionStatus)"
                  :title="`Resolution SLA target: ${sla.resolutionTargetMinutes}m`"
                >
                  Res: {{ formatSlaTime(sla.resolutionStatus, sla.remainingResolutionMs, sla.overdueResolutionMs) }}
                </span>
              </template>
            </div>

            <div class="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-700 mt-2.5">
              <div class="flex items-center gap-2">
                <span class="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider" :class="typeClass(card.type)">
                  {{ card.type }}
                </span>
                <span class="text-[10px] font-bold text-slate-400 uppercase">{{ card.key }}</span>
              </div>

              <div class="flex items-center gap-2">
                <!-- Priority dot -->
                <span :class="priorityDotClass(card.priority)" class="w-2 h-2 rounded-full" :title="card.priority"></span>
                <!-- Story Points -->
                <span
                  v-if="card.storyPoints !== null && card.storyPoints !== undefined"
                  class="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center"
                  title="Story Points"
                >
                  {{ card.storyPoints }}
                </span>
                <!-- Assignee Avatar -->
                <UserAvatar
                  v-if="card.assignee"
                  :src="card.assignee.avatarUrl || ''"
                  :firstName="card.assignee.firstName"
                  :lastName="card.assignee.lastName"
                  sizeClass="w-6 h-6"
                  :title="`${card.assignee.firstName} ${card.assignee.lastName}`"
                />
                <span v-else class="w-6 h-6 rounded-full border border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-[10px] text-gray-400" title="Unassigned">
                  👤
                </span>
              </div>
            </div>
          </div>
        </VueDraggable>

        <!-- Empty column placeholder shown when no issues -->
        <div
          v-if="col.issues.length === 0"
          class="flex items-center justify-center h-16 text-xs text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-lg mt-1"
        >
          Drop cards here
        </div>
      </div>

      <!-- Mobile column indicator (dots) -->
      <div v-if="projectStore.currentBoard" class="flex sm:hidden justify-center gap-1.5 mt-1 pb-1 flex-shrink-0">
        <button
          v-for="(col, idx) in projectStore.currentBoard.columns"
          :key="col.id"
          @click="scrollToColumn(idx)"
          class="w-2 h-2 rounded-full transition-all duration-200"
          :class="activeColIdx === idx ? 'bg-orange-500 w-4' : 'bg-slate-300 dark:bg-slate-600'"
          :aria-label="'Scroll to ' + col.name"
        ></button>
      </div>
    </div>

    <!-- Active Details Modal -->
    <IssueModal
      :isOpen="showDetailsModal"
      :issueId="selectedIssueId"
      :columns="projectStore.currentBoard?.columns || []"
      :members="projectMembers"
      :activeSprints="projectSprints"
      @close="showDetailsModal = false"
      @updated="loadBoard"
    />

    <!-- Quick Issue Creation Dialog -->
    <AppDialog v-model="showCreateModal" title="Create New Issue" size="md">
      <form @submit.prevent="createIssue" class="space-y-4">
        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Summary</label>
          <input type="text" v-model="createSummary" required placeholder="What needs to be done?" maxlength="255" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Issue Type</label>
            <select v-model="createType" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-zyra-primary outline-none bg-white dark:bg-slate-800 dark:text-slate-200">
              <option value="STORY">Story</option>
              <option value="TASK">Task</option>
              <option value="BUG">Bug</option>
              <option value="EPIC">Epic</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Priority</label>
            <select v-model="createPriority" class="w-full border border-gray-300 dark:border-slate-600 rounded px-3 py-2 text-sm focus:ring-1 focus:ring-zyra-primary outline-none bg-white dark:bg-slate-800 dark:text-slate-200">
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="HIGHEST">Highest</option>
            </select>
          </div>
        </div>
      </form>
      <template #footer="{ close }">
        <button type="button" @click="close" class="px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-slate-600">Cancel</button>
        <button @click="createIssue" class="px-3 py-1.5 bg-zyra-primary text-white text-xs font-bold rounded hover:bg-zyra-primary-hover shadow-sm">Create Issue</button>
      </template>
    </AppDialog>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onBeforeUnmount, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectStore } from '../store/project';
import { socket } from '../services/socket';
import api from '../services/api';
import IssueModal from '../components/IssueModal.vue';
import AppDialog from '../components/ui/AppDialog.vue';
import { UserAvatar } from '../components/ui';
import { Search as SearchIcon } from 'lucide-vue-next';
import { VueDraggable } from 'vue-draggable-plus';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'ProjectBoard',
  components: { IssueModal, SearchIcon, VueDraggable, AppDialog, UserAvatar },
  setup() {
    const route = useRoute();
    const projectStore = useProjectStore();
    const toast = useToastStore();

    const searchQuery = ref('');
    const filterType = ref('');
    const filterPriority = ref('');
    const isDraggingOver = ref<string | null>(null);
    const boardScrollRef = ref<HTMLElement | null>(null);
    const activeColIdx = ref(0);

    const showDetailsModal = ref(false);
    const selectedIssueId = ref('');
    const projectMembers = ref<any[]>([]);
    const projectSprints = ref<any[]>([]);

    const showCreateModal = ref(false);
    const createSummary = ref('');
    const createType = ref('TASK');
    const createPriority = ref('MEDIUM');

    const projectId = computed(() => route.params.projectId as string);

    // Sprint filter — scopes board to a specific sprint, dramatically reducing item count
    const selectedSprintId = ref('');

    // Disable drag when filters are active to avoid index mismatch
    const hasActiveFilters = computed(() =>
      !!(searchQuery.value || filterType.value || filterPriority.value)
    );

    // Filter logic for search and dropdowns
    const cardMatchesFilter = (card: any): boolean => {
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        const matchesSummary = card.summary?.toLowerCase().includes(q);
        const matchesKey = card.key?.toLowerCase().includes(q);
        if (!matchesSummary && !matchesKey) return false;
      }
      if (filterType.value && card.type !== filterType.value) return false;
      if (filterPriority.value && card.priority !== filterPriority.value) return false;
      return true;
    };

    // Total visible item count across all columns (respects filters)
    const totalIssueCount = computed(() => {
      if (!projectStore.currentBoard) return 0;
      if (!hasActiveFilters.value) {
        return projectStore.currentBoard.columns.reduce((sum, col) => sum + col.issues.length, 0);
      }
      return projectStore.currentBoard.columns.reduce(
        (sum, col) => sum + col.issues.filter(cardMatchesFilter).length, 0
      );
    });

    const loadBoard = async () => {
      if (projectStore.currentProject?.boards?.[0]) {
        const boardId = projectStore.currentProject.boards[0].id;
        // Pass sprint filter so the API only returns that sprint's issues
        await projectStore.fetchBoard(boardId, selectedSprintId.value || undefined);
      }
    };

    const loadProjectAuxiliaryData = async () => {
      try {
        const memRes = await api.get(`/projects/${projectId.value}`);
        if (memRes.data.success) projectMembers.value = memRes.data.data.members || [];
        const sprintRes = await api.get(`/projects/${projectId.value}/sprints`);
        if (sprintRes.data.success) projectSprints.value = sprintRes.data.data || [];
      } catch (err) {
        console.error('Failed to load project details:', err);
      }
    };

    watch(
      () => projectStore.currentProject,
      async (project) => {
        if (project) {
          await loadBoard();
          await loadProjectAuxiliaryData();
        }
      },
      { immediate: true }
    );

    const resetFilters = () => {
      searchQuery.value = '';
      filterType.value = '';
      filterPriority.value = '';
    };

    // ── Drag State — captured on @start, used in @add / @update ─────────────
    // We capture source column + issue ID at drag START because by the time
    // @add fires, vue-draggable-plus has already mutated the arrays.
    const draggingFromColId = ref<string | null>(null);
    const draggingIssueId = ref<string | null>(null);

    // ── Drag Event Handlers ──────────────────────────────────────────────────

    const onDragStart = (col: any, evt: any) => {
      isDraggingOver.value = col.id;
      draggingFromColId.value = col.id;
      // Capture the issue being dragged using oldIndex (before array mutation)
      draggingIssueId.value = col.issues[evt.oldIndex]?.id ?? null;
      projectStore.snapshotColumns();
    };

    const onDragEnd = () => {
      isDraggingOver.value = null;
    };

    // ── Mobile column navigation ────────────────────────────────────────────────
    const scrollToColumn = (idx: number) => {
      if (!boardScrollRef.value || !projectStore.currentBoard) return;
      const columns = boardScrollRef.value.children;
      if (columns[idx]) {
        columns[idx].scrollIntoView({ behavior: 'smooth', inline: 'start' });
      }
    };

    const updateActiveColIdx = () => {
      if (!boardScrollRef.value || !projectStore.currentBoard) return;
      const container = boardScrollRef.value;
      const scrollCenter = container.scrollLeft + container.clientWidth / 2;
      const cols = Array.from(container.children) as HTMLElement[];
      let closest = 0;
      let minDist = Infinity;
      cols.forEach((col, i) => {
        const dist = Math.abs(col.offsetLeft + col.clientWidth / 2 - scrollCenter);
        if (dist < minDist) { minDist = dist; closest = i; }
      });
      activeColIdx.value = closest;
    };

    let el: HTMLElement | null = null;
    onMounted(() => {
      el = boardScrollRef.value;
      el?.addEventListener('scroll', updateActiveColIdx, { passive: true });
    });

    onBeforeUnmount(() => {
      el?.removeEventListener('scroll', updateActiveColIdx);
    });

    /**
     * Fired when a card crosses into a DIFFERENT column.
     * vue-draggable-plus has already moved the card in the v-model arrays.
     * Use draggingIssueId captured at @start — don't try to search arrays.
     */
    const onCardAdded = async (evt: any, targetCol: any) => {
      const { newIndex } = evt;
      // Prefer the id captured at drag start; fallback to DOM attribute
      const issueId =
        draggingIssueId.value ||
        (evt.item as HTMLElement).getAttribute('data-id') ||
        targetCol.issues[newIndex]?.id;
      if (!issueId) return;

      const fromColId = draggingFromColId.value || targetCol.id;

      const issues: any[] = targetCol.issues;
      const afterIssue  = newIndex > 0                  ? issues[newIndex - 1] : null;
      const beforeIssue = newIndex < issues.length - 1  ? issues[newIndex + 1] : null;

      try {
        await projectStore.moveIssueStatus(
          issueId,
          fromColId,
          targetCol.id,
          beforeIssue?.id ?? null,
          afterIssue?.id  ?? null,
        );
      } catch (err: any) {
        console.error('Failed to move issue:', err);
        const errMsg = err.response?.data?.message || 'Failed to move issue';
        toast.error(errMsg);
      }

      draggingIssueId.value = null;
      draggingFromColId.value = null;
    };

    /**
     * Fired when a card is reordered WITHIN the same column.
     * vue-draggable-plus has already reordered col.issues optimistically.
     */
    const onCardReordered = async (evt: any, col: any) => {
      const { newIndex } = evt;
      const issueId =
        draggingIssueId.value ||
        (evt.item as HTMLElement).getAttribute('data-id') ||
        col.issues[newIndex]?.id;
      if (!issueId) return;

      const issues: any[] = col.issues;
      const afterIssue  = newIndex > 0                  ? issues[newIndex - 1] : null;
      const beforeIssue = newIndex < issues.length - 1  ? issues[newIndex + 1] : null;

      try {
        await projectStore.moveIssueStatus(
          issueId,
          col.id,
          col.id,
          beforeIssue?.id ?? null,
          afterIssue?.id  ?? null,
        );
      } catch (err: any) {
        console.error('Failed to reorder issue:', err);
        const errMsg = err.response?.data?.message || 'Failed to reorder issue';
        toast.error(errMsg);
      }

      draggingIssueId.value = null;
      draggingFromColId.value = null;
    };

    // ── Issue Creation ───────────────────────────────────────────────────────

    const createIssue = async () => {
      if (!createSummary.value.trim() || !projectStore.currentBoard) return;
      const firstColumn = projectStore.currentBoard.columns[0];
      if (!firstColumn) return;

      try {
        await api.post(`/projects/${projectId.value}/issues`, {
          summary: createSummary.value,
          type: createType.value,
          priority: createPriority.value,
          statusId: firstColumn.id,
        });
        showCreateModal.value = false;
        createSummary.value = '';
        createType.value = 'TASK';
        createPriority.value = 'MEDIUM';
        await loadBoard();
      } catch (err: any) {
        console.error('Failed to create issue:', err);
        const errMsg = err.response?.data?.message || 'Failed to create issue';
        toast.error(errMsg);
      }
    };

    const openIssueDetails = (issueId: string) => {
      selectedIssueId.value = issueId;
      showDetailsModal.value = true;
    };

    // When a link is created/deleted, update isBlocked for the target issue
    const handleIssueLinkCreated = (payload: any) => {
      if (!payload || !projectStore.currentBoard) return;
      const { targetId, linkType } = payload;
      if (linkType !== 'BLOCKS') return;
      for (const col of projectStore.currentBoard.columns) {
        const card = col.issues.find((i: any) => i.id === targetId);
        if (card) {
          card.isBlocked = true;
          break;
        }
      }
    };

    const handleIssueLinkDeleted = (payload: any) => {
      if (!payload || !projectStore.currentBoard) return;
      const { targetId, linkType } = payload;
      if (linkType !== 'BLOCKS') return;
      for (const col of projectStore.currentBoard.columns) {
        const card = col.issues.find((i: any) => i.id === targetId);
        if (card) {
          // Re-fetch to check if still blocked by other links
          api.get(`/issues/${targetId}/links`).then((res: any) => {
            const links = res.data?.data || res.data || [];
            card.isBlocked = links.some((l: any) => l.linkType === 'IS_BLOCKED_BY');
          }).catch(() => {});
          break;
        }
      }
    };

    // ── Realtime Socket Listeners ────────────────────────────────────────────

    onMounted(() => {
      socket.on('board:updated', (payload) => projectStore.handleSocketBoardUpdate(payload));
      socket.on('issue:created', (issue) => projectStore.handleSocketIssueCreated(issue));
      socket.on('issue:updated', (issue) => projectStore.handleSocketIssueUpdated(issue));
      socket.on('issue:deleted', (payload) => projectStore.handleSocketIssueDeleted(payload));
      socket.on('issueLink:created', handleIssueLinkCreated);
      socket.on('issueLink:deleted', handleIssueLinkDeleted);
    });

    onUnmounted(() => {
      socket.off('board:updated');
      socket.off('issue:created');
      socket.off('issue:updated');
      socket.off('issue:deleted');
      socket.off('issueLink:created');
      socket.off('issueLink:deleted');
    });

    // ── Style Helpers ────────────────────────────────────────────────────────

    const typeClass = (type: string) => {
      switch (type?.toUpperCase()) {
        case 'BUG': return 'bg-red-50 text-red-500 border border-red-200';
        case 'STORY': return 'bg-green-50 text-green-600 border border-green-200';
        case 'EPIC': return 'bg-purple-50 text-purple-600 border border-purple-200';
        default: return 'bg-blue-50 text-blue-500 border border-blue-200';
      }
    };

    const priorityDotClass = (priority: string) => {
      switch (priority?.toUpperCase()) {
        case 'HIGHEST': return 'bg-red-500';
        case 'HIGH': return 'bg-orange-400';
        case 'MEDIUM': return 'bg-yellow-400';
        default: return 'bg-slate-300';
      }
    };

    const priorityBorderClass = (priority: string) => {
      switch (priority?.toUpperCase()) {
        case 'HIGHEST': return 'border-l-2 border-l-red-400';
        case 'HIGH': return 'border-l-2 border-l-orange-400';
        default: return '';
      }
    };

    return {
      projectStore,
      searchQuery,
      filterType,
      filterPriority,
      hasActiveFilters,
      resetFilters,
      cardMatchesFilter,
      isDraggingOver,
      onDragStart,
      onDragEnd,
      onCardAdded,
      onCardReordered,
      showDetailsModal,
      selectedIssueId,
      projectMembers,
      projectSprints,
      selectedSprintId,
      totalIssueCount,
      openIssueDetails,
      showCreateModal,
      createSummary,
      createType,
      createPriority,
      createIssue,
      typeClass,
      priorityDotClass,
      priorityBorderClass,
      loadBoard,
      boardScrollRef,
      activeColIdx,
      scrollToColumn,
      slaBadgeClass(status: string) {
        switch (status) {
          case 'MET':
            return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-800';
          case 'MET_LATE':
          case 'BREACHED':
            return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800 animate-pulse';
          case 'DUE_SOON':
            return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800';
          default:
            return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
        }
      },
      formatSlaTime(status: string, remainingMs: number | null, overdueMs: number | null) {
        if (status === 'MET') return 'Met';
        if (status === 'MET_LATE') return 'Met Late';
        
        const timeMs = status === 'BREACHED' ? overdueMs : remainingMs;
        if (timeMs === null || timeMs === undefined) return status;
        
        const minutes = Math.floor(timeMs / 1000 / 60);
        if (minutes < 60) {
          return status === 'BREACHED' ? `Overdue ${minutes}m` : `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMins = minutes % 60;
        return status === 'BREACHED' 
          ? `Overdue ${hours}h ${remainingMins}m` 
          : `${hours}h ${remainingMins}m`;
      },
    };
  },
});
</script>

<style scoped>
/* Ghost card at drop destination */
.drag-ghost {
  opacity: 0.35;
  background: #fff7ed;
  border: 2px dashed #f97316 !important;
  border-radius: 0.5rem;
}

/* Card being dragged */
.drag-chosen {
  transform: rotate(1.5deg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15) !important;
  border-color: #f97316 !important;
}

/* Active drag state */
.drag-active {
  cursor: grabbing !important;
}

/*
  Performance-critical styles for 300+ item columns.

  contain: layout style paint
    Tells the browser each card is an isolated layout scope.
    Mutations inside one card (hover shadow, etc.) cannot affect
    sibling cards, so the browser skips re-layout of the whole list.

  will-change: transform
    Promotes each card to its own compositor layer (GPU).
    SortableJS translates cards via CSS transform during animation;
    with their own layer the browser can move them without triggering
    a repaint of ANY other element on the page.

  Note: will-change is removed on drag-end via .board-card:not(.drag-chosen)
  to avoid keeping 300 GPU layers alive when idle.
*/
.board-card {
  position: relative;
  contain: layout style paint;
  will-change: transform;
  /* Remove transition during dragging to prevent competing with SortableJS */
  transition: box-shadow 0.12s ease;
}

.board-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Release GPU layer when card is not being interacted with */
.board-card:not(:hover):not(.drag-chosen) {
  will-change: auto;
}

/*
  Column scroll container:
  overscroll-behavior: contain prevents scroll-chaining to the page
  when the user scrolls inside a column (reduces jank while dragging).
*/
.column-scroll {
  overscroll-behavior: contain;
  scroll-behavior: auto; /* disable smooth scroll during drag for perf */
}

:deep(.sortable-fallback) {
  opacity: 1 !important;
}

:deep(.sortable-drag) {
  opacity: 1 !important;
}
</style>
