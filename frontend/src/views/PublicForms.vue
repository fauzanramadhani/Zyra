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
              <span :class="form.active ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-100 text-slate-500'" class="text-xs px-2 py-0.5 rounded-full">
                {{ form.active ? 'Active' : 'Inactive' }}
              </span>
            </h3>
            <p class="text-xs text-slate-500 mt-1">{{ form.submissions?.length || form._count?.submissions || 0 }} submissions · {{ form.fields?.length || 0 }} fields</p>
          </div>
          <div class="flex items-center gap-2">
            <button @click="copyLink(form.id)" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition" title="Copy public link">
              <LinkIcon class="w-4 h-4 text-slate-500" />
            </button>
            <button @click="toggleActive(form)" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">
              <component :is="form.active ? EyeOffIcon : EyeIcon" class="w-4 h-4 text-slate-500" />
            </button>
            <button @click="deleteForm(form.id)" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
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

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg p-6 mx-4 max-h-[80vh] overflow-y-auto">
          <h2 class="text-lg font-bold text-slate-800 dark:text-white mb-4">New Public Form</h2>
          <input v-model="formData.title" placeholder="Form title" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3" />
          <textarea v-model="formData.description" placeholder="Description shown to submitters" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3"></textarea>

          <!-- Fields -->
          <div class="mb-4">
            <h4 class="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Form Fields</h4>
            <div v-for="(field, i) in formData.fields" :key="i" class="flex items-center gap-2 mb-2">
              <input v-model="field.name" placeholder="Field name" class="flex-1 px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm" />
              <select v-model="field.type" class="px-2 py-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
                <option value="TEXT">Text</option>
                <option value="TEXTAREA">Textarea</option>
                <option value="SELECT">Select</option>
                <option value="EMAIL">Email</option>
              </select>
              <label class="flex items-center gap-1 text-xs"><input type="checkbox" v-model="field.required" /> Req</label>
              <button @click="formData.fields.splice(i, 1)" class="text-red-400 hover:text-red-600"><XIcon class="w-4 h-4" /></button>
            </div>
            <button @click="formData.fields.push({ name: '', type: 'TEXT', required: false })" class="text-xs text-orange-500 font-semibold hover:underline">+ Add Field</button>
          </div>

          <div class="flex justify-end gap-2">
            <button @click="showModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="createForm" :disabled="!formData.title" class="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Plus as PlusIcon, Trash2 as Trash2Icon, Link as LinkIcon, Eye as EyeIcon, EyeOff as EyeOffIcon, ClipboardList as ClipboardListIcon, X as XIcon } from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';

export default defineComponent({
  name: 'PublicFormsView',
  components: { PlusIcon, Trash2Icon, LinkIcon, EyeIcon, EyeOffIcon, ClipboardListIcon, XIcon },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const forms = ref<any[]>([]);
    const showModal = ref(false);
    const formData = ref<any>({ title: '', description: '', fields: [{ name: 'Summary', type: 'TEXT', required: true }, { name: 'Description', type: 'TEXTAREA', required: false }] });

    const fetchForms = async () => {
      loading.value = true;
      try {
        const { data } = await api.get(`/forms?projectId=${projectId.value}`);
        forms.value = data.data || [];
      } catch { /* empty */ } finally { loading.value = false; }
    };

    const openCreateModal = () => {
      formData.value = { title: '', description: '', fields: [{ name: 'Summary', type: 'TEXT', required: true }, { name: 'Description', type: 'TEXTAREA', required: false }] };
      showModal.value = true;
    };

    const createForm = async () => {
      try {
        await api.post('/forms', { ...formData.value, projectId: projectId.value });
        toast.success('Form created');
        showModal.value = false;
        await fetchForms();
      } catch { toast.error('Failed to create form'); }
    };

    const toggleActive = async (form: any) => {
      try {
        await api.patch(`/forms/${form.id}`, { active: !form.active });
        form.active = !form.active;
      } catch { toast.error('Failed to toggle'); }
    };

    const copyLink = (formId: string) => {
      const url = `${window.location.origin}/public/forms/${formId}`;
      navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    };

    const deleteForm = async (id: string) => {
      if (!confirm('Delete this form?')) return;
      try {
        await api.delete(`/forms/${id}`);
        toast.success('Form deleted');
        await fetchForms();
      } catch { toast.error('Failed to delete'); }
    };

    onMounted(fetchForms);

    return { loading, forms, showModal, formData, openCreateModal, createForm, toggleActive, copyLink, deleteForm };
  },
});
</script>
