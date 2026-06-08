<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200">
    <div class="flex-shrink-0 mb-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
            Workflows
            <button @click="showHelp = !showHelp" class="p-1 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition" title="Toggle Help Guide">
              <HelpCircleIcon class="w-5 h-5" />
            </button>
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Custom issue workflows with states and transitions</p>
        </div>
        <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-2">
          <PlusIcon class="w-4 h-4" />
          New Workflow
        </button>
      </div>
    </div>

    <div class="flex-grow overflow-y-auto min-h-0 pr-1">

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
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">🔄 Custom Issue Workflows</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Workflows define the exact sequence of states and permitted transitions that cards follow as they progress on boards.
          </p>
          <ul class="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1.5 pl-4 list-disc">
            <li><strong>States Editor</strong>: Click "New Workflow" to create customized status categories (TODO, IN PROGRESS, DONE) for issues.</li>
            <li><strong>Transitions</strong>: Define visual lines and paths that cards follow when moving from columns.</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>

    <!-- Workflow List -->
    <div v-else-if="workflows.length" class="space-y-4">
      <div v-for="wf in workflows" :key="wf.id" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div>
            <h3 class="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              {{ wf.name }}
              <span v-if="wf.isDefault" class="text-xs bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 px-2 py-0.5 rounded-full">Default</span>
            </h3>
            <p v-if="wf.description" class="text-xs text-slate-500 mt-1">{{ wf.description }}</p>
          </div>
          <div class="flex items-center gap-2">
            <button @click="editWorkflow(wf)" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
              <EditIcon class="w-4 h-4 text-slate-500" />
            </button>
            <button @click="deleteWorkflow(wf.id)" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
              <Trash2Icon class="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>

        <!-- States -->
        <div class="flex flex-wrap gap-2 mb-3">
          <div v-for="state in wf.states" :key="state.id"
            class="px-3 py-1.5 rounded-full text-xs font-semibold"
            :class="stateColor(state.category)">
            {{ state.name }}
          </div>
        </div>

        <!-- Transitions -->
        <div v-if="wf.transitions?.length" class="flex flex-wrap gap-2">
          <div v-for="t in wf.transitions" :key="t.id" class="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded">
            {{ getStateName(wf, t.fromStateId) }} → {{ getStateName(wf, t.toStateId) }}
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-20">
      <GitBranchIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
      <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">No custom workflows</h3>
      <p class="text-sm text-slate-400 mb-4">Create workflows to define how issues move through states</p>
      <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Create Workflow</button>
    </div>

    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[80vh] overflow-y-auto">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">{{ editingId ? 'Edit' : 'New' }} Workflow</h2>
          
          <input v-model="form.name" placeholder="Workflow name" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3" />
          <textarea v-model="form.description" placeholder="Description" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3"></textarea>

          <div class="flex items-center gap-2 mb-4">
            <input type="checkbox" id="isDefault" v-model="form.isDefault" class="rounded border-slate-300 text-orange-500 focus:ring-orange-500" />
            <label for="isDefault" class="text-sm font-semibold text-slate-700 dark:text-slate-350">Set as Active (Default) Workflow</label>
          </div>

          <!-- States Editor -->
          <div class="mb-4">
            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">States</h4>
            <div v-for="(state, i) in form.states" :key="i" class="flex items-center gap-2 mb-2">
              <input v-model="state.name" placeholder="State name" class="flex-1 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              <select v-model="state.category" class="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
                <option value="TODO">TODO</option>
                <option value="IN_PROGRESS">IN PROGRESS</option>
                <option value="DONE">DONE</option>
              </select>
              <button @click="form.states.splice(i, 1)" class="text-red-400 hover:text-red-600"><XIcon class="w-4 h-4" /></button>
            </div>
            <button @click="form.states.push({ name: '', category: 'TODO' })" class="text-xs text-orange-500 font-semibold hover:underline">+ Add State</button>
          </div>

          <div class="flex justify-end gap-2">
            <button @click="showModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="saveWorkflow" :disabled="!form.name" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">Save</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, Edit as EditIcon, Trash2 as Trash2Icon, X as XIcon, GitBranch as GitBranchIcon, HelpCircle as HelpCircleIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'WorkflowView',
  components: { PlusIcon, EditIcon, Trash2Icon, XIcon, GitBranchIcon, HelpCircleIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const showHelp = ref(true);
    const workflows = ref<any[]>([]);
    const showModal = ref(false);
    const editingId = ref('');
    const form = ref<any>({ name: '', description: '', isDefault: false, states: [{ name: 'To Do', category: 'TODO' }, { name: 'In Progress', category: 'IN_PROGRESS' }, { name: 'Done', category: 'DONE' }] });

    const fetchWorkflows = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/projects/${projectId.value}/workflows`);
        workflows.value = data.data || [];
      } catch { /* empty */ } finally { loading.value = false; }
    };

    const openCreateModal = () => {
      editingId.value = '';
      form.value = { name: '', description: '', isDefault: false, states: [{ name: 'To Do', category: 'TODO' }, { name: 'In Progress', category: 'IN_PROGRESS' }, { name: 'Done', category: 'DONE' }] };
      showModal.value = true;
    };

    const editWorkflow = (wf: any) => {
      editingId.value = wf.id;
      form.value = { name: wf.name, description: wf.description || '', isDefault: wf.isDefault || false, states: wf.states?.map((s: any) => ({ id: s.id, name: s.name, category: s.category })) || [] };
      showModal.value = true;
    };

    const saveWorkflow = async () => {
      try {
        if (editingId.value) {
          await api.patch(`/workflows/${editingId.value}`, { name: form.value.name, description: form.value.description, isDefault: form.value.isDefault, states: form.value.states });
        } else {
          await api.post(`/projects/${projectId.value}/workflows`, { ...form.value });
        }
        toast.success('Workflow saved');
        showModal.value = false;
        await fetchWorkflows();
      } catch { toast.error('Failed to save workflow'); }
    };

    const deleteWorkflow = async (id: string) => {
      if (!confirm('Delete this workflow?')) return;
      try {
        await api.delete(`/workflows/${id}`);
        toast.success('Workflow deleted');
        await fetchWorkflows();
      } catch { toast.error('Failed to delete'); }
    };

    const stateColor = (category: string) => {
      switch (category) {
        case 'TODO': return 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300';
        case 'IN_PROGRESS': return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
        case 'DONE': return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
        default: return 'bg-slate-100 text-slate-600';
      }
    };

    const getStateName = (wf: any, stateId: string) => wf.states?.find((s: any) => s.id === stateId)?.name || '?';

    onMounted(fetchWorkflows);

    return { loading, workflows, showModal, editingId, form, openCreateModal, editWorkflow, saveWorkflow, deleteWorkflow, stateColor, getStateName, showHelp };
  },
});
</script>
