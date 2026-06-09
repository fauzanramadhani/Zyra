<template>
  <div class="flex-grow p-6 flex flex-col h-screen overflow-hidden text-[#172B4D] dark:text-slate-200">
    <!-- Header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
        Analytics Insights
        <button @click="showHelp = !showHelp" class="p-1 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition" title="Toggle Help Guide">
          <HelpCircleIcon class="w-4 h-4" />
        </button>
      </h1>
      <p class="text-xs text-slate-400 mt-0.5">Review project metrics, workload distributions, and progression progress</p>
    </div>

    <!-- Glassmorphic Help Card -->
    <div v-if="showHelp" class="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-transparent dark:from-orange-950/20 dark:via-slate-800/40 dark:to-transparent border border-orange-200/50 dark:border-orange-500/10 shadow-sm backdrop-blur-sm relative transition duration-300">
      <button @click="showHelp = false" class="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
        <XIcon class="w-4 h-4" />
      </button>
      <div class="flex items-start gap-3.5">
        <div class="w-9 h-9 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
          <HelpCircleIcon class="w-5 h-5" />
        </div>
        <div class="flex-1 min-w-0 pr-4">
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">📈 Sprint Velocity & Insights</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Analytics Insights consolidates sprint metrics, developer workloads, status distributions, and velocity charts.
          </p>
          <ul class="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1.5 pl-4 list-disc">
            <li><strong>Summary metrics</strong>: Total issues, story point completions, and overall completion rate.</li>
            <li><strong>Burndown Chart</strong>: Select active sprints to check real-time burndown performance versus the ideal rate.</li>
            <li><strong>Developer Workloads</strong>: Review tasks and story points allocated to each developer to balance sprints.</li>
          </ul>
        </div>
      </div>
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
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Issues</p>
          <p class="text-2xl font-black mt-1 text-slate-800 dark:text-white">{{ analytics.summary.totalIssues }}</p>
        </div>
        <!-- Card 2 -->
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Issues</p>
          <p class="text-2xl font-black mt-1 text-green-600">{{ analytics.summary.completedIssues }}</p>
        </div>
        <!-- Card 3 -->
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completion Rate</p>
          <p class="text-2xl font-black mt-1 text-zyra-primary">{{ analytics.summary.completionRate }}%</p>
        </div>
        <!-- Card 4 -->
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Story Points</p>
          <p class="text-2xl font-black mt-1 text-slate-800 dark:text-white">{{ analytics.summary.totalStoryPoints }} SP</p>
        </div>
        <!-- Card 5 -->
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-4">
          <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Completed Story Points</p>
          <p class="text-2xl font-black mt-1 text-green-600">{{ analytics.summary.completedStoryPoints }} SP</p>
        </div>
      </div>

      <!-- Main Distributions Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Status Distribution Gauge -->
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-5">
          <h3 class="font-bold mb-4 pb-2 border-b border-gray-100 dark:border-slate-700 uppercase tracking-wider text-xs text-slate-500 dark:text-slate-300">
            Status Breakdown
          </h3>
          <div class="space-y-4">
            <div v-for="item in analytics.statusDistribution" :key="item.status" class="space-y-1.5">
              <div class="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{{ item.status }}</span>
                <span>{{ item.count }} issues ({{ percent(item.count, analytics.summary.totalIssues) }}%)</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                <div
                  class="bg-gradient-to-r from-orange-400 to-orange-500 h-2 rounded-full transition-all duration-300"
                  :style="{ width: percent(item.count, analytics.summary.totalIssues) + '%' }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Priority Distribution Gauge -->
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-5">
          <h3 class="font-bold mb-4 pb-2 border-b border-gray-100 dark:border-slate-700 uppercase tracking-wider text-xs text-slate-500 dark:text-slate-300">
            Priority Breakdown
          </h3>
          <div class="space-y-4">
            <div v-for="item in analytics.priorityDistribution" :key="item.priority" class="space-y-1.5">
              <div class="flex justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                <span>{{ item.priority }}</span>
                <span>{{ item.count }} issues ({{ percent(item.count, analytics.summary.totalIssues) }}%)</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
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
      <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-5">
        <h3 class="font-bold mb-4 pb-2 border-b border-gray-100 dark:border-slate-700 uppercase tracking-wider text-xs text-slate-500 dark:text-slate-300">
          Developer Workloads
        </h3>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase">
                <th class="p-3">Team Member</th>
                <th class="p-3">Assigned Issues</th>
                <th class="p-3">Workload Load Gauge</th>
                <th class="p-3">Allocated Story Points</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-150 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
              <tr v-for="w in analytics.assigneeWorkload" :key="w.name" class="hover:bg-slate-50/50">
                <td class="p-3 font-semibold">{{ w.name }}</td>
                <td class="p-3 font-bold">{{ w.count }} issues</td>
                <td class="p-3 w-1/3">
                  <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
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

      <!-- Burndown & Velocity Charts Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Burndown Chart -->
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-5">
          <div class="flex items-center justify-between mb-4 pb-2 border-b border-gray-100 dark:border-slate-700">
            <h3 class="font-bold uppercase tracking-wider text-xs text-slate-500 dark:text-slate-300">Sprint Burndown</h3>
            <select v-model="selectedSprintId" @change="fetchBurndown" class="text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 dark:text-slate-200">
              <option value="">Select Sprint</option>
              <option v-for="s in sprintOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </div>
          <div v-if="burndownData" class="space-y-2">
            <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span>Total: {{ burndownData.totalPoints }} pts</span>
              <span>{{ burndownData.totalIssues }} issues</span>
            </div>
            <!-- Simple bar chart representation -->
            <div class="space-y-1">
              <div v-for="day in burndownData.chartData" :key="day.date" class="flex items-center gap-2 text-xs">
                <span class="w-16 text-slate-500 dark:text-slate-400 flex-shrink-0">{{ day.date.slice(5) }}</span>
                <div class="flex-grow h-4 bg-slate-100 dark:bg-slate-700 rounded relative">
                  <div class="absolute inset-y-0 left-0 bg-blue-300 dark:bg-blue-700 rounded opacity-50" :style="{ width: (day.ideal / burndownData.totalPoints * 100) + '%' }"></div>
                  <div class="absolute inset-y-0 left-0 bg-orange-500 rounded" :style="{ width: (day.actual / burndownData.totalPoints * 100) + '%' }"></div>
                </div>
                <span class="w-8 text-right text-slate-600 dark:text-slate-300 font-medium">{{ day.actual }}</span>
              </div>
            </div>
            <div class="flex items-center gap-4 mt-2 text-[10px] text-slate-400">
              <span class="flex items-center gap-1"><span class="w-3 h-2 bg-blue-300 rounded inline-block"></span> Ideal</span>
              <span class="flex items-center gap-1"><span class="w-3 h-2 bg-orange-500 rounded inline-block"></span> Actual</span>
            </div>
          </div>
          <p v-else class="text-xs text-slate-400 text-center py-8">Select a sprint to view burndown</p>
        </div>

        <!-- Velocity Chart -->
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-5">
          <h3 class="font-bold mb-4 pb-2 border-b border-gray-100 dark:border-slate-700 uppercase tracking-wider text-xs text-slate-500 dark:text-slate-300">
            Velocity (Last Sprints)
          </h3>
          <div v-if="velocityData && velocityData.sprints.length > 0" class="space-y-3">
            <div class="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span>Avg Velocity: <strong class="text-slate-700 dark:text-white">{{ velocityData.averageVelocity }} pts/sprint</strong></span>
            </div>
            <div v-for="sprint in velocityData.sprints" :key="sprint.sprintId" class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="font-medium text-slate-700 dark:text-slate-300">{{ sprint.sprintName }}</span>
                <span class="text-slate-500 dark:text-slate-400">{{ sprint.completed }}/{{ sprint.committed }} pts</span>
              </div>
              <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 relative">
                <div class="absolute inset-y-0 left-0 bg-slate-300 dark:bg-slate-600 rounded-full" :style="{ width: '100%' }"></div>
                <div class="absolute inset-y-0 left-0 bg-green-500 rounded-full" :style="{ width: (sprint.committed > 0 ? sprint.completed / sprint.committed * 100 : 0) + '%' }"></div>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-slate-400 text-center py-8">No completed sprints yet</p>
        </div>
      </div>

        <!-- SLA Metrics Section -->
        <div v-if="slaReport" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-5 space-y-6">
          <h3 class="font-bold pb-2 border-b border-gray-100 dark:border-slate-700 uppercase tracking-wider text-xs text-slate-500 dark:text-slate-300">
            SLA Compliance & Violations
          </h3>
          
          <!-- Summary Cards for SLA -->
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Start Work SLA Compliance</p>
              <p class="text-2xl font-black mt-1" :class="slaRateColor(slaReport.startWorkCompliance)">{{ slaReport.startWorkCompliance }}%</p>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Resolution SLA Compliance</p>
              <p class="text-2xl font-black mt-1" :class="slaRateColor(slaReport.resolutionCompliance)">{{ slaReport.resolutionCompliance }}%</p>
            </div>
            <div class="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
              <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Breached Issues</p>
              <p class="text-2xl font-black mt-1 text-red-500">{{ slaReport.totalBreached }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- SLA Performance per Priority -->
            <div class="space-y-4">
              <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Compliance by Priority</h4>
              <div class="space-y-3">
                <div v-for="item in slaReport.performanceByPriority" :key="item.priority" class="space-y-1">
                  <div class="flex justify-between text-xs font-medium">
                    <span>{{ item.priority }} Priority</span>
                    <span>{{ item.rate }}% ({{ item.count }} issues)</span>
                  </div>
                  <div class="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      class="h-2 rounded-full transition-all duration-300"
                      :class="slaBarColor(item.rate)"
                      :style="{ width: item.rate + '%' }"
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Top SLA Violators -->
            <div class="space-y-4">
              <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Top SLA Violators</h4>
              <div v-if="slaReport.topViolators && slaReport.topViolators.length > 0" class="divide-y divide-gray-150 dark:divide-slate-750 text-xs">
                <div v-for="v in slaReport.topViolators" :key="v.name" class="flex justify-between py-2 items-center">
                  <span class="font-semibold text-slate-700 dark:text-slate-300">{{ v.name }}</span>
                  <span class="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-extrabold text-[10px] uppercase">
                    {{ v.count }} breaches
                  </span>
                </div>
              </div>
              <p v-else class="text-xs text-slate-400 italic py-2">No SLA breaches logged yet. Excellent job!</p>
            </div>
          </div>

          <!-- Open Issues Near Breach -->
          <div v-if="slaReport.openNearBreach && slaReport.openNearBreach.length > 0" class="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <h4 class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">⚠️ Open Issues Near Breach</h4>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-slate-500 font-bold uppercase">
                    <th class="p-2.5">Key</th>
                    <th class="p-2.5">Summary</th>
                    <th class="p-2.5">Priority</th>
                    <th class="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-150 dark:divide-slate-750 text-slate-700 dark:text-slate-300">
                  <tr v-for="issue in slaReport.openNearBreach" :key="issue.id" class="hover:bg-slate-50/50">
                    <td class="p-2.5 font-bold text-zyra-primary">{{ issue.key }}</td>
                    <td class="p-2.5 truncate max-w-[200px]">{{ issue.summary }}</td>
                    <td class="p-2.5 font-semibold">{{ issue.priority }}</td>
                    <td class="p-2.5 text-right font-extrabold text-amber-600">DUE SOON</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  </template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import { HelpCircle as HelpCircleIcon, X as XIcon } from 'lucide-vue-next';

export default defineComponent({
  name: 'ProjectAnalytics',
  components: { HelpCircleIcon, XIcon },
  setup() {
    const route = useRoute();

    const analytics = ref<any>(null);
    const loading = ref(false);
    const showHelp = ref(true);
    const selectedSprintId = ref('');
    const burndownData = ref<any>(null);
    const velocityData = ref<any>(null);
    const sprintOptions = ref<any[]>([]);

    const projectId = computed(() => route.params.projectId as string);

    const slaReport = ref<any>(null);

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

      // Fetch SLA Report
      try {
        const slaRes = await api.get(`/projects/${projectId.value}/sla/report`);
        if (slaRes.data.success) {
          slaReport.value = slaRes.data.data;
        }
      } catch (err) {
        console.error('Failed to load SLA report:', err);
      }

      // Fetch sprints for burndown selector
      try {
        const sprintRes = await api.get(`/projects/${projectId.value}/sprints`);
        sprintOptions.value = sprintRes.data?.data || sprintRes.data || [];
      } catch { /* ignore */ }

      // Fetch velocity
      fetchVelocity();
    };

    const fetchBurndown = async () => {
      if (!selectedSprintId.value) { burndownData.value = null; return; }
      try {
        const res = await api.get(`/sprints/${selectedSprintId.value}/burndown`);
        burndownData.value = res.data?.data || null;
      } catch {
        burndownData.value = null;
      }
    };

    const fetchVelocity = async () => {
      try {
        const res = await api.get(`/projects/${projectId.value}/velocity`);
        velocityData.value = res.data?.data || null;
      } catch {
        velocityData.value = null;
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
      selectedSprintId,
      burndownData,
      velocityData,
      sprintOptions,
      fetchBurndown,
      showHelp,
      slaReport,
      slaRateColor(rate: number) {
        if (rate === undefined || rate === null) return 'text-slate-400';
        if (rate >= 80) return 'text-green-600';
        if (rate >= 50) return 'text-amber-500';
        return 'text-red-500';
      },
      slaBarColor(rate: number) {
        if (rate === undefined || rate === null) return 'bg-slate-350';
        if (rate >= 80) return 'bg-green-500';
        if (rate >= 50) return 'bg-amber-500';
        return 'bg-red-500';
      },
    };
  },
});
</script>
