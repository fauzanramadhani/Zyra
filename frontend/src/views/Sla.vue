<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200">
    <div class="flex-shrink-0 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 dark:text-white">SLA Policies</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Track start work and resolution time targets</p>
        </div>
        <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-2">
          <PlusIcon class="w-4 h-4" />
          New SLA Policy
        </button>
      </div>
    </div>

    <div class="flex-grow overflow-y-auto min-h-0 pr-1">

      <!-- Compliance Report -->
      <div v-if="report" class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p class="text-2xl font-bold text-slate-800 dark:text-white">{{ report.trackers?.length || 0 }}</p>
          <p class="text-xs text-slate-500">Total Tracked</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p class="text-2xl font-bold text-green-500">
            {{ report.trackers?.filter((t: any) => t.startWorkStatus === 'MET' && t.resolutionStatus === 'MET').length || 0 }}
          </p>
          <p class="text-xs text-slate-500">SLA Met</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p class="text-2xl font-bold text-red-500">{{ report.totalBreached || 0 }}</p>
          <p class="text-xs text-slate-500">Breached</p>
        </div>
        <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-center">
          <p class="text-2xl font-bold text-orange-500">
            {{ report.startWorkCompliance }}% / {{ report.resolutionCompliance }}%
          </p>
          <p class="text-xs text-slate-500">Compliance (Start / Res)</p>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>

      <div v-else-if="policies.length" class="space-y-3">
        <div v-for="policy in policies" :key="policy.id" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-slate-800 dark:text-white text-sm">{{ policy.name }}</h3>
              <p class="text-xs text-slate-500 mt-1">
                Priority: <span class="font-medium text-orange-500 uppercase">{{ policy.priority || 'All' }}</span> ·
                Start Work: <span class="font-medium text-slate-700 dark:text-slate-300">{{ policy.startWorkTimeMin }}m</span> ·
                Resolution: <span class="font-medium text-slate-700 dark:text-slate-300">{{ policy.resolutionTimeMin }}m</span> ·
                Warning: <span class="font-medium text-slate-700 dark:text-slate-300">{{ policy.warningThresholdPercent }}%</span>
              </p>
            </div>
            <button @click="deletePolicy(policy.id)" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
              <Trash2Icon class="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-20">
        <ClockIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">No SLA policies</h3>
        <p class="text-sm text-slate-400 mb-4">Define start work and resolution time targets for your issues</p>
        <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Create Policy</button>
      </div>

    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">New SLA Policy</h2>
          
          <div class="space-y-3">
            <div>
              <label class="text-xs text-slate-500 mb-1 block">Policy Name</label>
              <input v-model="form.name" placeholder="e.g. Standard High Priority SLA" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
            </div>

            <div>
              <label class="text-xs text-slate-500 mb-1 block">Priority Match</label>
              <select v-model="form.priority" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-1 focus:ring-orange-500">
                <option value="*">All Priorities (*)</option>
                <option value="HIGHEST">Highest</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Start Work (min)</label>
                <input v-model.number="form.startWorkTimeMin" type="number" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Resolution (min)</label>
                <input v-model.number="form.resolutionTimeMin" type="number" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
              <div>
                <label class="text-xs text-slate-500 mb-1 block">Warning (%)</label>
                <input v-model.number="form.warningThresholdPercent" type="number" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none focus:ring-1 focus:ring-orange-500" />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 mt-5">
            <button @click="showModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="createPolicy" :disabled="!form.name" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, Trash2 as Trash2Icon, Clock as ClockIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'SlaView',
  components: { PlusIcon, Trash2Icon, ClockIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const policies = ref<any[]>([]);
    const report = ref<any>(null);
    const showModal = ref(false);
    const form = ref({
      name: '',
      priority: '*',
      startWorkTimeMin: 60,
      resolutionTimeMin: 480,
      warningThresholdPercent: 20,
    });

    const fetchPolicies = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/projects/${projectId.value}/sla`);
        policies.value = data.data || [];
      } catch { /* empty */ } finally { loading.value = false; }
    };

    const fetchReport = async () => {
      try {
        const { data } = await api.get(`/projects/${projectId.value}/sla/report`);
        report.value = data.data;
      } catch { /* empty */ }
    };

    const openCreateModal = () => {
      form.value = {
        name: '',
        priority: '*',
        startWorkTimeMin: 60,
        resolutionTimeMin: 480,
        warningThresholdPercent: 20,
      };
      showModal.value = true;
    };

    const createPolicy = async () => {
      try {
        await api.post(`/projects/${projectId.value}/sla`, form.value);
        toast.success('SLA policy created');
        showModal.value = false;
        await fetchPolicies();
        await fetchReport();
      } catch { toast.error('Failed to create policy'); }
    };

    const deletePolicy = async (id: string) => {
      if (!confirm('Delete this SLA policy?')) return;
      try {
        await api.delete(`/sla/${id}`);
        toast.success('Policy deleted');
        await fetchPolicies();
        await fetchReport();
      } catch { toast.error('Failed to delete'); }
    };

    onMounted(() => {
      fetchPolicies();
      fetchReport();
    });

    return { loading, policies, report, showModal, form, openCreateModal, createPolicy, deletePolicy };
  },
});
</script>
