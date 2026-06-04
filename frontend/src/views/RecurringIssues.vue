<template>
  <div class="p-6 max-w-7xl w-full mx-auto text-slate-800 dark:text-slate-200">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-2">
          Recurring Issues
          <button @click="showHelp = !showHelp" class="p-1 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition" title="Toggle Help Guide">
            <HelpCircleIcon class="w-5 h-5" />
          </button>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Automatically create issues on a schedule</p>
      </div>
      <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-bold hover:bg-orange-600 shadow-lg shadow-orange-500/20 transition flex items-center gap-2">
        <PlusIcon class="w-4 h-4" />
        New Recurring Issue
      </button>
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
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">🔁 Scheduled Recurring Issues</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Recurring Issues automate repetitive, periodic task creations using Cron-scheduled background job queues.
          </p>
          <ul class="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1.5 pl-4 list-disc">
            <li><strong>Automated Trigger Intervals</strong>: Scope schedules to Daily, Weekly, Biweekly, or Monthly.</li>
            <li><strong>Execution Testing</strong>: Click the green Play icon to test the automation and generate an issue instantly.</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>

    <div v-else-if="items.length" class="space-y-3">
      <div v-for="item in items" :key="item.id" class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition duration-300">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-4">
            <button @click="toggleEnabled(item)" class="relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0" :class="item.enabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-650'">
              <span class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200" :class="item.enabled ? 'translate-x-5' : ''"></span>
            </button>
            <div>
              <h3 class="font-bold text-slate-800 dark:text-white text-sm">{{ item.parsedTemplate?.summary || 'Untitled' }}</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-2 gap-y-1 items-center">
                <span class="px-1.5 py-0.5 rounded bg-orange-500/10 dark:bg-orange-500/20 text-orange-500 font-extrabold text-[9px] uppercase tracking-wider">{{ item.schedule }}</span>
                <span class="text-slate-300 dark:text-slate-600">·</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold text-[10px] uppercase text-slate-600 dark:text-slate-350">{{ item.parsedTemplate?.type || 'TASK' }}</span>
                <span class="text-slate-300 dark:text-slate-600">·</span>
                <span class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-semibold text-[10px] uppercase text-slate-600 dark:text-slate-350">{{ item.parsedTemplate?.priority || 'MEDIUM' }}</span>
                <span v-if="item.nextRunAt" class="text-slate-300 dark:text-slate-600">·</span>
                <span v-if="item.nextRunAt" class="text-slate-400 dark:text-slate-550">Next: {{ formatDate(item.nextRunAt) }}</span>
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <button @click="triggerNow(item.id)" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-green-500 transition" title="Trigger now">
              <PlayIcon class="w-5 h-5" />
            </button>
            <button @click="deleteItem(item.id)" class="p-2 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-slate-400 hover:text-red-500 transition">
              <Trash2Icon class="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
      <RepeatIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
      <h3 class="text-lg font-bold text-slate-750 dark:text-slate-200 mb-2">No recurring issues configured</h3>
      <p class="text-sm text-slate-400 max-w-md mx-auto mb-6">Schedule automatic issue creation for recurring project setups, audits, and checklists</p>
      <button @click="openCreateModal" class="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 transition">Create Recurring Issue</button>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-xs" @click="showModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">New Recurring Issue</h2>
          
          <div class="space-y-4 mb-5">
            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Issue Summary</label>
              <input v-model="form.summary" placeholder="e.g. Run weekly security audit" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none dark:text-slate-100" />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Description (Optional)</label>
              <textarea v-model="form.description" placeholder="Description of the task..." rows="3" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none dark:text-slate-100"></textarea>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Issue Type</label>
                <select v-model="form.issueType" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100">
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="STORY">Story</option>
                </select>
              </div>
              <div>
                <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Priority</label>
                <select v-model="form.priority" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="HIGHEST">Highest</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-1.5">Interval Schedule</label>
              <select v-model="form.schedule" class="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm outline-none dark:text-slate-100">
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="BIWEEKLY">Biweekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-2.5">
            <button @click="showModal = false" class="px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition">Cancel</button>
            <button @click="createItem" :disabled="!form.summary" class="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20 transition disabled:opacity-50">Create Schedule</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, Trash2 as Trash2Icon, Play as PlayIcon, Repeat as RepeatIcon, HelpCircle as HelpCircleIcon, X as XIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'RecurringIssuesView',
  components: { PlusIcon, Trash2Icon, PlayIcon, RepeatIcon, HelpCircleIcon, XIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const showHelp = ref(true);
    const items = ref<any[]>([]);
    const showModal = ref(false);
    const form = ref({ summary: '', description: '', issueType: 'TASK', priority: 'MEDIUM', schedule: 'WEEKLY' });

    const fetchItems = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/projects/${projectId.value}/recurring`);
        items.value = (data.data || []).map((item: any) => {
          let parsed: any = {};
          try {
            parsed = JSON.parse(item.templateData || '{}');
          } catch {
            parsed = {};
          }
          return {
            ...item,
            parsedTemplate: parsed,
          };
        });
      } catch { /* empty */ } finally { loading.value = false; }
    };

    const openCreateModal = () => { form.value = { summary: '', description: '', issueType: 'TASK', priority: 'MEDIUM', schedule: 'WEEKLY' }; showModal.value = true; };

    const createItem = async () => {
      try {
        await api.post(`/projects/${projectId.value}/recurring`, {
          templateData: {
            summary: form.value.summary,
            description: form.value.description,
            type: form.value.issueType,
            priority: form.value.priority,
          },
          schedule: form.value.schedule,
          timezone: 'UTC',
          enabled: true,
        });
        toast.success('Recurring issue created successfully');
        showModal.value = false;
        await fetchItems();
      } catch { toast.error('Failed to create recurring issue'); }
    };

    const toggleEnabled = async (item: any) => {
      try {
        const nextState = !item.enabled;
        await api.patch(`/recurring/${item.id}`, { enabled: nextState });
        item.enabled = nextState;
        toast.success(nextState ? 'Recurring schedule activated' : 'Recurring schedule paused');
      } catch { toast.error('Failed to toggle status'); }
    };

    const triggerNow = async (id: string) => {
      try {
        await api.post(`/recurring/${id}/trigger`);
        toast.success('Scheduled issue triggered and created successfully');
      } catch { toast.error('Failed to trigger issue creation'); }
    };

    const deleteItem = async (id: string) => {
      if (!confirm('Delete this recurring issue schedule?')) return;
      try {
        await api.delete(`/recurring/${id}`);
        toast.success('Recurring issue schedule deleted');
        await fetchItems();
      } catch { toast.error('Failed to delete schedule'); }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString();

    onMounted(fetchItems);

    return { loading, showHelp, items, showModal, form, openCreateModal, createItem, toggleEnabled, triggerNow, deleteItem, formatDate };
  },
});
</script>
