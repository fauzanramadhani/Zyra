<template>
  <div class="p-6 max-w-7xl w-full mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
          Timesheets
          <button @click="showHelp = !showHelp" class="p-1 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition" title="Toggle Help Guide">
            <HelpCircleIcon class="w-5 h-5" />
          </button>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Track time spent on issues</p>
      </div>
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
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">⏱️ Weekly Timesheets</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Timesheets allow you to log and track hours spent across multiple project issues throughout the week.
          </p>
          <ul class="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1.5 pl-4 list-disc">
            <li><strong>7-Day Calendar Grid</strong>: Log daily hours (Mon-Sun) directly inside the grid cells.</li>
            <li><strong>Submissions</strong>: Submit drafts at the end of the week for manager approval.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Week Navigation -->
    <div class="flex items-center gap-4 mb-6">
      <button @click="prevWeek" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
        <ChevronLeftIcon class="w-5 h-5" />
      </button>
      <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Week of {{ formatDate(weekStart) }}</span>
      <button @click="nextWeek" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
        <ChevronRightIcon class="w-5 h-5" />
      </button>
      <div class="ml-auto flex items-center gap-2">
        <span v-if="timesheet" class="text-xs px-2 py-1 rounded-full font-medium" :class="statusColor(timesheet.status)">{{ timesheet.status }}</span>
        <button v-if="timesheet?.status === 'DRAFT'" @click="submitTimesheet" class="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition">Submit</button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>

    <!-- Timesheet Table -->
    <div v-else-if="timesheet" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 dark:bg-slate-700/50">
          <tr>
            <th class="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-300">Issue</th>
            <th v-for="day in weekDays" :key="day" class="text-center px-2 py-3 font-semibold text-slate-600 dark:text-slate-300 w-20">{{ day }}</th>
            <th class="text-center px-4 py-3 font-semibold text-slate-600 dark:text-slate-300 w-20">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.id" class="border-t border-slate-100 dark:border-slate-700">
            <td class="px-4 py-3 text-slate-700 dark:text-slate-300">
              <span class="font-medium">{{ entry.issueKey || 'General' }}</span>
              <span v-if="entry.description" class="text-xs text-slate-500 ml-2">{{ entry.description }}</span>
            </td>
            <td v-for="(_, i) in 7" :key="i" class="text-center px-2 py-2">
              <input type="number" min="0" max="24" step="0.5" :value="entry.hours?.[i] || 0"
                @change="updateHours(entry.id, i, $event)"
                :disabled="timesheet.status !== 'DRAFT'"
                class="w-14 text-center px-1 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm disabled:opacity-50" />
            </td>
            <td class="text-center px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{{ entryTotal(entry) }}h</td>
          </tr>
          <!-- Add Row -->
          <tr v-if="timesheet.status === 'DRAFT'" class="border-t border-slate-100 dark:border-slate-700">
            <td colspan="9" class="px-4 py-3">
              <button @click="addEntry" class="text-xs text-orange-500 font-semibold hover:underline flex items-center gap-1">
                <PlusIcon class="w-3.5 h-3.5" /> Add entry
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div class="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 flex items-center justify-between">
        <span class="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Hours</span>
        <span class="text-lg font-bold text-orange-500">{{ totalHours }}h</span>
      </div>
    </div>

    <div v-else class="text-center py-20">
      <ClockIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
      <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">No timesheet for this week</h3>
      <button @click="createTimesheet" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Create Timesheet</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon, Clock as ClockIcon, HelpCircle as HelpCircleIcon, X as XIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'TimesheetView',
  components: { PlusIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, HelpCircleIcon, XIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const showHelp = ref(true);
    const timesheet = ref<any>(null);
    const entries = ref<any[]>([]);
    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const weekStart = ref(getMonday(new Date()));

    function getMonday(d: Date) {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      date.setDate(diff);
      date.setHours(0, 0, 0, 0);
      return date;
    }

    const prevWeek = () => { weekStart.value = new Date(weekStart.value.getTime() - 7 * 86400000); fetchTimesheet(); };
    const nextWeek = () => { weekStart.value = new Date(weekStart.value.getTime() + 7 * 86400000); fetchTimesheet(); };

    const fetchTimesheet = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/timesheets/me?weekStart=${weekStart.value.toISOString()}`);
        timesheet.value = data.data;
        entries.value = data.data?.entries || [];
      } catch { timesheet.value = null; entries.value = []; } finally { loading.value = false; }
    };

    const createTimesheet = async () => {
      try {
        const { data } = await api.get(`/timesheets/me?weekStart=${weekStart.value.toISOString()}`);
        timesheet.value = data.data;
        entries.value = data.data?.entries || [];
        toast.success('Timesheet created');
      } catch { toast.error('Failed to create timesheet'); }
    };

    const addEntry = async () => {
      try {
        const { data } = await api.post(`/timesheets/${timesheet.value.id}/entries`, { projectId: projectId.value, hours: [0, 0, 0, 0, 0, 0, 0], description: '' });
        entries.value.push(data.data);
      } catch { toast.error('Failed to add entry'); }
    };

    const updateHours = async (entryId: string, dayIndex: number, event: Event) => {
      const value = parseFloat((event.target as HTMLInputElement).value) || 0;
      try {
        const entry = entries.value.find(e => e.id === entryId);
        if (entry) {
          if (!entry.hours) entry.hours = [0, 0, 0, 0, 0, 0, 0];
          entry.hours[dayIndex] = value;
          await api.patch(`/timesheets/entries/${entryId}`, { hours: entry.hours });
        }
      } catch { toast.error('Failed to update'); }
    };

    const submitTimesheet = async () => {
      try {
        await api.post(`/timesheets/${timesheet.value.id}/submit`);
        timesheet.value.status = 'SUBMITTED';
        toast.success('Timesheet submitted');
      } catch { toast.error('Failed to submit'); }
    };

    const entryTotal = (entry: any) => (entry.hours || []).reduce((a: number, b: number) => a + b, 0);
    const totalHours = computed(() => entries.value.reduce((sum, e) => sum + entryTotal(e), 0));

    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const statusColor = (status: string) => {
      switch (status) {
        case 'DRAFT': return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
        case 'SUBMITTED': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
        case 'APPROVED': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        case 'REJECTED': return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
        default: return 'bg-slate-100 text-slate-600';
      }
    };

    onMounted(fetchTimesheet);

    return { loading, timesheet, entries, weekDays, weekStart, prevWeek, nextWeek, fetchTimesheet, createTimesheet, addEntry, updateHours, submitTimesheet, entryTotal, totalHours, formatDate, statusColor, showHelp };
  },
});
</script>
