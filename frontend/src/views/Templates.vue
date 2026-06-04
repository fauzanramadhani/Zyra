<template>
  <div class="flex-grow p-6 flex flex-col h-screen overflow-hidden text-[#172B4D] dark:text-slate-200">
    <!-- Header -->
    <div class="mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Issue Templates
            <button @click="showHelp = !showHelp" class="p-1 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition" title="Toggle Help Guide">
              <HelpCircleIcon class="w-4 h-4" />
            </button>
          </h1>
          <p class="text-xs text-slate-400 mt-0.5">Speed up issue creation with predefined templates</p>
        </div>
        <button @click="showCreateModal = true" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition shadow-sm">
          + New Template
        </button>
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
          <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">📝 Reusable Issue Templates</h3>
          <p class="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
            Issue Templates speed up team operations by providing preset structures, summary naming prefixes, and descriptions for commonly reported tasks.
          </p>
          <ul class="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1.5 pl-4 list-disc">
            <li><strong>Standard Preset Fields</strong>: Pre-populate type (Task, Bug, Story), default priorities, and story points.</li>
            <li><strong>Quick Issue Creation</strong>: Apply these templates directly inside the new issue modal to accelerate sprint planning.</li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="loading" class="flex items-center justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <div class="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Loading templates...</p>
      </div>
    </div>
    <div v-else-if="templates.length === 0" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-12 text-center">
      <div class="w-16 h-16 bg-orange-100 dark:bg-orange-950/50 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <FileTextIcon class="w-8 h-8 text-orange-500" />
      </div>
      <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-2">No Templates Yet</h2>
      <p class="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        Create templates for issues you create often to speed things up
      </p>
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
      <div v-for="template in templates" :key="template.id" class="bg-white dark:bg-zyra-gray-darkCard rounded-xl shadow-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-4 hover:shadow-md transition">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="text-sm font-bold text-slate-800 dark:text-white">{{ template.name }}</h3>
            <span class="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{{ template.type }}</span>
          </div>
          <div class="flex gap-1">
            <button @click="editTemplate(template)" class="text-slate-400 hover:text-orange-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <PencilIcon class="w-3.5 h-3.5" />
            </button>
            <button @click="deleteTemplate(template)" class="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition">
              <TrashIcon class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <p v-if="template.summary" class="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{{ template.summary }}</p>
        <div class="flex items-center gap-2 mt-3">
          <span v-if="template.priority" class="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">{{ template.priority }}</span>
          <span v-if="template.storyPoints" class="text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">{{ template.storyPoints }} pts</span>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="closeModal">
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-zyra-gray-darkBorder p-6">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">{{ editingTemplate ? 'Edit Template' : 'New Template' }}</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Template Name <span class="text-red-500">*</span></label>
              <input v-model="form.name" type="text" class="w-full px-3 py-2.5 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-xl bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" placeholder="Bug Report" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Issue Type <span class="text-red-500">*</span></label>
              <SelectDropdown v-model="form.type" :options="typeOptions" placeholder="Select type..." />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Default Summary</label>
              <input v-model="form.summary" type="text" class="w-full px-3 py-2.5 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-xl bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" placeholder="[BUG] ..." />
            </div>
            <div>
              <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Default Description</label>
              <textarea v-model="form.description" rows="3" class="w-full px-3 py-2.5 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-xl bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" placeholder="Steps to reproduce..."></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Priority</label>
                <SelectDropdown v-model="form.priority" :options="priorityOptions" placeholder="None" />
              </div>
              <div>
                <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Story Points</label>
                <input v-model.number="form.storyPoints" type="number" min="0" class="w-full px-3 py-2.5 border border-slate-300 dark:border-zyra-gray-darkBorder rounded-xl bg-white dark:bg-zyra-gray-darkBg text-slate-800 dark:text-white text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition" placeholder="0" />
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button @click="closeModal" class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition">Cancel</button>
            <button @click="saveTemplate" class="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition shadow-sm">
              {{ editingTemplate ? 'Update' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation -->
    <Teleport to="body">
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" @click.self="showDeleteConfirm = false">
        <div class="bg-white dark:bg-zyra-gray-darkCard rounded-2xl shadow-2xl w-full max-w-sm border border-gray-200 dark:border-zyra-gray-darkBorder p-6">
          <div class="w-12 h-12 bg-red-100 dark:bg-red-950/50 rounded-xl flex items-center justify-center mb-4">
            <AlertTriangleIcon class="w-6 h-6 text-red-600" />
          </div>
          <h3 class="text-lg font-bold text-slate-800 dark:text-white mb-2">Delete Template?</h3>
          <p class="text-sm text-slate-600 dark:text-slate-400 mb-1">
            Are you sure you want to delete <strong>"{{ deleteTarget?.name }}"</strong>?
          </p>
          <p class="text-xs text-slate-500 dark:text-slate-500 mb-6">This action cannot be undone.</p>
          <div class="flex justify-end gap-3">
            <button @click="showDeleteConfirm = false" class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition">Cancel</button>
            <button @click="confirmDelete" class="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-semibold transition shadow-sm">Delete</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, computed } from 'vue';
import { useRoute } from 'vue-router';
import api from '../services/api';
import { Pencil as PencilIcon, Trash2 as TrashIcon, FileText as FileTextIcon, AlertTriangle as AlertTriangleIcon, HelpCircle as HelpCircleIcon, X as XIcon } from 'lucide-vue-next';
import SelectDropdown from '../components/SelectDropdown.vue';

export default defineComponent({
  name: 'Templates',
  components: { PencilIcon, TrashIcon, FileTextIcon, AlertTriangleIcon, SelectDropdown, HelpCircleIcon, XIcon },
  setup() {
    const route = useRoute();
    const projectId = computed(() => route.params.projectId as string);
    const templates = ref<any[]>([]);
    const loading = ref(false);
    const showHelp = ref(true);
    const showCreateModal = ref(false);
    const editingTemplate = ref<any>(null);
    const form = ref({ name: '', type: 'TASK', summary: '', description: '', priority: '', storyPoints: null as number | null });
    const showDeleteConfirm = ref(false);
    const deleteTarget = ref<any>(null);

    const typeOptions = [
      { value: 'TASK', label: 'Task' },
      { value: 'BUG', label: 'Bug' },
      { value: 'STORY', label: 'Story' },
      { value: 'EPIC', label: 'Epic' },
    ];

    const priorityOptions = [
      { value: '', label: 'None' },
      { value: 'HIGHEST', label: 'Highest' },
      { value: 'HIGH', label: 'High' },
      { value: 'MEDIUM', label: 'Medium' },
      { value: 'LOW', label: 'Low' },
      { value: 'LOWEST', label: 'Lowest' },
    ];

    const fetchTemplates = async () => {
      loading.value = true;
      try {
        const res = await api.get(`/projects/${projectId.value}/templates`);
        templates.value = res.data.data || [];
      } catch { /* ignore */ }
      loading.value = false;
    };

    const saveTemplate = async () => {
      if (!form.value.name.trim() || !form.value.type) return;
      try {
        if (editingTemplate.value) {
          await api.patch(`/templates/${editingTemplate.value.id}`, form.value);
        } else {
          await api.post(`/projects/${projectId.value}/templates`, form.value);
        }
        closeModal();
        fetchTemplates();
      } catch { /* ignore */ }
    };

    const editTemplate = (template: any) => {
      editingTemplate.value = template;
      form.value = {
        name: template.name,
        type: template.type,
        summary: template.summary || '',
        description: template.description || '',
        priority: template.priority || '',
        storyPoints: template.storyPoints || null,
      };
      showCreateModal.value = true;
    };

    const deleteTemplate = (template: any) => {
      deleteTarget.value = template;
      showDeleteConfirm.value = true;
    };

    const confirmDelete = async () => {
      if (!deleteTarget.value) return;
      try {
        await api.delete(`/templates/${deleteTarget.value.id}`);
        showDeleteConfirm.value = false;
        deleteTarget.value = null;
        fetchTemplates();
      } catch { /* ignore */ }
    };

    const closeModal = () => {
      showCreateModal.value = false;
      editingTemplate.value = null;
      form.value = { name: '', type: 'TASK', summary: '', description: '', priority: '', storyPoints: null };
    };

    onMounted(fetchTemplates);

    return { templates, loading, showCreateModal, editingTemplate, form, saveTemplate, editTemplate, deleteTemplate, closeModal, typeOptions, priorityOptions, showDeleteConfirm, deleteTarget, confirmDelete, showHelp };
  },
});
</script>
