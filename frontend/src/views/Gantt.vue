<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200">
    <!-- Header Section -->
    <div class="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          Gantt Chart
          <button @click="showHelp = !showHelp" class="p-1.5 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Toggle Help Guide">
            <HelpCircleIcon class="w-4 h-4" />
          </button>
        </h1>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Timeline schedule mapping and blocker dependency visualization</p>
      </div>

      <div class="flex items-center gap-3">
        <!-- Sprint Selector -->
        <select
          v-model="selectedSprintId"
          @change="fetchGantt"
          class="text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 bg-white dark:bg-slate-850 dark:text-slate-200 outline-none min-w-[150px] h-[36px] shadow-sm font-semibold transition hover:border-slate-350 dark:hover:border-slate-650"
        >
          <option value="">All Sprints</option>
          <option v-for="s in sprintsList" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>

        <!-- Tab Toggle -->
        <div class="flex items-center p-1 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-inner h-[36px]">
          <button
            @click="tab = 'gantt'"
            :class="tab === 'gantt'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200/40 dark:border-slate-600/45 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold'"
            class="px-4 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center gap-1.5"
          >
            <CalendarIcon class="w-3.5 h-3.5" />
            Timeline
          </button>
          <button
            @click="tab = 'deps'"
            :class="tab === 'deps'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm border border-slate-200/40 dark:border-slate-600/45 font-bold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-semibold'"
            class="px-4 py-1.5 rounded-lg text-xs transition-all duration-200 flex items-center gap-1.5"
          >
            <LayersIcon class="w-3.5 h-3.5" />
            Dependencies
          </button>
        </div>
      </div>
    </div>

    <!-- Glassmorphic Info/Help Card -->
    <transition name="fade">
      <div v-if="showHelp" class="mb-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 shadow-sm relative transition duration-300">
        <button @click="showHelp = false" class="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          <XIcon class="w-4 h-4" />
        </button>
        <div class="flex items-start gap-4">
          <div class="w-10 h-10 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <HelpCircleIcon class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0 pr-4">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Gantt & Dependency Guide</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Track project schedules, progress status, and blocker chains. Use this view to plan dates and resolve dependency deadlocks.
            </p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Schedules</span>
                <span class="text-xs text-slate-600 dark:text-slate-350 mt-1 block">Determined by setting start and end dates inside issue cards.</span>
              </div>
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Dependencies</span>
                <span class="text-xs text-slate-600 dark:text-slate-350 mt-1 block">Trace blocked and blocking relationships linking cards.</span>
              </div>
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Critical Path</span>
                <span class="text-xs text-slate-600 dark:text-slate-350 mt-1 block">The sequence of blocking dependencies that dictates project completion time.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Loading Spinner -->
    <div v-if="loading" class="flex-grow flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
    </div>

    <!-- Timeline View -->
    <div v-else-if="tab === 'gantt'" class="flex-grow overflow-hidden bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col min-h-0">
      <div v-if="ganttData.length" class="flex-grow overflow-x-auto">
        <div class="min-w-[950px]">
          <!-- Timeline Header -->
          <div class="flex items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-850 px-4 py-3">
            <div class="w-96 flex-shrink-0 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Issue Details</div>
            <div class="flex-1 flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 px-3 select-none">
              <span v-for="(d, idx) in timelineIntervals" :key="idx" class="w-24 text-center first:text-left last:text-right">
                {{ formatDateShort(d) }}
              </span>
            </div>
          </div>

          <!-- Timeline Rows -->
          <div v-for="item in ganttData" :key="item.id" class="flex items-center border-b border-slate-100 dark:border-slate-700/40 px-4 py-3.5 hover:bg-slate-50/40 dark:hover:bg-slate-750/30 transition">
            <!-- Left Info Panel -->
            <div class="w-96 flex-shrink-0 pr-6 flex flex-col justify-center">
              <div class="flex items-center gap-1.5 mb-1.5">
                <span class="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 tracking-wider">
                  {{ item.key }}
                </span>
                <span v-if="item.sprintName" class="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
                  {{ item.sprintName }}
                </span>
                <span :class="getPriorityClass(item.priority)" class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {{ item.priority }}
                </span>
                <span :class="getStatusClass(item.status)" class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  {{ item.status }}
                </span>
              </div>
              <p class="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1" :title="item.summary">
                {{ item.summary }}
              </p>
              <div class="flex items-center gap-3.5 mt-1 text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                <span class="flex items-center gap-1">
                  <UserIcon class="w-3 h-3 text-slate-350" />
                  {{ item.assignee?.firstName ? `${item.assignee.firstName} ${item.assignee.lastName || ''}` : 'Unassigned' }}
                </span>
                <span class="flex items-center gap-1">
                  <ClockIcon class="w-3 h-3 text-slate-350" />
                  {{ formatDate(item.startDate) }} - {{ formatDate(item.endDate) }}
                </span>
              </div>
            </div>

            <!-- Right Timeline Grid -->
            <div class="flex-1 relative h-12 bg-slate-50/20 dark:bg-slate-800/10 rounded-xl border border-slate-150/40 dark:border-slate-700/20 overflow-hidden">
              <!-- Vertical gridlines mapping 0%, 25%, 50%, 75%, 100% -->
              <div class="absolute inset-0 flex justify-between pointer-events-none">
                <div class="border-r border-slate-100 dark:border-slate-800/80 h-full w-0"></div>
                <div class="border-r border-slate-100 dark:border-slate-800/80 h-full w-0"></div>
                <div class="border-r border-slate-100 dark:border-slate-800/80 h-full w-0"></div>
                <div class="border-r border-slate-100 dark:border-slate-800/80 h-full w-0"></div>
                <div class="h-full w-0"></div>
              </div>

              <!-- Animated Gradient Progress Bar -->
              <div class="absolute top-3 rounded-lg h-6 flex items-center px-3 text-[10px] font-extrabold text-white shadow-sm overflow-hidden transition-all duration-350 hover:brightness-105"
                :class="item.progress >= 100 
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/10' 
                  : item.progress > 0 
                    ? 'bg-gradient-to-r from-sky-500 to-indigo-500 shadow-indigo-500/10' 
                    : 'bg-gradient-to-r from-slate-400 to-slate-500 dark:from-slate-650 dark:to-slate-700 shadow-slate-500/10'"
                :style="{ left: `${item.startPercent}%`, width: `${Math.max(item.widthPercent, 6)}%` }">
                <span class="truncate">{{ item.progress }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="flex-grow flex flex-col items-center justify-center p-16 text-center text-slate-400 text-sm">
        <CalendarIcon class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        No scheduled issues found. Specify start and end dates inside cards to track them.
      </div>
    </div>

    <!-- Dependency Graph View -->
    <div v-else-if="tab === 'deps'" class="flex-grow overflow-y-auto space-y-6 min-h-0 pr-1">
      <!-- Critical Path Section -->
      <div v-if="depGraph.criticalPath?.length" class="p-5 bg-rose-50/50 dark:bg-rose-950/15 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm">
        <h4 class="text-xs font-extrabold text-rose-600 dark:text-rose-450 mb-3 uppercase tracking-wider flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          Critical Bottleneck Path
        </h4>
        <div class="flex flex-wrap items-center gap-3">
          <template v-for="(nodeId, idx) in depGraph.criticalPath" :key="nodeId">
            <div class="flex flex-col bg-white dark:bg-slate-800 border border-rose-200/80 dark:border-rose-900/40 rounded-xl px-3.5 py-2 shadow-sm">
              <span class="text-xs font-extrabold text-slate-800 dark:text-slate-200">{{ getNodeLabel(nodeId) }}</span>
              <span class="text-[9px] font-bold text-rose-500 dark:text-rose-400 uppercase tracking-wider mt-0.5">{{ getNodeStatus(nodeId) }}</span>
            </div>
            <ArrowRightIcon v-if="idx < depGraph.criticalPath.length - 1" class="w-4 h-4 text-rose-350 dark:text-rose-800/80 flex-shrink-0" />
          </template>
        </div>
      </div>

      <!-- Main Graph Columns -->
      <div v-if="depGraph.nodes?.length" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Connections Panel (Left Col) -->
        <div class="lg:col-span-2 space-y-4">
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 class="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">Dependency Connections</h4>
            
            <div v-if="depGraph.edges?.length" class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div v-for="(edge, i) in depGraph.edges" :key="i" 
                class="p-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-700/60 flex items-center justify-between gap-4 transition hover:border-slate-350 dark:hover:border-slate-650 duration-300 shadow-sm">
                <!-- Blocker Card -->
                <div class="flex-1 min-w-0">
                  <span class="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block tracking-wider mb-1">Blocker</span>
                  <span class="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate">{{ getNodeLabel(edge.source) }}</span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 truncate block mt-0.5 font-medium">{{ getNodeSummary(edge.source) }}</span>
                </div>
                
                <!-- Direction Pointer -->
                <div class="flex flex-col items-center justify-center flex-shrink-0 text-slate-350 dark:text-slate-600">
                  <LockIcon class="w-4 h-4 mb-0.5 text-slate-300 dark:text-slate-600" />
                  <ArrowRightIcon class="w-5 h-5 text-slate-300 dark:text-slate-650" />
                  <span class="text-[9px] uppercase font-extrabold tracking-wider text-slate-400 dark:text-slate-500 mt-1">
                    {{ edge.type === 'BLOCKS' ? 'blocks' : 'blocked by' }}
                  </span>
                </div>
                
                <!-- Blocked Issue Card -->
                <div class="flex-1 min-w-0 text-right">
                  <span class="text-[8px] font-extrabold text-slate-400 dark:text-slate-500 uppercase block tracking-wider mb-1">Blocked Issue</span>
                  <span class="text-xs font-extrabold text-slate-800 dark:text-slate-200 block truncate">{{ getNodeLabel(edge.target) }}</span>
                  <span class="text-[10px] text-slate-500 dark:text-slate-400 truncate block mt-0.5 font-medium">{{ getNodeSummary(edge.target) }}</span>
                </div>
              </div>
            </div>
            
            <div v-else class="text-center py-12 text-slate-400 text-xs">
              No dependency links or blockers identified.
            </div>
          </div>
        </div>

        <!-- Issue Directory (Right Col) -->
        <div class="space-y-4">
          <div class="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <h4 class="text-xs font-bold text-slate-400 dark:text-slate-500 mb-4 uppercase tracking-wider">Project Directory</h4>
            <div class="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              <div v-for="node in depGraph.nodes" :key="node.id"
                class="p-3.5 rounded-xl border text-xs transition duration-300 hover:border-slate-300 dark:hover:border-slate-650"
                :class="depGraph.criticalPath?.includes(node.id) ? 'border-rose-200 bg-rose-50/10 dark:border-rose-950/20 dark:bg-rose-950/5' : 'border-slate-150 bg-slate-50/30 dark:border-slate-800/40'">
                <div class="flex items-center justify-between mb-1">
                  <span class="font-extrabold text-slate-900 dark:text-slate-200">{{ node.key }}</span>
                  <span :class="getStatusClass(node.status)" class="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">{{ node.status }}</span>
                </div>
                <p class="text-slate-600 dark:text-slate-400 truncate font-medium mt-1">{{ node.summary }}</p>
                <div class="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/50 text-[9px] text-slate-400">
                  <span class="flex items-center gap-1">
                    <UserIcon class="w-2.5 h-2.5" />
                    {{ node.assignee?.firstName ? `${node.assignee.firstName} ${node.assignee.lastName || ''}` : 'Unassigned' }}
                  </span>
                  <span v-if="node.dueDate" class="flex items-center gap-1">
                    <ClockIcon class="w-2.5 h-2.5" />
                    {{ formatDateShort(node.dueDate) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex-grow flex flex-col items-center justify-center py-16 text-slate-400 text-sm">
        <AlertCircleIcon class="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        No nodes found in the current dependency tree. Add links between cards to establish connections.
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { 
  HelpCircle as HelpCircleIcon, 
  X as XIcon, 
  Calendar as CalendarIcon,
  ArrowRight as ArrowRightIcon,
  Clock as ClockIcon,
  User as UserIcon,
  Lock as LockIcon,
  Layers as LayersIcon,
  AlertCircle as AlertCircleIcon
} from 'lucide-vue-next';
import api from '../services/api';

export default defineComponent({
  name: 'GanttView',
  components: { 
    HelpCircleIcon, 
    XIcon, 
    CalendarIcon, 
    ArrowRightIcon, 
    ClockIcon, 
    UserIcon, 
    LockIcon, 
    LayersIcon, 
    AlertCircleIcon 
  },
  setup() {
    const route = useRoute();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const tab = ref('gantt');
    const showHelp = ref(true);
    const ganttData = ref<any[]>([]);
    const depGraph = ref<any>({});
    const timelineStart = ref<Date>(new Date());
    const timelineEnd = ref<Date>(new Date());
    const sprintsList = ref<any[]>([]);
    const selectedSprintId = ref('');
    const timelineIntervals = ref<Date[]>([]);

    const formatDate = (d: any) => {
      if (!d) return '';
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatDateShort = (d: any) => {
      if (!d) return '';
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getStatusClass = (status: string) => {
      const s = status.toLowerCase();
      if (s.includes('done')) return 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-450 border border-emerald-200/40 dark:border-emerald-900/30';
      if (s.includes('progress')) return 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border border-sky-200/40 dark:border-sky-900/30';
      if (s.includes('review')) return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-450 border border-amber-200/40 dark:border-amber-900/30';
      return 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/30';
    };

    const getPriorityClass = (priority: string) => {
      const p = priority.toLowerCase();
      if (p.includes('high')) return 'bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
      if (p.includes('medium')) return 'bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
      return 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/30';
    };

    const fetchGantt = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/projects/${projectId.value}/gantt`, {
          params: { sprintId: selectedSprintId.value || undefined }
        });
        const items = (data.data?.items || []).filter((item: any) => item.endDate !== null);
        sprintsList.value = data.data?.sprints || [];
        
        const now = new Date();
        let minDate = new Date(now.getTime() - 15 * 86400000);
        let maxDate = new Date(now.getTime() + 15 * 86400000);

        if (items.length > 0) {
          const dates = items.flatMap((item: any) => {
            const d1 = item.startDate ? new Date(item.startDate).getTime() : null;
            const d2 = item.endDate ? new Date(item.endDate).getTime() : null;
            return [d1, d2].filter((d): d is number => d !== null);
          });
          if (dates.length > 0) {
            const minTime = Math.min(...dates);
            const maxTime = Math.max(...dates);
            // Pad 5 days on both sides
            minDate = new Date(minTime - 5 * 86400000);
            maxDate = new Date(maxTime + 5 * 86400000);
          }
        }

        timelineStart.value = minDate;
        timelineEnd.value = maxDate;
        const range = timelineEnd.value.getTime() - timelineStart.value.getTime();

        ganttData.value = items.map((item: any) => {
          const issueStart = item.startDate ? new Date(item.startDate) : now;
          const issueEnd = item.endDate ? new Date(item.endDate) : new Date(issueStart.getTime() + 7 * 86400000);
          return {
            ...item,
            startPercent: Math.max(0, ((issueStart.getTime() - timelineStart.value.getTime()) / range) * 100),
            widthPercent: Math.max(3, ((issueEnd.getTime() - issueStart.getTime()) / range) * 100),
          };
        });

        // Compute 5 intervals for the vertical lines
        const intervals: Date[] = [];
        const startTime = timelineStart.value.getTime();
        const endTime = timelineEnd.value.getTime();
        const step = (endTime - startTime) / 4;
        for (let i = 0; i <= 4; i++) {
          intervals.push(new Date(startTime + step * i));
        }
        timelineIntervals.value = intervals;

      } catch (err) {
        console.error('Failed to load Gantt data:', err);
      } finally {
        loading.value = false;
      }
    };

    const fetchDeps = async () => {
      try {
        const { data } = await api.get(`/projects/${projectId.value}/dependency-graph`);
        depGraph.value = data.data || {};
      } catch { /* empty */ }
    };

    const getNodeLabel = (nodeId: string) => {
      if (!nodeId) return 'Unknown';
      const node = depGraph.value.nodes?.find((n: any) => n.id === nodeId);
      return node?.key || nodeId.substring(0, 8);
    };

    const getNodeSummary = (nodeId: string) => {
      if (!nodeId) return '';
      const node = depGraph.value.nodes?.find((n: any) => n.id === nodeId);
      return node?.summary || '';
    };

    const getNodeStatus = (nodeId: string) => {
      if (!nodeId) return '';
      const node = depGraph.value.nodes?.find((n: any) => n.id === nodeId);
      return node?.status || '';
    };

    onMounted(() => { fetchGantt(); fetchDeps(); });

    return { 
      loading, 
      tab, 
      showHelp, 
      ganttData, 
      depGraph, 
      getNodeLabel, 
      getNodeSummary,
      getNodeStatus,
      timelineStart, 
      timelineEnd, 
      formatDate, 
      formatDateShort,
      sprintsList, 
      selectedSprintId, 
      fetchGantt,
      timelineIntervals,
      getStatusClass,
      getPriorityClass
    };
  },
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
