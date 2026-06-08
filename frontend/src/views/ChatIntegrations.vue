<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200">
    <div class="flex-shrink-0 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 dark:text-white">Chat Integrations</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Send notifications to Slack or Discord</p>
        </div>
        <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-2">
          <PlusIcon class="w-4 h-4" />
          Add Integration
        </button>
      </div>
    </div>

    <div class="flex-grow overflow-y-auto min-h-0 pr-1">

    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>

    <div v-else-if="integrations.length" class="space-y-3">
      <div v-for="item in integrations" :key="item.id" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center" :class="item.provider === 'SLACK' ? 'bg-purple-50 dark:bg-purple-900/20' : 'bg-indigo-50 dark:bg-indigo-900/20'">
              <MessageSquareIcon class="w-5 h-5" :class="item.provider === 'SLACK' ? 'text-purple-500' : 'text-indigo-500'" />
            </div>
            <div>
              <h3 class="font-semibold text-slate-800 dark:text-white text-sm">{{ item.name }}</h3>
              <p class="text-xs text-slate-500 mt-0.5">{{ item.provider }} · {{ item.channelName || 'Webhook' }} · {{ item.events?.length || 0 }} events</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="testWebhook(item.id)" class="px-3 py-1.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition">Test</button>
            <button @click="deleteIntegration(item.id)" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
              <Trash2Icon class="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
        <!-- Events -->
        <div v-if="item.events?.length" class="mt-2 flex flex-wrap gap-1">
          <span v-for="ev in item.events" :key="ev" class="text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">{{ ev }}</span>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20">
      <MessageSquareIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
      <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">No chat integrations</h3>
      <p class="text-sm text-slate-400 mb-4">Connect Slack or Discord to receive project notifications</p>
      <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Add Integration</button>
    </div>

    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">Add Chat Integration</h2>
          <input v-model="form.name" placeholder="Integration name" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3" />
          <select v-model="form.provider" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3">
            <option value="SLACK">Slack</option>
            <option value="DISCORD">Discord</option>
          </select>
          <input v-model="form.webhookUrl" placeholder="Webhook URL" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3" />
          <input v-model="form.channelName" placeholder="Channel name (optional)" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3" />
          
          <!-- Events -->
          <div class="mb-4">
            <h4 class="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Events to notify</h4>
            <div class="grid grid-cols-2 gap-2">
              <label v-for="ev in availableEvents" :key="ev" class="flex items-center gap-2 text-xs">
                <input type="checkbox" :value="ev" v-model="form.events" class="rounded" />
                {{ ev }}
              </label>
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <button @click="showModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="createIntegration" :disabled="!form.name || !form.webhookUrl" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, Trash2 as Trash2Icon, MessageSquare as MessageSquareIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'ChatIntegrationsView',
  components: { PlusIcon, Trash2Icon, MessageSquareIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const integrations = ref<any[]>([]);
    const showModal = ref(false);
    const availableEvents = ['issue_created', 'issue_updated', 'status_changed', 'comment_added', 'sprint_started', 'sprint_completed'];
    const form = ref({ name: '', provider: 'SLACK', webhookUrl: '', channelName: '', events: [] as string[] });

    const fetchIntegrations = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/chat-integrations?projectId=${projectId.value}`);
        integrations.value = data.data || [];
      } catch { /* empty */ } finally { loading.value = false; }
    };

    const openCreateModal = () => { form.value = { name: '', provider: 'SLACK', webhookUrl: '', channelName: '', events: [] }; showModal.value = true; };

    const createIntegration = async () => {
      try {
        await api.post('/chat-integrations', { ...form.value, projectId: projectId.value });
        toast.success('Integration added');
        showModal.value = false;
        await fetchIntegrations();
      } catch { toast.error('Failed to add integration'); }
    };

    const testWebhook = async (id: string) => {
      try {
        await api.post(`/chat-integrations/${id}/test`);
        toast.success('Test message sent');
      } catch { toast.error('Webhook test failed'); }
    };

    const deleteIntegration = async (id: string) => {
      if (!confirm('Remove this integration?')) return;
      try {
        await api.delete(`/chat-integrations/${id}`);
        toast.success('Integration removed');
        await fetchIntegrations();
      } catch { toast.error('Failed to remove'); }
    };

    onMounted(fetchIntegrations);

    return { loading, integrations, showModal, form, availableEvents, openCreateModal, createIntegration, testWebhook, deleteIntegration };
  },
});
</script>
