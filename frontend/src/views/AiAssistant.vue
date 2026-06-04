<template>
  <div class="p-6 max-w-7xl w-full mx-auto">
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 dark:text-white">AI Assistant</h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Smart suggestions powered by AI</p>
      </div>
    </div>

    <!-- Feature Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Smart Assign -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
            <UserPlusIcon class="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <h3 class="font-bold text-slate-800 dark:text-white text-sm">Smart Auto-Assign</h3>
            <p class="text-xs text-slate-500">Suggest best assignee based on workload & expertise</p>
          </div>
        </div>
        <div class="space-y-2">
          <input v-model="assignIssueId" placeholder="Issue ID" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          <button @click="suggestAssignee" :disabled="!assignIssueId || assignLoading" class="w-full px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-semibold hover:bg-purple-600 transition disabled:opacity-50">
            {{ assignLoading ? 'Analyzing...' : 'Get Suggestion' }}
          </button>
          <div v-if="assignResult" class="mt-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p class="text-xs font-semibold text-purple-700 dark:text-purple-300">Suggested: {{ assignResult.suggestedAssignee?.name || 'No suggestion' }}</p>
            <p class="text-xs text-purple-600 dark:text-purple-400 mt-1">Reason: {{ assignResult.reason }}</p>
          </div>
        </div>
      </div>

      <!-- Duplicate Detection -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <CopyIcon class="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h3 class="font-bold text-slate-800 dark:text-white text-sm">Duplicate Detection</h3>
            <p class="text-xs text-slate-500">Find potential duplicate issues</p>
          </div>
        </div>
        <div class="space-y-2">
          <input v-model="dupIssueId" placeholder="Issue ID" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          <button @click="detectDuplicates" :disabled="!dupIssueId || dupLoading" class="w-full px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600 transition disabled:opacity-50">
            {{ dupLoading ? 'Scanning...' : 'Find Duplicates' }}
          </button>
          <div v-if="dupResults.length" class="mt-3 space-y-2">
            <div v-for="dup in dupResults" :key="dup.id" class="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-between">
              <span class="text-xs text-amber-700 dark:text-amber-300 font-medium">{{ dup.key }} - {{ dup.summary }}</span>
              <span class="text-xs font-bold text-amber-600">{{ dup.similarity }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Sprint Planning -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <CalendarIcon class="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <h3 class="font-bold text-slate-800 dark:text-white text-sm">Sprint Planning</h3>
            <p class="text-xs text-slate-500">AI-suggested sprint backlog based on velocity</p>
          </div>
        </div>
        <button @click="getSprintSuggestions" :disabled="sprintLoading" class="w-full px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-semibold hover:bg-blue-600 transition disabled:opacity-50">
          {{ sprintLoading ? 'Calculating...' : 'Get Suggestions' }}
        </button>
        <div v-if="sprintResult" class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p class="text-xs text-blue-700 dark:text-blue-300 mb-2">
            Velocity: <span class="font-bold">{{ sprintResult.velocity }}</span> pts/sprint · Capacity: <span class="font-bold">{{ sprintResult.capacity }}</span> pts
          </p>
          <div v-if="sprintResult.suggestedIssues?.length" class="space-y-1">
            <p class="text-xs font-semibold text-blue-700 dark:text-blue-300">Suggested Issues:</p>
            <div v-for="issue in sprintResult.suggestedIssues" :key="issue.id" class="text-xs text-blue-600 dark:text-blue-400">
              {{ issue.key }} - {{ issue.summary }} ({{ issue.storyPoints || 0 }} pts)
            </div>
          </div>
        </div>
      </div>

      <!-- Issue Summary -->
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
            <SparklesIcon class="w-5 h-5 text-green-500" />
          </div>
          <div>
            <h3 class="font-bold text-slate-800 dark:text-white text-sm">Issue Summary</h3>
            <p class="text-xs text-slate-500">Auto-generated insights for any issue</p>
          </div>
        </div>
        <div class="space-y-2">
          <input v-model="summaryIssueId" placeholder="Issue ID" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
          <button @click="getIssueSummary" :disabled="!summaryIssueId || summaryLoading" class="w-full px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition disabled:opacity-50">
            {{ summaryLoading ? 'Generating...' : 'Generate Summary' }}
          </button>
          <div v-if="summaryResult" class="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg space-y-1">
            <p class="text-xs text-green-700 dark:text-green-300"><strong>Age:</strong> {{ summaryResult.age }}</p>
            <p class="text-xs text-green-700 dark:text-green-300"><strong>Activity:</strong> {{ summaryResult.commentCount }} comments, {{ summaryResult.statusChanges }} status changes</p>
            <p v-if="summaryResult.timeLogged" class="text-xs text-green-700 dark:text-green-300"><strong>Time:</strong> {{ summaryResult.timeLogged }}h logged</p>
            <div v-if="summaryResult.insights?.length" class="mt-2">
              <p v-for="(insight, i) in summaryResult.insights" :key="i" class="text-xs text-green-600 dark:text-green-400">• {{ insight }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { UserPlus as UserPlusIcon, Copy as CopyIcon, Calendar as CalendarIcon, Sparkles as SparklesIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'AiAssistantView',
  components: { UserPlusIcon, CopyIcon, CalendarIcon, SparklesIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    // Smart Assign
    const assignIssueId = ref('');
    const assignLoading = ref(false);
    const assignResult = ref<any>(null);

    const suggestAssignee = async () => {
      assignLoading.value = true;
      assignResult.value = null;
      try {
        const { data } = await api.get(`/ai/suggest-assignee/${assignIssueId.value}`);
        assignResult.value = data.data;
      } catch { toast.error('Failed to get suggestion'); } finally { assignLoading.value = false; }
    };

    // Duplicate Detection
    const dupIssueId = ref('');
    const dupLoading = ref(false);
    const dupResults = ref<any[]>([]);

    const detectDuplicates = async () => {
      dupLoading.value = true;
      dupResults.value = [];
      try {
        const { data } = await api.get(`/ai/duplicates/${dupIssueId.value}`);
        dupResults.value = data.data || [];
      } catch { toast.error('Failed to detect duplicates'); } finally { dupLoading.value = false; }
    };

    // Sprint Planning
    const sprintLoading = ref(false);
    const sprintResult = ref<any>(null);

    const getSprintSuggestions = async () => {
      sprintLoading.value = true;
      sprintResult.value = null;
      try {
        const { data } = await api.get(`/ai/sprint-suggestions?projectId=${projectId.value}`);
        sprintResult.value = data.data;
      } catch { toast.error('Failed to get suggestions'); } finally { sprintLoading.value = false; }
    };

    // Issue Summary
    const summaryIssueId = ref('');
    const summaryLoading = ref(false);
    const summaryResult = ref<any>(null);

    const getIssueSummary = async () => {
      summaryLoading.value = true;
      summaryResult.value = null;
      try {
        const { data } = await api.get(`/ai/summarize/${summaryIssueId.value}`);
        summaryResult.value = data.data;
      } catch { toast.error('Failed to generate summary'); } finally { summaryLoading.value = false; }
    };

    return { projectId, assignIssueId, assignLoading, assignResult, suggestAssignee, dupIssueId, dupLoading, dupResults, detectDuplicates, sprintLoading, sprintResult, getSprintSuggestions, summaryIssueId, summaryLoading, summaryResult, getIssueSummary };
  },
});
</script>
