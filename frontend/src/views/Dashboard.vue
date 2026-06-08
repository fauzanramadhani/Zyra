<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200">
    <div class="flex-shrink-0">
      <!-- Header -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            Dashboards
            <button @click="showHelp = !showHelp" class="p-1 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition" title="Toggle Help Guide">
              <HelpCircleIcon class="w-5 h-5" />
            </button>
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Custom widget-based dashboards</p>
        </div>
        <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-2">
          <PlusIcon class="w-4 h-4" />
          New Dashboard
        </button>
      </div>

      <!-- Help Card -->
      <div v-if="showHelp" class="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-50/80 via-amber-50/50 to-transparent dark:from-orange-950/20 dark:via-slate-800/40 dark:to-transparent border border-orange-200/50 dark:border-orange-500/10 shadow-sm backdrop-blur-sm relative transition duration-300">
        <button @click="showHelp = false" class="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          <XIcon class="w-4 h-4" />
        </button>
        <div class="flex items-start gap-3.5">
          <div class="w-9 h-9 bg-orange-500/10 dark:bg-orange-500/20 rounded-xl flex items-center justify-center text-orange-500 flex-shrink-0">
            <HelpCircleIcon class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0 pr-4">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Workspace Dashboards</h3>
            <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
              Dashboards let you compile cross-project statistics, live issue metrics, activity streams, and status summaries.
            </p>
            <ul class="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1.5 pl-4 list-disc">
              <li><strong>Widget Types</strong>: Stats, Pie/Bar/Line Charts, Activity Stream, Calendar</li>
              <li><strong>Chart Configuration</strong>: Group by Status, Priority, or Type</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Dashboard Selector -->
      <div v-if="dashboards.length" class="flex items-center gap-3 mb-6">
        <select v-model="selectedDashboardId" @change="loadDashboard" class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 text-sm font-medium">
          <option v-for="d in dashboards" :key="d.id" :value="d.id">{{ d.name }}</option>
        </select>
        <button v-if="selectedDashboard" @click="openAddWidget" class="px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition flex items-center gap-1 text-slate-700 dark:text-slate-200">
          <PlusIcon class="w-3.5 h-3.5" />
          Add Widget
        </button>
        <button v-if="selectedDashboard" @click="deleteDashboard" class="px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition">
          <Trash2Icon class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex-grow flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>

    <!-- Widgets Grid -->
    <div v-else-if="selectedDashboard && selectedDashboard.widgets?.length" class="flex-grow overflow-y-auto min-h-0 pr-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="widget in selectedDashboard.widgets" :key="widget.id"
        class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm relative"
        :class="{ 'md:col-span-2': widget.width === 2, 'lg:col-span-3': widget.width === 3 }">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-bold text-slate-700 dark:text-slate-200">{{ widget.title }}</h3>
          <div class="flex items-center gap-1">
            <!-- Config button for chart widgets -->
            <button v-if="['PIE_CHART','BAR_CHART','LINE_CHART'].includes(widget.type)" @click="openConfig(widget)" class="text-slate-400 hover:text-orange-500 transition p-0.5" title="Configure">
              <SettingsIcon class="w-3.5 h-3.5" />
            </button>
            <button @click="removeWidget(widget.id)" class="text-slate-400 hover:text-red-500 transition p-0.5">
              <XIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <!-- Widget Content -->
        <div class="min-h-[120px]">
          <!-- Loading widget data -->
          <div v-if="widgetDataLoading[widget.id]" class="flex items-center justify-center py-10">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
          </div>

          <!-- STATS -->
          <div v-else-if="widget.type === 'STATS'" class="grid grid-cols-2 gap-3">
            <div v-for="(val, key) in widgetData[widget.id]" :key="key" class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 text-center">
              <p class="text-lg font-bold text-slate-800 dark:text-white">{{ val }}</p>
              <p class="text-xs text-slate-500 capitalize">{{ key }}</p>
            </div>
          </div>

          <!-- ACTIVITY_STREAM -->
          <div v-else-if="widget.type === 'ACTIVITY_STREAM' || widget.type === 'ACTIVITY'" class="w-full space-y-2 max-h-[300px] overflow-y-auto">
            <div v-for="(item, i) in (widgetData[widget.id]?.items || []).slice(0, 10)" :key="i" class="flex items-center gap-2 text-xs py-1 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
              <div class="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></div>
              <span class="text-slate-600 dark:text-slate-300 truncate">{{ item.description || item.action || JSON.stringify(item) }}</span>
            </div>
            <div v-if="!widgetData[widget.id]?.items?.length" class="text-slate-400 text-xs text-center py-4">No activity yet</div>
          </div>

          <!-- CALENDAR -->
          <div v-else-if="widget.type === 'CALENDAR'" class="w-full max-h-[300px] overflow-y-auto space-y-1">
            <div v-for="(issue, i) in (widgetData[widget.id]?.items || [])" :key="i" class="flex items-center gap-2 text-xs py-1.5 px-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700/30">
              <span class="w-16 flex-shrink-0 text-slate-500 font-mono">{{ formatDate(issue.dueDate) }}</span>
              <span :class="priorityDot(issue.priority)" class="w-1.5 h-1.5 rounded-full flex-shrink-0"></span>
              <span class="text-slate-700 dark:text-slate-300 truncate">{{ issue.key }} {{ issue.summary }}</span>
            </div>
            <div v-if="!widgetData[widget.id]?.items?.length" class="text-slate-400 text-xs text-center py-4">No upcoming due dates</div>
          </div>

          <!-- PIE CHART -->
          <div v-else-if="widget.type === 'PIE_CHART'" class="flex items-center gap-4 justify-center py-2">
            <svg v-if="widgetData[widget.id]?.items?.length" :width="120" :height="120" viewBox="-1 -1 2 2" class="flex-shrink-0">
              <path
                v-for="(slice, i) in pieSlices(widgetData[widget.id].items)"
                :key="i"
                :d="slice.d"
                :fill="chartColor(i)"
                class="hover:opacity-80 transition cursor-pointer"
              >
                <title>{{ slice.name }}: {{ slice.count }}</title>
              </path>
            </svg>
            <div v-if="widgetData[widget.id]?.items?.length" class="space-y-1.5">
              <div v-for="(item, i) in widgetData[widget.id].items" :key="i" class="flex items-center gap-1.5 text-xs">
                <span class="w-3 h-3 rounded" :style="{ backgroundColor: chartColor(i) }"></span>
                <span class="text-slate-600 dark:text-slate-400">{{ item.name }}</span>
                <span class="font-bold text-slate-800 dark:text-slate-200 ml-auto">{{ item.count }}</span>
              </div>
            </div>
          </div>

          <!-- BAR CHART -->
          <div v-else-if="widget.type === 'BAR_CHART' || widget.type === 'LINE_CHART'" class="w-full">
            <div v-if="widgetData[widget.id]?.items?.length" class="space-y-2 pt-2">
              <div v-for="(item, i) in widgetData[widget.id].items" :key="i" class="flex items-center gap-2">
                <span class="text-xs text-slate-500 dark:text-slate-400 w-16 truncate flex-shrink-0">{{ item.name }}</span>
                <div class="flex-1 bg-slate-100 dark:bg-slate-700 rounded-full h-5 overflow-hidden">
                  <div class="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-1.5"
                    :style="{ width: barPercent(item.count, widgetData[widget.id].items) + '%', backgroundColor: chartColor(i) }">
                  </div>
                </div>
                <span class="text-xs font-bold text-slate-700 dark:text-slate-300 w-8 text-right">{{ item.count }}</span>
              </div>
            </div>
            <div v-else class="text-slate-400 text-xs text-center py-8">No data</div>
          </div>

          <!-- Fallback -->
          <div v-else class="text-center py-8 text-slate-400 text-sm">
            <BarChart3Icon class="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>{{ widget.type }} widget</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="flex-grow flex flex-col items-center justify-center py-20">
      <LayoutDashboardIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
      <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">No dashboards yet</h3>
      <p class="text-sm text-slate-400 mb-4">Create a custom dashboard with widgets to track your project</p>
      <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">
        Create Dashboard
      </button>
    </div>

    <!-- Create Dashboard Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showCreateModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">New Dashboard</h2>
          <input v-model="newDashboardName" placeholder="Dashboard name" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm mb-3 outline-none focus:ring-1 focus:ring-orange-500" />
          <textarea v-model="newDashboardDesc" placeholder="Description (optional)" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm mb-4 outline-none focus:ring-1 focus:ring-orange-500"></textarea>
          <div class="flex justify-end gap-2">
            <button @click="showCreateModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="createDashboard" :disabled="!newDashboardName" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Add Widget Modal -->
    <Teleport to="body">
      <div v-if="showWidgetModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showWidgetModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">Add Widget</h2>
          <input v-model="widgetForm.title" placeholder="Widget title" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm mb-3 outline-none focus:ring-1 focus:ring-orange-500" />
          <select v-model="widgetForm.type" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm mb-3 outline-none focus:ring-1 focus:ring-orange-500">
            <option value="STATS">Stats</option>
            <option value="PIE_CHART">Pie Chart</option>
            <option value="BAR_CHART">Bar Chart</option>
            <option value="LINE_CHART">Line Chart</option>
            <option value="ACTIVITY_STREAM">Activity Stream</option>
            <option value="CALENDAR">Calendar</option>
          </select>
          <!-- Config for chart types -->
          <div v-if="['PIE_CHART','BAR_CHART','LINE_CHART'].includes(widgetForm.type)" class="mb-3">
            <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Group By</label>
            <select v-model="widgetForm.groupBy" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm outline-none focus:ring-1 focus:ring-orange-500">
              <option value="status">Status</option>
              <option value="priority">Priority</option>
              <option value="type">Type</option>
            </select>
          </div>
          <div class="flex justify-end gap-2">
            <button @click="showWidgetModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="addWidget" :disabled="!widgetForm.title" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">Add</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Config Widget Modal -->
    <Teleport to="body">
      <div v-if="showConfigModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showConfigModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">Configure Widget</h2>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Group By</label>
          <select v-model="configForm.groupBy" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 dark:text-slate-200 text-sm mb-4 outline-none focus:ring-1 focus:ring-orange-500">
            <option value="status">Status</option>
            <option value="priority">Priority</option>
            <option value="type">Type</option>
          </select>
          <div class="flex justify-end gap-2">
            <button @click="showConfigModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="saveWidgetConfig" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Save</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, X as XIcon, Trash2 as Trash2Icon, BarChart3 as BarChart3Icon, LayoutDashboard as LayoutDashboardIcon, HelpCircle as HelpCircleIcon, Settings as SettingsIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308', '#06b6d4', '#ec4899', '#14b8a6', '#f43f5e'];

export default defineComponent({
  name: 'DashboardView',
  components: { PlusIcon, XIcon, Trash2Icon, BarChart3Icon, LayoutDashboardIcon, HelpCircleIcon, SettingsIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const showHelp = ref(false);
    const dashboards = ref<any[]>([]);
    const selectedDashboardId = ref('');
    const selectedDashboard = ref<any>(null);
    const showCreateModal = ref(false);
    const showWidgetModal = ref(false);
    const showConfigModal = ref(false);
    const newDashboardName = ref('');
    const newDashboardDesc = ref('');
    const widgetForm = ref({ title: '', type: 'STATS', groupBy: 'status' });
    const widgetData = ref<Record<string, any>>({});
    const widgetDataLoading = ref<Record<string, boolean>>({});
    const configForm = ref({ widgetId: '', groupBy: 'status' });

    const fetchDashboards = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/dashboards?projectId=${projectId.value}`);
        dashboards.value = data.data || [];
        if (dashboards.value.length && !selectedDashboardId.value) {
          selectedDashboardId.value = dashboards.value[0].id;
          await loadDashboard();
        }
      } catch (err) {
        console.error('Failed to fetch dashboards:', err);
        toast.error('Failed to load dashboard data');
      } finally {
        loading.value = false;
      }
    };

    const loadDashboard = async () => {
      if (!selectedDashboardId.value) return;
      loading.value = true;
      try {
        const { data } = await api.get(`/dashboards/${selectedDashboardId.value}`);
        selectedDashboard.value = data.data;
        // Fetch data for every widget
        await Promise.all((data.data.widgets || []).map((w: any) => loadWidgetData(w)));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        toast.error('Failed to load selected dashboard');
      } finally {
        loading.value = false;
      }
    };

    const loadWidgetData = async (widget: any) => {
      widgetDataLoading.value[widget.id] = true;
      try {
        const { data: res } = await api.get(`/widgets/${widget.id}/data`);
        widgetData.value[widget.id] = res.data || res;
      } catch (err) {
        console.error('Failed to load widget data:', err);
        widgetData.value[widget.id] = {};
      } finally {
        widgetDataLoading.value[widget.id] = false;
      }
    };

    const openCreateModal = () => { newDashboardName.value = ''; newDashboardDesc.value = ''; showCreateModal.value = true; };

    const createDashboard = async () => {
      try {
        await api.post('/dashboards', { name: newDashboardName.value, description: newDashboardDesc.value, projectId: projectId.value });
        toast.success('Dashboard created');
        showCreateModal.value = false;
        await fetchDashboards();
      } catch { toast.error('Failed to create dashboard'); }
    };

    const deleteDashboard = async () => {
      if (!confirm('Delete this dashboard?')) return;
      try {
        await api.delete(`/dashboards/${selectedDashboardId.value}`);
        toast.success('Dashboard deleted');
        selectedDashboardId.value = '';
        selectedDashboard.value = null;
        await fetchDashboards();
      } catch { toast.error('Failed to delete'); }
    };

    const openAddWidget = () => { widgetForm.value = { title: '', type: 'STATS', groupBy: 'status' }; showWidgetModal.value = true; };

    const addWidget = async () => {
      try {
        const config = ['PIE_CHART','BAR_CHART','LINE_CHART'].includes(widgetForm.value.type)
          ? { groupBy: widgetForm.value.groupBy, projectId: projectId.value }
          : { projectId: projectId.value };
        await api.post(`/dashboards/${selectedDashboardId.value}/widgets`, {
          title: widgetForm.value.title,
          type: widgetForm.value.type,
          config,
          width: 1, height: 1, x: 0, y: 0,
        });
        toast.success('Widget added');
        showWidgetModal.value = false;
        await loadDashboard();
      } catch { toast.error('Failed to add widget'); }
    };

    const removeWidget = async (widgetId: string) => {
      try {
        await api.delete(`/widgets/${widgetId}`);
        delete widgetData.value[widgetId];
        await loadDashboard();
      } catch { toast.error('Failed to remove widget'); }
    };

    const openConfig = (widget: any) => {
      const cfg = widget.config ? (typeof widget.config === 'string' ? JSON.parse(widget.config) : widget.config) : {};
      configForm.value = { widgetId: widget.id, groupBy: cfg.groupBy || 'status' };
      showConfigModal.value = true;
    };

    const saveWidgetConfig = async () => {
      try {
        await api.patch(`/widgets/${configForm.value.widgetId}`, {
          config: { groupBy: configForm.value.groupBy, projectId: projectId.value },
        });
        showConfigModal.value = false;
        toast.success('Widget updated');
        await loadDashboard();
      } catch { toast.error('Failed to update widget'); }
    };

    // Chart helpers
    const chartColor = (i: number) => COLORS[i % COLORS.length];

    const pieSlices = (items: any[]) => {
      const total = items.reduce((s: number, it: any) => s + it.count, 0);
      if (total === 0) return [];
      let offset = 0;
      return items.map((it: any) => {
        const fraction = it.count / total;
        const angle = fraction * Math.PI * 2;
        const x1 = Math.cos(offset), y1 = Math.sin(offset);
        const x2 = Math.cos(offset + angle), y2 = Math.sin(offset + angle);
        const large = angle > Math.PI ? 1 : 0;
        const d = `M 0 0 L ${x1} ${y1} A 1 1 0 ${large} 1 ${x2} ${y2} Z`;
        const slice = { d, name: it.name, count: it.count };
        offset += angle;
        return slice;
      });
    };

    const barPercent = (count: number, items: any[]) => {
      const max = Math.max(...items.map((i: any) => i.count), 1);
      return (count / max) * 100;
    };

    const priorityDot = (p: string) => {
      switch (p?.toUpperCase()) {
        case 'HIGHEST': return 'bg-red-600';
        case 'HIGH': return 'bg-orange-500';
        case 'MEDIUM': return 'bg-yellow-500';
        case 'LOW': return 'bg-green-500';
        default: return 'bg-slate-400';
      }
    };

    const formatDate = (d: string | Date) => {
      if (!d) return '';
      const date = new Date(d);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    onMounted(fetchDashboards);

    return {
      loading, dashboards, selectedDashboardId, selectedDashboard, showCreateModal, showWidgetModal, showConfigModal,
      newDashboardName, newDashboardDesc, widgetForm, widgetData, widgetDataLoading, configForm,
      openCreateModal, createDashboard, deleteDashboard, openAddWidget, addWidget, removeWidget, loadDashboard, showHelp,
      openConfig, saveWidgetConfig, chartColor, pieSlices, barPercent, priorityDot, formatDate,
    };
  },
});
</script>
