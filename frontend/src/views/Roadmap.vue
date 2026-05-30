<template>
  <div class="flex-grow p-3 sm:p-4 md:p-6 flex flex-col h-screen overflow-hidden text-[#172B4D] dark:text-slate-200">
    <!-- ============================================================ -->
    <!-- HEADER + SUMMARY CARDS -->
    <!-- ============================================================ -->
    <div class="flex-shrink-0 mb-4 md:mb-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 class="text-lg md:text-xl font-bold text-slate-800 dark:text-white">Roadmap</h1>
          <p class="text-[10px] md:text-xs text-slate-400 mt-0.5">Visualize your project timeline and track progress across sprints &amp; releases</p>
        </div>
        <div class="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button v-for="mode in viewModes" :key="mode.value" @click="viewMode = mode.value"
            :class="viewMode === mode.value ? 'bg-white dark:bg-zyra-gray-darkCard shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition">
            {{ mode.label }}
          </button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
        <div v-for="stat in summaryStats" :key="stat.label"
          class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-3 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" :class="stat.bgClass">
            <component :is="stat.icon" class="w-4 h-4" :class="stat.iconClass" />
          </div>
          <div class="min-w-0">
            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{{ stat.label }}</p>
            <p class="text-lg font-bold text-slate-800 dark:text-white">{{ stat.value }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- TOOLBAR -->
    <!-- ============================================================ -->
    <div class="flex-shrink-0 mb-4 flex flex-col sm:flex-row gap-2 md:gap-3">
      <div class="relative w-full sm:w-48 md:w-56">
        <SearchIcon class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input v-model="searchQuery" type="text" placeholder="Search roadmap..."
          class="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-orange-500/30 focus:border-orange-500 transition" />
      </div>
      <div class="flex flex-wrap gap-1.5 md:gap-2">
        <select v-model="filterStatus" class="text-xs border border-gray-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 dark:text-slate-200 outline-none w-[calc(50%-3px)] sm:w-auto">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="FUTURE">Future</option>
          <option value="COMPLETED">Completed</option>
          <option value="PLANNED">Planned</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RELEASED">Released</option>
        </select>
        <select v-model="filterSprint" class="text-xs border border-gray-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 dark:text-slate-200 outline-none w-[calc(50%-3px)] sm:w-auto">
          <option value="">All Sprints</option>
          <option v-for="s in sprints" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <select v-model="filterAssignee" class="text-xs border border-gray-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 dark:text-slate-200 outline-none w-full sm:w-auto">
          <option value="">All Assignees</option>
          <option v-for="a in assignees" :key="a.id" :value="a.id">{{ a.firstName }} {{ a.lastName }}</option>
        </select>
      </div>
      <div class="flex items-center gap-1.5 ml-auto flex-shrink-0">
        <div class="hidden sm:flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button v-for="z in zoomLevels" :key="z.value" @click="zoom = z.value"
            :class="zoom === z.value ? 'bg-white dark:bg-zyra-gray-darkCard shadow-sm text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400'"
            class="px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition">
            {{ z.label }}
          </button>
        </div>
        <button @click="scrollToToday" class="px-2.5 py-1.5 text-xs font-medium text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition hidden sm:block">
          Today
        </button>
        <button v-if="hasActiveFilters" @click="clearFilters" class="text-[10px] font-bold text-slate-500 hover:text-red-500 transition px-1">
          Clear
        </button>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- LOADING -->
    <!-- ============================================================ -->
    <div v-if="loading" class="flex-grow flex items-center justify-center">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-400">Loading roadmap...</p>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- EMPTY STATE -->
    <!-- ============================================================ -->
    <div v-else-if="filteredItems.length === 0 && !searchQuery && !hasActiveFilters"
      class="flex-grow flex items-center justify-center">
      <div class="bg-white dark:bg-zyra-gray-darkCard rounded-2xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-12 text-center max-w-md mx-auto">
        <div class="w-16 h-16 bg-orange-100 dark:bg-orange-950/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <MapIcon class="w-8 h-8 text-orange-500" />
        </div>
        <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-2">No Roadmap Items</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
          Create your first Epic or Sprint with start/end dates to begin planning your project timeline.
          Head to the <strong>Backlog</strong> to set up sprints and organize work.
        </p>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- NO RESULTS (filters active) -->
    <!-- ============================================================ -->
    <div v-else-if="filteredItems.length === 0"
      class="flex-grow flex items-center justify-center">
      <div class="text-center">
        <div class="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
          <SearchIcon class="w-8 h-8 text-slate-400" />
        </div>
        <p class="text-sm font-medium text-slate-600 dark:text-slate-300">No matching items</p>
        <p class="text-xs text-slate-400 mt-1">Try adjusting your filters or search query</p>
        <button @click="clearFilters" class="mt-3 px-4 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition">
          Clear all filters
        </button>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- CONTENT (v-else) — mobile cards + desktop timeline toggle via CSS -->
    <div v-else class="flex-grow overflow-hidden flex flex-col">
      <!-- Mobile card view -->
      <div class="flex-grow overflow-y-auto sm:hidden space-y-3">      <div v-for="item in filteredItems" :key="item.id"
        class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 mb-1">
              <div :class="statusDotClass(item.status)" class="w-2.5 h-2.5 rounded-full flex-shrink-0"></div>
              <h3 class="text-sm font-bold text-slate-800 dark:text-white truncate">{{ item.name }}</h3>
            </div>
            <span :class="statusBadgeClass(item.status)" class="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider mb-2">
              {{ item.status }}
            </span>
            <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mb-2">
              <div class="h-2 rounded-full transition-all duration-300"
                :class="item.progress >= 100 ? 'bg-emerald-500' : item.progress > 50 ? 'bg-orange-500' : 'bg-blue-500'"
                :style="{ width: item.progress + '%' }"></div>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400">
          <span class="flex items-center gap-1"><CalendarIcon class="w-3 h-3" /> {{ item.startLabel }}</span>
          <span>→</span>
          <span>{{ item.endLabel }}</span>
        </div>
        <div class="flex items-center gap-4 mt-2 text-[10px] text-slate-500 dark:text-slate-400">
          <span>{{ item.issues?.length || 0 }} issues</span>
          <span>{{ item.totalPoints || 0 }} pts</span>
          <span class="font-bold" :class="item.progress >= 100 ? 'text-emerald-600' : 'text-orange-600'">{{ item.progress }}% done</span>
        </div>
        <div v-if="item.issues && item.issues.length > 0" class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <button @click="toggleExpand(item.id)" class="text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition flex items-center gap-1 mb-2">
            <ChevronDownIcon class="w-3 h-3 transition-transform" :class="{ '-rotate-90': !expandedItems.has(item.id) }" />
            {{ item.issues.length }} issue{{ item.issues.length !== 1 ? 's' : '' }}
          </button>
          <div v-if="expandedItems.has(item.id)" class="space-y-1.5 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
            <div v-for="issue in item.issues.slice(0, 10)" :key="issue.id" class="flex items-center gap-2 text-[10px]">
              <span class="px-1 py-0.5 rounded text-[8px] font-bold uppercase" :class="issueTypeBadgeClass(issue.type)">{{ issue.type }}</span>
              <span class="text-slate-600 dark:text-slate-400 truncate">{{ issue.key }} {{ issue.summary }}</span>
            </div>
            <p v-if="item.issues.length > 10" class="text-[10px] text-slate-400">+{{ item.issues.length - 10 }} more</p>
          </div>
        </div>
      </div>
      </div>

      <!-- Desktop timeline -->
      <div class="hidden sm:flex flex-grow overflow-hidden flex-col bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-gray-200 dark:border-zyra-gray-darkBorder shadow-sm">
      <!-- Sticky Timeline Header -->
      <div class="flex-shrink-0 overflow-hidden border-b border-slate-200 dark:border-slate-800">
        <div class="flex" :style="{ width: totalWidth + 'px', transform: `translateX(-${scrollLeft}px)` }">
          <div class="w-[260px] flex-shrink-0 sticky left-0 z-10 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 px-4 py-2.5">
            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Item</span>
          </div>
          <div class="flex">
            <div v-for="col in dateColumns" :key="col.key"
              :style="{ width: columnWidth + 'px' }"
              class="flex-shrink-0 px-2 py-2 text-center border-r border-slate-100 dark:border-slate-800"
              :class="col.isToday ? 'bg-orange-50/40 dark:bg-orange-900/10' : ''">
              <div class="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ col.label }}</div>
              <div v-if="col.sublabel" class="text-[9px] text-slate-400 dark:text-slate-500">{{ col.sublabel }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Timeline Body -->
      <div class="flex-grow overflow-auto" ref="scrollContainer" @scroll="onScroll">
        <div :style="{ width: totalWidth + 'px', minHeight: '100%' }">
          <div v-for="(item, idx) in filteredItems" :key="item.id"
            class="flex items-stretch border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/20 transition-colors group"
            :class="{ 'bg-slate-50/20 dark:bg-slate-800/10': idx % 2 === 0 }">
            
            <!-- Sticky Left Panel -->
            <div class="w-[260px] flex-shrink-0 sticky left-0 z-10 bg-white dark:bg-zyra-gray-darkCard border-r border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-2">
              <button v-if="item.issues && item.issues.length > 0" @click="toggleExpand(item.id)"
                class="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition">
                <ChevronDownIcon class="w-3 h-3 transition-transform duration-150" :class="{ '-rotate-90': !expandedItems.has(item.id) }" />
              </button>
              <div v-else class="w-4"></div>
              <div :class="statusDotClass(item.status)" class="w-2.5 h-2.5 rounded-full flex-shrink-0"></div>
              <div class="min-w-0 flex-grow">
                <div class="text-xs font-bold text-slate-800 dark:text-white truncate">{{ item.name }}</div>
                <div class="flex items-center gap-2 text-[10px] text-slate-400 dark:text-slate-500">
                  <span>{{ item.issues?.length || 0 }} issues</span>
                  <span>·</span>
                  <span>{{ item.totalPoints || 0 }} pts</span>
                </div>
              </div>
              <span :class="statusBadgeClass(item.status)" class="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider flex-shrink-0">
                {{ item.status }}
              </span>
            </div>

            <!-- Right Panel (timeline bars) — dynamic height based on expansion -->
            <div
              class="flex-grow relative transition-all duration-200 ease-in-out"
              :style="{ minHeight: rowHeight(item) + 'px' }">
              <!-- Today line -->
              <div v-if="todayOffset >= 0" class="absolute top-0 bottom-0 w-0.5 bg-orange-500/60 z-10" :style="{ left: todayOffset + 'px' }">
                <div class="absolute -top-0.5 -left-1 w-2.5 h-2.5 bg-orange-500 rounded-full"></div>
              </div>

              <!-- Main bar -->
              <div v-if="item.barStart !== null && item.barWidth > 0"
                class="absolute top-2.5 h-8 rounded-lg flex items-center px-2.5 cursor-pointer transition-all duration-150 hover:brightness-110 hover:shadow-md group/bar"
                :class="barColorClass(item.status, item.type)"
                :style="{ left: item.barStart + 'px', width: Math.max(item.barWidth, 32) + 'px' }"
                :title="`${item.name}: ${item.startLabel} → ${item.endLabel}`">
                <div v-if="item.progress > 0"
                  class="absolute inset-y-0 left-0 rounded-lg bg-white/25 transition-all duration-300"
                  :style="{ width: item.progress + '%' }"></div>
                <span class="text-[9px] font-bold text-white relative z-10 truncate">{{ item.name }}</span>
                <span class="text-[8px] text-white/70 ml-auto relative z-10 flex-shrink-0 hidden group-hover/bar:inline">{{ item.progress }}%</span>
              </div>
              <div v-else class="absolute top-2.5 left-2 text-[10px] text-slate-400 italic">No dates set</div>

              <!-- Child issue bars -->
              <Transition name="child-bars">
              <div v-if="expandedItems.has(item.id) && item.issues" class="absolute inset-x-0 top-[42px]">
                <div v-for="(issue, iIdx) in item.issues.slice(0, 10)" :key="issue.id"
                  class="absolute h-4 rounded flex items-center px-1.5 opacity-70 hover:opacity-100 cursor-pointer transition-colors"
                  :class="issueBarClass(issue.type)"
                  :style="{ left: childBarStyle(item, iIdx).left, width: childBarStyle(item, iIdx).width, top: (iIdx * 20) + 'px' }"
                  :title="`${issue.key}: ${issue.summary}`">
                  <span class="text-[8px] font-medium text-white/90 truncate">{{ issue.key }}</span>
                </div>
                <div v-if="item.issues.length > 10"
                  class="absolute text-[9px] text-slate-400 font-medium"
                  :style="{ left: (item.barStart || 0) + 'px', top: (2 + 10 * 20) + 'px' }">
                  +{{ item.issues.length - 10 }} more
                </div>
              </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useProjectStore } from '../store/project';
import api from '../services/api';
import { socket } from '../services/socket';
import {
  Search as SearchIcon,
  Calendar as CalendarIcon,
  ChevronDown as ChevronDownIcon,
  Map as MapIcon,
  Zap as ZapIcon,
  CheckCircle as CheckCircleIcon,
  Clock as ClockIcon,
  Tag as TagIcon,
  TrendingUp as TrendingUpIcon,
} from 'lucide-vue-next';

export default defineComponent({
  name: 'Roadmap',
  components: { SearchIcon, CalendarIcon, ChevronDownIcon, MapIcon },
  setup() {
    const route = useRoute();
    const projectStore = useProjectStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const sprints = ref<any[]>([]);
    const releases = ref<any[]>([]);
    const assignees = ref<any[]>([]);

    const viewMode = ref('sprints');
    const zoom = ref('month');
    const filterStatus = ref('');
    const filterSprint = ref('');
    const filterAssignee = ref('');
    const searchQuery = ref('');
    const scrollLeft = ref(0);
    const expandedItems = ref(new Set<string>());
    const scrollContainer = ref<HTMLElement | null>(null);

    const viewModes = [
      { value: 'sprints', label: 'Sprints' },
      { value: 'releases', label: 'Releases' },
    ];
    const zoomLevels = [
      { value: 'week', label: 'Wk' },
      { value: 'month', label: 'Mo' },
      { value: 'quarter', label: 'Qtr' },
      { value: 'year', label: 'Yr' },
    ];

    const hasActiveFilters = computed(() =>
      !!(filterStatus.value || filterSprint.value || filterAssignee.value || searchQuery.value)
    );

    const columnWidth = computed(() => {
      if (zoom.value === 'week') return 100;
      if (zoom.value === 'month') return 140;
      if (zoom.value === 'quarter') return 200;
      return 240;
    });

    const dateRange = computed(() => {
      const items = viewMode.value === 'sprints' ? sprints.value : releases.value;
      const now = new Date();
      let minDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      let maxDate = new Date(now.getFullYear(), now.getMonth() + 4, 1);
      items.forEach((item: any) => {
        const start = item.startDate ? new Date(item.startDate) : null;
        const end = item.endDate || item.releaseDate ? new Date(item.endDate || item.releaseDate) : null;
        if (start && start < minDate) minDate = new Date(start.getTime() - 14 * 86400000);
        if (end && end > maxDate) maxDate = new Date(end.getTime() + 14 * 86400000);
      });
      return { min: minDate, max: maxDate };
    });

    const dateColumns = computed(() => {
      const cols: { key: string; label: string; sublabel?: string; date: Date; isToday: boolean }[] = [];
      const { min, max } = dateRange.value;
      const current = new Date(min);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (zoom.value === 'week') {
        current.setDate(current.getDate() - current.getDay());
        while (current <= max) {
          const weekEnd = new Date(current.getTime() + 6 * 86400000);
          cols.push({
            key: current.toISOString(),
            label: current.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            sublabel: `W${getWeekNumber(current)}`,
            date: new Date(current),
            isToday: today >= current && today <= weekEnd,
          });
          current.setDate(current.getDate() + 7);
        }
      } else if (zoom.value === 'month') {
        current.setDate(1);
        while (current <= max) {
          cols.push({
            key: current.toISOString(),
            label: current.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
            date: new Date(current),
            isToday: today.getMonth() === current.getMonth() && today.getFullYear() === current.getFullYear(),
          });
          current.setMonth(current.getMonth() + 1);
        }
      } else if (zoom.value === 'quarter') {
        current.setMonth(Math.floor(current.getMonth() / 3) * 3);
        current.setDate(1);
        while (current <= max) {
          const q = Math.floor(current.getMonth() / 3) + 1;
          const qEnd = new Date(current.getFullYear(), current.getMonth() + 3, 0);
          cols.push({
            key: current.toISOString(),
            label: `Q${q} ${current.getFullYear()}`,
            date: new Date(current),
            isToday: today >= current && today <= qEnd,
          });
          current.setMonth(current.getMonth() + 3);
        }
      } else {
        current.setMonth(0); current.setDate(1);
        while (current <= max) {
          const yearEnd = new Date(current.getFullYear(), 11, 31);
          cols.push({
            key: current.toISOString(),
            label: `${current.getFullYear()}`,
            date: new Date(current),
            isToday: today >= current && today <= yearEnd,
          });
          current.setFullYear(current.getFullYear() + 1);
        }
      }
      return cols;
    });

    const totalWidth = computed(() => 260 + dateColumns.value.length * columnWidth.value);

    const todayOffset = computed(() => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { min, max } = dateRange.value;
      const totalDays = (max.getTime() - min.getTime()) / 86400000;
      const daysSinceStart = (today.getTime() - min.getTime()) / 86400000;
      const timelineWidth = dateColumns.value.length * columnWidth.value;
      return totalDays > 0 ? (daysSinceStart / totalDays) * timelineWidth : 0;
    });

    const displayItems = computed(() => {
      const items = viewMode.value === 'sprints' ? sprints.value : releases.value;
      const { min, max } = dateRange.value;
      const totalDays = (max.getTime() - min.getTime()) / 86400000;
      const timelineWidth = dateColumns.value.length * columnWidth.value;
      return items.map((item: any) => {
        const start = item.startDate ? new Date(item.startDate) : null;
        const end = item.endDate || item.releaseDate ? new Date(item.endDate || item.releaseDate) : null;
        let barStart: number | null = null;
        let barWidth = 0;
        if (start && end && totalDays > 0) {
          barStart = ((start.getTime() - min.getTime()) / 86400000 / totalDays) * timelineWidth;
          barWidth = Math.max(((end.getTime() - start.getTime()) / 86400000 / totalDays) * timelineWidth, 24);
        } else if (start && totalDays > 0) {
          barStart = ((start.getTime() - min.getTime()) / 86400000 / totalDays) * timelineWidth;
          barWidth = columnWidth.value;
        }
        const issues = item.issues || [];
        const doneIssues = issues.filter((i: any) =>
          i.status?.name?.toLowerCase() === 'done' || i.status?.name?.toLowerCase() === 'completed'
        ).length;
        const progress = issues.length > 0 ? Math.round((doneIssues / issues.length) * 100) : 0;
        const totalPoints = issues.reduce((sum: number, i: any) => sum + (i.storyPoints || 0), 0);
        return {
          ...item, barStart, barWidth, progress, totalPoints,
          startLabel: start ? start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No start',
          endLabel: end ? end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No end',
          type: viewMode.value === 'sprints' ? 'sprint' : 'release',
        };
      });
    });

    const filteredItems = computed(() => {
      let items = displayItems.value;
      if (filterStatus.value) items = items.filter(i => i.status === filterStatus.value);
      if (filterSprint.value) items = items.filter(i => i.id === filterSprint.value);
      if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        items = items.filter(i => i.name?.toLowerCase().includes(q));
      }
      return items;
    });

    const summaryStats = computed(() => {
      const allSprints = sprints.value;
      const allReleases = releases.value;
      const activeSprints = allSprints.filter(s => s.status === 'ACTIVE').length;
      const completedSprints = allSprints.filter(s => s.status === 'COMPLETED').length;
      const upcomingReleases = allReleases.filter(r => r.status === 'PLANNED' || r.status === 'IN_PROGRESS').length;
      let totalIssues = 0, completedIssues = 0;
      allSprints.forEach((s: any) => {
        const issues = s.issues || [];
        totalIssues += issues.length;
        completedIssues += issues.filter((i: any) =>
          i.status?.name?.toLowerCase() === 'done' || i.status?.name?.toLowerCase() === 'completed'
        ).length;
      });
      const progressPct = totalIssues > 0 ? Math.round((completedIssues / totalIssues) * 100) : 0;
      return [
        { label: 'Active Sprints', value: activeSprints, icon: ZapIcon, bgClass: 'bg-green-100 dark:bg-green-900/30', iconClass: 'text-green-600 dark:text-green-400' },
        { label: 'Completed', value: completedSprints, icon: CheckCircleIcon, bgClass: 'bg-blue-100 dark:bg-blue-900/30', iconClass: 'text-blue-600 dark:text-blue-400' },
        { label: 'Open Issues', value: totalIssues - completedIssues, icon: ClockIcon, bgClass: 'bg-amber-100 dark:bg-amber-900/30', iconClass: 'text-amber-600 dark:text-amber-400' },
        { label: 'Done Issues', value: completedIssues, icon: CheckCircleIcon, bgClass: 'bg-emerald-100 dark:bg-emerald-900/30', iconClass: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Upcoming Rel.', value: upcomingReleases, icon: TagIcon, bgClass: 'bg-purple-100 dark:bg-purple-900/30', iconClass: 'text-purple-600 dark:text-purple-400' },
        { label: 'Progress', value: progressPct + '%', icon: TrendingUpIcon, bgClass: 'bg-orange-100 dark:bg-orange-900/30', iconClass: 'text-orange-600 dark:text-orange-400' },
      ];
    });

    const getWeekNumber = (d: Date) => {
      const oneJan = new Date(d.getFullYear(), 0, 1);
      return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7);
    };

    const statusDotClass = (s: string) => ({ ACTIVE: 'bg-green-500', FUTURE: 'bg-blue-400', COMPLETED: 'bg-slate-400', ARCHIVED: 'bg-gray-300', PLANNED: 'bg-blue-400', IN_PROGRESS: 'bg-yellow-500', RELEASED: 'bg-green-500' } as Record<string, string>)[s] || 'bg-slate-400';
    
    const statusBadgeClass = (s: string) => ({ ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', FUTURE: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', COMPLETED: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', PLANNED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', IN_PROGRESS: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', RELEASED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' } as Record<string, string>)[s] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';
    
    const barColorClass = (s: string, t: string) => t === 'release' ? 'bg-gradient-to-r from-purple-500 to-purple-400' : ({ ACTIVE: 'bg-gradient-to-r from-emerald-500 to-green-400', FUTURE: 'bg-gradient-to-r from-blue-500 to-blue-400', COMPLETED: 'bg-gradient-to-r from-slate-500 to-slate-400' } as Record<string, string>)[s] || 'bg-gradient-to-r from-slate-500 to-slate-400';
    
    const issueBarClass = (t: string) => ({ BUG: 'bg-red-400/80', STORY: 'bg-green-400/80', TASK: 'bg-blue-400/80', EPIC: 'bg-purple-400/80', SUBTASK: 'bg-gray-400/80' } as Record<string, string>)[t] || 'bg-blue-400/80';
    
    const issueTypeBadgeClass = (t: string) => ({ BUG: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', STORY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', TASK: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', EPIC: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' } as Record<string, string>)[t] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';

    const childBarStyle = (item: any, idx: number) => {
      const count = Math.min((item.issues || []).length, 10);
      const segWidth = Math.max((item.barWidth || 0) / (count || 1), 20);
      return { left: (item.barStart || 0) + idx * segWidth + 'px', width: (segWidth - 2) + 'px' };
    };

    const rowHeight = (item: any) => {
      const baseHeight = 52;
      if (!expandedItems.value.has(item.id) || !item.issues?.length) return baseHeight;
      const visibleCount = Math.min(item.issues.length, 10);
      return baseHeight + visibleCount * 20 + 4; // 4px bottom padding
    };

    const toggleExpand = (id: string) => {
      expandedItems.value.has(id) ? expandedItems.value.delete(id) : expandedItems.value.add(id);
    };

    const clearFilters = () => {
      filterStatus.value = ''; filterSprint.value = ''; filterAssignee.value = ''; searchQuery.value = '';
    };

    const onScroll = () => {
      if (scrollContainer.value) scrollLeft.value = scrollContainer.value.scrollLeft;
    };

    const scrollToToday = () => {
      if (scrollContainer.value && todayOffset.value >= 0)
        scrollContainer.value.scrollTo({ left: Math.max(0, todayOffset.value - 300), behavior: 'smooth' });
    };

    const fetchData = async () => {
      if (!projectId.value) return;
      loading.value = true;
      try {
        const [sprintRes, releaseRes] = await Promise.all([
          api.get(`/projects/${projectId.value}/sprints`, { params: { includeArchived: 'true' } }),
          api.get(`/projects/${projectId.value}/releases`),
        ]);
        sprints.value = sprintRes.data.data || sprintRes.data || [];
        releases.value = releaseRes.data.data || releaseRes.data || [];
      } catch { /* ignore */ }

      // Load assignees from project details (includes members), fallback silently
      try {
        const projectRes = await api.get(`/projects/${projectId.value}`);
        const project = projectRes.data.data || projectRes.data;
        assignees.value = (project?.members || []).map((m: any) => m.user || m);
      } catch { /* ignore */ }

      loading.value = false;
    };

    watch(projectId, fetchData, { immediate: true });

    onMounted(() => {
      nextTick(() => scrollToToday());
      if (socket) {
        socket.on('sprint:updated', fetchData);
        socket.on('release:updated', fetchData);
        socket.on('issue:updated', fetchData);
      }
    });
    onUnmounted(() => {
      if (socket) {
        socket.off('sprint:updated', fetchData);
        socket.off('release:updated', fetchData);
        socket.off('issue:updated', fetchData);
      }
    });

    return {
      loading, sprints, releases, assignees, viewMode, zoom, filterStatus, filterSprint, filterAssignee,
      searchQuery, scrollLeft, expandedItems, scrollContainer,
      viewModes, zoomLevels, hasActiveFilters,
      columnWidth, dateColumns, totalWidth, todayOffset, filteredItems, summaryStats,
      statusDotClass, statusBadgeClass, barColorClass, issueBarClass, issueTypeBadgeClass,
      childBarStyle, rowHeight, toggleExpand, clearFilters, onScroll, scrollToToday,
    };
  },
});
</script>

<style scoped>
.child-bars-enter-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.child-bars-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.child-bars-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.child-bars-leave-to {
  opacity: 0;
  transform: translateY(-2px);
}
</style>
