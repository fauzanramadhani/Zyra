<template>
  <div class="p-6 max-w-7xl w-full mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-white">Approvals</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage approval workflows for issues</p>
      </div>
      <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-2">
        <PlusIcon class="w-4 h-4" />
        New Approval Rule
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
      <button @click="tab = 'rules'" :class="tab === 'rules' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''" class="px-4 py-2 rounded-md text-sm font-medium transition">Rules</button>
      <button @click="tab = 'pending'" :class="tab === 'pending' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''" class="px-4 py-2 rounded-md text-sm font-medium transition">
        Pending
        <span v-if="pendingCount" class="ml-1 bg-orange-500 text-white text-xs px-1.5 py-0.5 rounded-full">{{ pendingCount }}</span>
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>

    <!-- Rules Tab -->
    <div v-else-if="tab === 'rules'">
      <div v-if="rules.length" class="space-y-3">
        <div v-for="rule in rules" :key="rule.id" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-slate-800 dark:text-white text-sm">{{ rule.name }}</h3>
              <p class="text-xs text-slate-500 mt-1">
                Trigger: {{ rule.triggerStatus }} → Target: {{ rule.targetStatus }} · {{ rule.requiredApprovals }} approval(s) needed
              </p>
            </div>
            <button @click="deleteRule(rule.id)" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
              <Trash2Icon class="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-16">
        <ShieldCheckIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">No approval rules</h3>
        <p class="text-sm text-slate-400">Create rules to require approvals before issues move to certain statuses</p>
      </div>
    </div>

    <!-- Pending Tab -->
    <div v-else-if="tab === 'pending'">
      <div v-if="pendingRequests.length" class="space-y-3">
        <div v-for="req in pendingRequests" :key="req.id" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-slate-800 dark:text-white text-sm">{{ req.issue?.summary || 'Issue' }}</h3>
              <p class="text-xs text-slate-500 mt-1">
                Rule: {{ req.rule?.name }} · Requested {{ formatDate(req.createdAt) }}
                · {{ req.responses?.length || 0 }}/{{ req.rule?.requiredApprovals }} approvals
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button @click="respond(req.id, 'APPROVED')" class="px-3 py-1.5 bg-green-500 text-white rounded-lg text-xs font-semibold hover:bg-green-600 transition">Approve</button>
              <button @click="respond(req.id, 'REJECTED')" class="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600 transition">Reject</button>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="text-center py-16">
        <CheckCircleIcon class="w-12 h-12 mx-auto text-green-300 mb-4" />
        <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300">All caught up!</h3>
        <p class="text-sm text-slate-400">No pending approvals</p>
      </div>
    </div>

    <!-- Create Rule Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">New Approval Rule</h2>
          <input v-model="form.name" placeholder="Rule name" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3" />
          <input v-model="form.triggerStatus" placeholder="Trigger status (e.g. IN_REVIEW)" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3" />
          <input v-model="form.targetStatus" placeholder="Target status after approval (e.g. DONE)" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3" />
          <input v-model.number="form.requiredApprovals" type="number" min="1" placeholder="Required approvals" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-4" />
          <div class="flex justify-end gap-2">
            <button @click="showModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="createRule" :disabled="!form.name" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, Trash2 as Trash2Icon, ShieldCheck as ShieldCheckIcon, CheckCircle as CheckCircleIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'ApprovalsView',
  components: { PlusIcon, Trash2Icon, ShieldCheckIcon, CheckCircleIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const tab = ref('rules');
    const rules = ref<any[]>([]);
    const pendingRequests = ref<any[]>([]);
    const pendingCount = computed(() => pendingRequests.value.length);
    const showModal = ref(false);
    const form = ref({ name: '', triggerStatus: '', targetStatus: '', requiredApprovals: 1 });

    const fetchRules = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/approvals/rules?projectId=${projectId.value}`);
        rules.value = data.data || [];
      } catch { /* empty */ } finally { loading.value = false; }
    };

    const fetchPending = async () => {
      try {
        const { data } = await api.get('/approvals/pending');
        pendingRequests.value = data.data || [];
      } catch { /* empty */ }
    };

    const openCreateModal = () => { form.value = { name: '', triggerStatus: '', targetStatus: '', requiredApprovals: 1 }; showModal.value = true; };

    const createRule = async () => {
      try {
        await api.post('/approvals/rules', { ...form.value, projectId: projectId.value });
        toast.success('Approval rule created');
        showModal.value = false;
        await fetchRules();
      } catch { toast.error('Failed to create rule'); }
    };

    const deleteRule = async (id: string) => {
      if (!confirm('Delete this rule?')) return;
      try {
        await api.delete(`/approvals/rules/${id}`);
        toast.success('Rule deleted');
        await fetchRules();
      } catch { toast.error('Failed to delete'); }
    };

    const respond = async (requestId: string, decision: string) => {
      try {
        await api.post(`/approvals/requests/${requestId}/respond`, { decision, comment: '' });
        toast.success(decision === 'APPROVED' ? 'Approved' : 'Rejected');
        await fetchPending();
      } catch { toast.error('Failed to respond'); }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString();

    onMounted(() => { fetchRules(); fetchPending(); });

    return { loading, tab, rules, pendingRequests, pendingCount, showModal, form, openCreateModal, createRule, deleteRule, respond, formatDate };
  },
});
</script>
