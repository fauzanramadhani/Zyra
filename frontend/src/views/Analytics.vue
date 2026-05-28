<template>
  <div class="flex-grow p-6 flex flex-col h-screen overflow-hidden text-[#172B4D]">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-800">Analytics Insights</h1>
      <p class="text-xs text-slate-400">Review project metrics, workload distributions, and progression progress</p>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="p-8 flex justify-center items-center flex-grow">
      <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-zyra-primary"></div>
    </div>

    <!-- Dashboard Content -->
    <div v-else-if="analytics" class="flex-grow overflow-y-auto space-y-6 pr-1">
      
      <!-- Summary Cards Grid -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
        <!-- Card 1 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Issues</p>
          <p class="text-2xl font-black mt-1 text-slate-800">{{ analytics.summary.totalIssues }}</p>
        </div>
        <!-- Card 2 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Issues</p>
          <p class="text-2xl font-black mt-1 text-green-600">{{ analytics.summary.completedIssues }}</p>
        </div>
        <!-- Card 3 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completion Rate</p>
          <p class="text-2xl font-black mt-1 text-zyra-primary">{{ analytics.summary.completionRate }}%</p>
        </div>
        <!-- Card 4 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Story Points</p>
          <p class="text-2xl font-black mt-1 text-slate-800">{{ analytics.summary.totalStoryPoints }} SP</p>
        </div>
        <!-- Card 5 -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Story Points</p>
          <p class="text-2xl font-black mt-1 text-green-600">{{ analytics.summary.completedStoryPoints }} SP</p>
        </div>
      </div>

      <!-- Main Distributions Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Status Distribution Gauge -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 class="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-gray-100 uppercase tracking-wider text-xs text-slate-400">
            Status Breakdown
          </h3>
          <div class="space-y-4">
            <div v-for="item in analytics.statusDistribution" :key="item.status" class="space-y-1.5">
              <div class="flex justify-between text-xs font-semibold text-slate-700">
                <span>{{ item.status }}</span>
                <span>{{ item.count }} issues ({{ percent(item.count, analytics.summary.totalIssues) }}%)</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2">
                <div
                  class="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full transition-all duration-300"
                  :style="{ width: percent(item.count, analytics.summary.totalIssues) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Priority Distribution Gauge -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 class="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-gray-100 uppercase tracking-wider text-xs text-slate-400">
            Priority Breakdown
          </h3>
          <div class="space-y-4">
            <div v-for="item in analytics.priorityDistribution" :key="item.priority" class="space-y-1.5">
              <div class="flex justify-between text-xs font-semibold text-slate-700">
                <span>{{ item.priority }}</span>
                <span>{{ item.count }} issues ({{ percent(item.count, analytics.summary.totalIssues) }}%)</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2">
                <div
                  :class="priorityColor(item.priority)"
                  class="h-2 rounded-full transition-all duration-300"
                  :style="{ width: percent(item.count, analytics.summary.totalIssues) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Assignee Workloads Section -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h3 class="text-sm font-bold text-slate-800 mb-4 pb-2 border-b border-gray-100 uppercase tracking-wider text-xs text-slate-400">
          Developer Workloads
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 border-b border-gray-200 text-slate-500 font-bold uppercase">
                <th class="p-3">Team Member</th>
                <th class="p-3">Assigned Issues</th>
                <th class="p-3">Workload Load Gauge</th>
                <th class="p-3">Allocated Story Points</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-150 text-slate-700">
              <tr v-for="w in analytics.assigneeWorkload" :key="w.name" class="hover:bg-slate-50/50">
                <td class="p-3 font-semibold">{{ w.name }}</td>
                <td class="p-3 font-bold">{{ w.count }} issues</td>
                <td class="p-3 w-1/3">
                  <div class="w-full bg-slate-100 rounded-full h-2">
                    <div
                      class="bg-orange-500 h-2 rounded-full"
                      :style="{ width: percent(w.count, analytics.summary.totalIssues) + '%' }"
                    ></div>
                  </div>
                </td>
                <td class="p-3 font-bold">{{ w.points }} Story Points</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';

export default defineComponent({
  name: 'ProjectAnalytics',
  setup() {
    const route = useRoute();

    const analytics = ref<any>(null);
    const loading = ref(false);

    const projectId = computed(() => route.params.projectId as string);

    const fetchAnalytics = async () => {
      if (!projectId.value) return;

      loading.value = true;
      try {
        const response = await api.get(`/projects/${projectId.value}/analytics`);
        if (response.data.success) {
          analytics.value = response.data.data;
        }
      } catch (err) {
        console.error('Failed to load analytics metrics:', err);
      } finally {
        loading.value = false;
      }
    };

    watch(projectId, fetchAnalytics, { immediate: true });

    const percent = (val: number, total: number) => {
      if (total <= 0) return 0;
      return Math.round((val / total) * 100);
    };

    const priorityColor = (prio: string) => {
      switch (prio.toUpperCase()) {
        case 'HIGHEST':
          return 'bg-gradient-to-r from-red-500 to-red-600';
        case 'HIGH':
          return 'bg-gradient-to-r from-orange-400 to-orange-500';
        case 'MEDIUM':
          return 'bg-gradient-to-r from-blue-400 to-blue-500';
        default:
          return 'bg-gradient-to-r from-gray-400 to-gray-500';
      }
    };

    return {
      analytics,
      loading,
      percent,
      priorityColor,
    };
  },
});
</script>
