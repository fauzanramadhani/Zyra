<template>
  <div class="bg-white dark:bg-zyra-gray-darkCard border border-slate-200 dark:border-zyra-gray-darkBorder rounded-xl p-5 shadow-sm">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-sm font-bold text-slate-800 dark:text-white">{{ stats.name }}</h3>
      <span :class="statusBadgeClass" class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
        {{ stats.status }}
      </span>
    </div>

    <!-- Progress Bar -->
    <div class="mb-4">
      <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
        <span>Progress</span>
        <span>{{ stats.progress }}%</span>
      </div>
      <div class="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          class="h-full bg-gradient-to-r from-zyra-primary to-orange-400 rounded-full transition-all duration-500 ease-out"
          :style="{ width: stats.progress + '%' }"
        ></div>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-3">
      <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
        <div class="text-lg font-bold text-slate-800 dark:text-white">{{ stats.completedIssues }}/{{ stats.totalIssues }}</div>
        <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Issues Done</div>
      </div>
      <div class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
        <div class="text-lg font-bold text-slate-800 dark:text-white">{{ stats.completedPoints }}/{{ stats.totalPoints }}</div>
        <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Points Done</div>
      </div>
      <div v-if="stats.daysRemaining !== null" class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
        <div class="text-lg font-bold" :class="stats.daysRemaining <= 2 ? 'text-red-500' : 'text-slate-800 dark:text-white'">
          {{ stats.daysRemaining }}
        </div>
        <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Days Left</div>
      </div>
      <div v-if="stats.startDate" class="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 text-center">
        <div class="text-xs font-bold text-slate-800 dark:text-white">{{ formatDate(stats.startDate) }}</div>
        <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wide">Started</div>
      </div>
    </div>

    <!-- Assignee Workload -->
    <div v-if="stats.assigneeWorkload && stats.assigneeWorkload.length > 0" class="mt-4">
      <h4 class="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">Workload</h4>
      <div class="space-y-1.5">
        <div v-for="a in stats.assigneeWorkload" :key="a.name" class="flex items-center justify-between text-xs">
          <span class="text-slate-700 dark:text-slate-300 truncate max-w-[120px]">{{ a.name }}</span>
          <div class="flex items-center gap-2">
            <span class="text-slate-500 dark:text-slate-400">{{ a.count }} issues</span>
            <span class="font-bold text-slate-700 dark:text-slate-200">{{ a.points }} pts</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'SprintStatsCard',
  props: {
    stats: {
      type: Object,
      required: true,
    },
  },
  setup(props) {
    const statusBadgeClass = computed(() => {
      const map: Record<string, string> = {
        ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        COMPLETED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        FUTURE: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
        ARCHIVED: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
      };
      return map[props.stats.status] || map.FUTURE;
    });

    const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return { statusBadgeClass, formatDate };
  },
});
</script>
