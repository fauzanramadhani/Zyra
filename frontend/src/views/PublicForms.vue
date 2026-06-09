<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200">
    <div class="flex-shrink-0 mb-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-slate-800 dark:text-white">Public Forms</h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Collect bug reports and feature requests from external users</p>
        </div>
        <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-2">
          <PlusIcon class="w-4 h-4" />
          New Form
        </button>
      </div>
    </div>

    <div class="flex-grow overflow-y-auto min-h-0 pr-1">
      <div v-if="loading" class="flex justify-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>

      <div v-else-if="forms.length" class="space-y-3">
        <div v-for="form in forms" :key="form.id" class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-semibold text-slate-800 dark:text-white text-sm flex items-center gap-2">
                {{ form.title }}
                <span :class="form.enabled ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'" class="text-xs px-2 py-0.5 rounded-full">
                  {{ form.enabled ? 'Active' : 'Inactive' }}
                </span>
              </h3>
              <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {{ form.description || 'No description' }}
              </p>
              <div class="flex items-center gap-4 mt-2 text-xs text-slate-400">
                <span>{{ form.fields?.length || 0 }} fields</span>
                <span>Type: <span class="font-semibold text-orange-500">{{ form.defaultType }}</span></span>
                <span>Priority: <span class="font-semibold text-red-500">{{ form.defaultPriority }}</span></span>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button @click="viewSubmissions(form)" class="px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 transition flex items-center gap-1">
                <ClipboardListIcon class="w-3.5 h-3.5" />
                Submissions ({{ form._count?.submissions || 0 }})
              </button>
              <button @click="copyLink(form.slug)" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition" title="Copy public link">
                <LinkIcon class="w-4 h-4 text-slate-500" />
              </button>
              <button @click="openEditModal(form)" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition" title="Edit Form">
                <EditIcon class="w-4 h-4 text-slate-500" />
              </button>
              <button @click="toggleActive(form)" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition" title="Toggle active status">
                <component :is="form.enabled ? EyeOffIcon : EyeIcon" class="w-4 h-4 text-slate-500" />
              </button>
              <button @click="deleteForm(form.id)" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Delete Form">
                <Trash2Icon class="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-20">
        <ClipboardListIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
        <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">No public forms</h3>
        <p class="text-sm text-slate-400 mb-4">Create forms to collect feedback from external users without login</p>
        <button @click="openCreateModal" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">Create Form</button>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[85vh] overflow-y-auto">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">{{ editingFormId ? 'Edit Public Form' : 'New Public Form' }}</h2>
          
          <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Form Title</label>
          <input v-model="formData.title" placeholder="Form title" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3 text-slate-800 dark:text-slate-100" />
          
          <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Description</label>
          <textarea v-model="formData.description" placeholder="Description shown to submitters" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3 text-slate-800 dark:text-slate-100"></textarea>

          <div class="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Default Issue Type</label>
              <select v-model="formData.defaultType" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100">
                <option value="BUG">Bug</option>
                <option value="TASK">Task</option>
                <option value="STORY">Story</option>
                <option value="EPIC">Epic</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Default Priority</label>
              <select v-model="formData.defaultPriority" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="HIGHEST">Highest</option>
              </select>
            </div>
          </div>

          <!-- Fields -->
          <div class="mb-4">
            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Form Fields</h4>
            <div v-for="(field, i) in formData.fields" :key="i" class="flex items-center gap-2 mb-2">
              <input v-model="field.name" placeholder="Field name" class="flex-1 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100" />
              <select v-model="field.type" class="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100">
                <option value="TEXT">Text</option>
                <option value="TEXTAREA">Textarea</option>
                <option value="SELECT">Select</option>
                <option value="EMAIL">Email</option>
              </select>
              <label class="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400">
                <input type="checkbox" v-model="field.required" class="rounded text-orange-500" /> Req
              </label>
              <button @click="formData.fields.splice(i, 1)" class="text-red-400 hover:text-red-600" title="Remove Field"><XIcon class="w-4 h-4" /></button>
            </div>
            <button @click="formData.fields.push({ name: '', type: 'TEXT', required: false })" class="text-xs text-orange-500 font-semibold hover:underline">+ Add Field</button>
          </div>

          <div class="flex justify-end gap-2">
            <button @click="showModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="saveForm" :disabled="!formData.title" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">
              {{ editingFormId ? 'Save Changes' : 'Create Form' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Submissions Modal -->
    <Teleport to="body">
      <div v-if="showSubmissionsModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showSubmissionsModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl p-6 mx-4 max-h-[85vh] flex flex-col">
          <div class="flex items-center justify-between mb-4 border-b border-slate-150 dark:border-slate-700 pb-3">
            <h2 class="text-lg font-bold text-slate-800 dark:text-white">Submissions for "{{ selectedForm?.title }}"</h2>
            <button @click="showSubmissionsModal = false" class="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"><XIcon class="w-5 h-5" /></button>
          </div>

          <div class="flex-grow overflow-y-auto min-h-0 space-y-4 pr-1">
            <div v-if="submissionsLoading" class="flex justify-center py-10">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            </div>
            <div v-else-if="submissions.length" class="space-y-4">
              <div v-for="sub in submissions" :key="sub.id" class="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                <div class="flex justify-between items-center mb-3 text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                  <span>From IP: {{ sub.ipAddress || 'Unknown IP' }}</span>
                  <span>{{ new Date(sub.createdAt).toLocaleString() }}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div v-for="(val, key) in sub.data" :key="key" class="pb-1.5">
                    <span class="font-bold text-slate-500 dark:text-slate-400 block">{{ key }}</span>
                    <span class="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap">{{ val }}</span>
                  </div>
                </div>
                <div v-if="sub.issueId" class="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Linked Issue ID</span>
                  <span class="font-mono bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">{{ sub.issueId }}</span>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-20">
              <ClipboardListIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 class="text-sm font-semibold text-slate-500 dark:text-slate-400">No submissions yet</h3>
              <p class="text-xs text-slate-400 mt-1">Copy the public link to share this form with your audience</p>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, Trash2 as Trash2Icon, Link as LinkIcon, Eye as EyeIcon, EyeOff as EyeOffIcon, ClipboardList as ClipboardListIcon, X as XIcon, Edit as EditIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'PublicFormsView',
  components: { PlusIcon, Trash2Icon, LinkIcon, EyeIcon, EyeOffIcon, ClipboardListIcon, XIcon, EditIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const forms = ref<any[]>([]);
    const showModal = ref(false);
    const editingFormId = ref<string | null>(null);

    const formData = ref<any>({
      title: '',
      description: '',
      defaultType: 'BUG',
      defaultPriority: 'MEDIUM',
      fields: [
        { name: 'Summary', type: 'TEXT', required: true },
        { name: 'Description', type: 'TEXTAREA', required: false }
      ]
    });

    // Submissions
    const showSubmissionsModal = ref(false);
    const submissionsLoading = ref(false);
    const selectedForm = ref<any>(null);
    const submissions = ref<any[]>([]);

    const fetchForms = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/projects/${projectId.value}/forms`);
        forms.value = data.data || [];
      } catch {
        toast.error('Failed to load forms');
      } finally {
        loading.value = false;
      }
    };

    const openCreateModal = () => {
      editingFormId.value = null;
      formData.value = {
        title: '',
        description: '',
        defaultType: 'BUG',
        defaultPriority: 'MEDIUM',
        fields: [
          { name: 'Summary', type: 'TEXT', required: true },
          { name: 'Description', type: 'TEXTAREA', required: false }
        ]
      };
      showModal.value = true;
    };

    const openEditModal = (form: any) => {
      editingFormId.value = form.id;
      formData.value = {
        title: form.title,
        description: form.description,
        defaultType: form.defaultType || 'BUG',
        defaultPriority: form.defaultPriority || 'MEDIUM',
        fields: form.fields ? JSON.parse(JSON.stringify(form.fields)) : []
      };
      showModal.value = true;
    };

    const saveForm = async () => {
      try {
        if (editingFormId.value) {
          await api.patch(`/forms/${editingFormId.value}`, formData.value);
          toast.success('Form updated successfully');
        } else {
          await api.post(`/projects/${projectId.value}/forms`, formData.value);
          toast.success('Form created successfully');
        }
        showModal.value = false;
        await fetchForms();
      } catch {
        toast.error('Failed to save form');
      }
    };

    const toggleActive = async (form: any) => {
      try {
        const updatedStatus = !form.enabled;
        await api.patch(`/forms/${form.id}`, { enabled: updatedStatus });
        form.enabled = updatedStatus;
        toast.success(`Form is now ${updatedStatus ? 'Active' : 'Inactive'}`);
      } catch {
        toast.error('Failed to toggle status');
      }
    };

    const copyLink = (slug: string) => {
      const url = `${window.location.origin}/public/forms/${slug}`;
      navigator.clipboard.writeText(url);
      toast.success('Public URL copied to clipboard');
    };

    const deleteForm = async (id: string) => {
      if (!confirm('Delete this form?')) return;
      try {
        await api.delete(`/forms/${id}`);
        toast.success('Form deleted');
        await fetchForms();
      } catch {
        toast.error('Failed to delete form');
      }
    };

    const viewSubmissions = async (form: any) => {
      selectedForm.value = form;
      showSubmissionsModal.value = true;
      submissionsLoading.value = true;
      try {
        const { data } = await api.get(`/forms/${form.id}/submissions`);
        submissions.value = data.data || [];
      } catch {
        toast.error('Failed to load submissions');
      } finally {
        submissionsLoading.value = false;
      }
    };

    onMounted(fetchForms);

    return {
      loading,
      forms,
      showModal,
      formData,
      editingFormId,
      openCreateModal,
      openEditModal,
      saveForm,
      toggleActive,
      copyLink,
      deleteForm,
      // Submissions
      showSubmissionsModal,
      submissionsLoading,
      selectedForm,
      submissions,
      viewSubmissions,
      // Icons
      EyeIcon,
      EyeOffIcon
    };
  },
});
</script>
