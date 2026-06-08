<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200">
    <div class="flex-shrink-0 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 dark:text-white">Git Integration</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Connect repositories and track commits, branches, and PRs</p>
        </div>
        <button @click="openConnectModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-2">
          <PlusIcon class="w-4 h-4" />
          Connect Repository
        </button>
      </div>
    </div>

    <div class="flex-grow overflow-y-auto min-h-0 pr-1">

    <!-- Loading -->
    <div v-if="loading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
    </div>

    <!-- Integrations List -->
    <div v-else-if="integrations.length" class="space-y-4">
      <div v-for="repo in integrations" :key="repo.id" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <GitBranchIcon class="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div>
              <h3 class="font-bold text-slate-800 dark:text-white">{{ repo.repoName }}</h3>
              <p class="text-xs text-slate-500">{{ repo.provider }} · {{ repo.repoUrl }}</p>
            </div>
          </div>
          <button @click="deleteIntegration(repo.id)" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
            <Trash2Icon class="w-4 h-4 text-red-500" />
          </button>
        </div>

        <!-- Recent Activity -->
        <div class="mt-3 space-y-2">
          <div v-for="commit in repo.commits?.slice(0, 3)" :key="commit.id" class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <GitCommitIcon class="w-3.5 h-3.5" />
            <span class="font-mono">{{ commit.sha?.substring(0, 7) }}</span>
            <span class="truncate">{{ commit.message }}</span>
          </div>
          <div v-for="pr in repo.pullRequests?.slice(0, 3)" :key="pr.id" class="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <GitPullRequestIcon class="w-3.5 h-3.5" />
            <span :class="pr.status === 'MERGED' ? 'text-purple-500' : pr.status === 'OPEN' ? 'text-green-500' : 'text-red-500'">{{ pr.status }}</span>
            <span class="truncate">{{ pr.title }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-20">
      <GitBranchIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
      <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">No repositories connected</h3>
      <p class="text-sm text-slate-400 mb-4">Connect GitHub, GitLab, or Bitbucket to link commits and PRs to issues</p>
      <button @click="openConnectModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Connect Repository</button>
    </div>

    </div>

    <!-- Connect Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">Connect Repository</h2>
          <select v-model="form.provider" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3">
            <option value="GITHUB">GitHub</option>
            <option value="GITLAB">GitLab</option>
            <option value="BITBUCKET">Bitbucket</option>
          </select>
          <input v-model="form.repoName" placeholder="Repository name (owner/repo)" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3" />
          <input v-model="form.repoUrl" placeholder="Repository URL" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3" />
          <input v-model="form.accessToken" type="password" placeholder="Access token" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-4" />
          <div class="flex justify-end gap-2">
            <button @click="showModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="connectRepo" :disabled="!form.repoName" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">Connect</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, Trash2 as Trash2Icon, GitBranch as GitBranchIcon, GitCommit as GitCommitIcon, GitPullRequest as GitPullRequestIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'GitIntegrationView',
  components: { PlusIcon, Trash2Icon, GitBranchIcon, GitCommitIcon, GitPullRequestIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const integrations = ref<any[]>([]);
    const showModal = ref(false);
    const form = ref({ provider: 'GITHUB', repoName: '', repoUrl: '', accessToken: '' });

    const fetchIntegrations = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/git/integrations?projectId=${projectId.value}`);
        integrations.value = data.data || [];
      } catch { /* empty */ } finally { loading.value = false; }
    };

    const openConnectModal = () => { form.value = { provider: 'GITHUB', repoName: '', repoUrl: '', accessToken: '' }; showModal.value = true; };

    const connectRepo = async () => {
      try {
        await api.post('/git/integrations', { ...form.value, projectId: projectId.value });
        toast.success('Repository connected');
        showModal.value = false;
        await fetchIntegrations();
      } catch { toast.error('Failed to connect repository'); }
    };

    const deleteIntegration = async (id: string) => {
      if (!confirm('Disconnect this repository?')) return;
      try {
        await api.delete(`/git/integrations/${id}`);
        toast.success('Repository disconnected');
        await fetchIntegrations();
      } catch { toast.error('Failed to disconnect'); }
    };

    onMounted(fetchIntegrations);

    return { loading, integrations, showModal, form, openConnectModal, connectRepo, deleteIntegration };
  },
});
</script>
