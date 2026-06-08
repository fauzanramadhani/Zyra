<template>
  <div class="flex-grow p-3 md:p-6 flex flex-col h-screen overflow-hidden text-slate-800 dark:text-slate-200">
    <div class="flex-shrink-0">
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Wiki
            <button @click="showHelp = !showHelp" class="p-1 rounded-lg text-slate-400 hover:text-indigo-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition" title="Toggle Help Guide">
              <HelpCircleIcon class="w-5 h-5" />
            </button>
          </h1>
          <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">Knowledge base and documentation</p>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="currentSpace" @click="openPageModal" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition flex items-center gap-2">
            <PlusIcon class="w-4 h-4" />
            New Page
          </button>
          <button @click="openSpaceModal" class="px-3 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-250 rounded-lg text-sm font-semibold hover:bg-slate-200 dark:hover:bg-slate-650 transition">
            + Space
          </button>
        </div>
      </div>

      <!-- Glassmorphic Help Card -->
      <div v-if="showHelp" class="mb-6 p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 shadow-sm relative transition duration-300">
        <button @click="showHelp = false" class="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition">
          <XIcon class="w-4 h-4" />
        </button>
        <div class="flex items-start gap-3.5">
          <div class="w-9 h-9 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0">
            <HelpCircleIcon class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0 pr-4">
            <h3 class="text-sm font-bold text-slate-800 dark:text-slate-200">Wiki Knowledge Base</h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              The Wiki Knowledge Base lets you write, organize, and store rich-text documentation and sprint notes.
            </p>
            <ul class="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1.5 pl-4 list-disc font-medium">
              <li><strong>Wiki Spaces</strong>: Create different "Spaces" to group related sprint documents or project scopes.</li>
              <li><strong>Page Creation</strong>: Press "New Page" to create documents using custom rich HTML markup.</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Space Selector -->
      <div v-if="spaces.length" class="flex items-center gap-3 mb-6">
        <select v-model="selectedSpaceId" @change="loadPages" class="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-sm font-semibold">
          <option v-for="s in spaces" :key="s.id" :value="s.id">{{ s.name }}</option>
        </select>
        <button @click="deleteSpace" class="p-2 hover:bg-red-50 dark:hover:bg-red-900/25 rounded-lg border border-slate-200 dark:border-slate-700 transition" title="Delete Space">
          <Trash2Icon class="w-4 h-4 text-red-500" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex-grow flex items-center justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-550"></div>
    </div>

    <!-- Pages List -->
    <div v-else-if="pages.length" class="flex-grow overflow-y-auto min-h-0 pr-1 space-y-2">
      <div v-for="page in pages" :key="page.id"
        @click="viewPage(page)"
        class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-500/50 transition">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <FileTextIcon class="w-5 h-5 text-slate-400" />
            <div>
              <h3 class="font-semibold text-slate-800 dark:text-white text-sm">{{ page.title }}</h3>
              <p class="text-xs text-slate-550 dark:text-slate-450 mt-0.5">Updated {{ formatDate(page.updatedAt) }}</p>
            </div>
          </div>
          <button @click.stop="deletePage(page.id)" class="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
            <Trash2Icon class="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex-grow flex flex-col items-center justify-center py-20">
      <BookOpenIcon class="w-12 h-12 mx-auto text-slate-300 dark:text-slate-650 mb-4" />
      <h3 class="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-2">{{ spaces.length ? 'No pages yet' : 'No wiki spaces' }}</h3>
      <p class="text-sm text-slate-400 mb-4">{{ spaces.length ? 'Create your first wiki page' : 'Create a wiki space to get started' }}</p>
      <button @click="spaces.length ? openPageModal() : openSpaceModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition">
        {{ spaces.length ? 'Create Page' : 'Create Space' }}
      </button>
    </div>

    <!-- Page Viewer -->
    <Teleport to="body">
      <div v-if="viewingPage" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="viewingPage = null"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-3xl p-6 mx-4 max-h-[85vh] overflow-y-auto">
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/50">
            <h2 class="text-xl font-bold text-slate-900 dark:text-white">{{ viewingPage.title }}</h2>
            <div class="flex items-center gap-1.5">
              <button @click="startEdit(viewingPage)" class="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-650 text-slate-750 dark:text-slate-250 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition">
                <EditIcon class="w-3.5 h-3.5" />
                Edit
              </button>
              <button @click="viewingPage = null" class="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"><XIcon class="w-5 h-5 text-slate-400" /></button>
            </div>
          </div>
          <div class="prose dark:prose-invert max-w-none text-sm leading-relaxed" v-html="viewingPage.content || '<p class=&quot;text-slate-400&quot;>No content</p>'"></div>
        </div>
      </div>
    </Teleport>

    <!-- Create Space Modal -->
    <Teleport to="body">
      <div v-if="showSpaceModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showSpaceModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">New Wiki Space</h2>
          <input v-model="spaceForm.name" placeholder="Space name" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-3 focus:outline-none focus:border-indigo-500" />
          <textarea v-model="spaceForm.description" placeholder="Description" rows="2" class="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-4 focus:outline-none focus:border-indigo-500"></textarea>
          <div class="flex justify-end gap-2">
            <button @click="showSpaceModal = false" class="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="createSpace" :disabled="!spaceForm.name" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Create Page Modal -->
    <Teleport to="body">
      <div v-if="showPageModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showPageModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl p-6 mx-4 max-h-[85vh] overflow-y-auto">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">New Page</h2>
          <input v-model="pageForm.title" placeholder="Page title" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-4 focus:outline-none focus:border-indigo-500 font-semibold" />
          
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Content</label>
            <div class="flex bg-slate-100 dark:bg-slate-900/60 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-[10px] select-none">
              <button type="button" @click="createPageMode = 'visual'" :class="createPageMode === 'visual' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-700'" class="px-2.5 py-1 rounded">Visual</button>
              <button type="button" @click="createPageMode = 'html'" :class="createPageMode === 'html' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-700'" class="px-2.5 py-1 rounded font-semibold">HTML Source</button>
            </div>
          </div>
          
          <div class="mb-5">
            <TipTapEditor v-if="createPageMode === 'visual'" v-model="pageForm.content" class="min-h-[250px]" />
            <textarea v-else v-model="pageForm.content" placeholder="Type custom HTML content..." rows="12" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-550"></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-750">
            <button @click="showPageModal = false" class="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="createPage" :disabled="!pageForm.title" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">Create</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Edit Page Modal -->
    <Teleport to="body">
      <div v-if="showEditPageModal" class="fixed inset-0 z-50 flex items-center justify-center">
        <div class="absolute inset-0 bg-black/50" @click="showEditPageModal = false"></div>
        <div class="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl p-6 mx-4 max-h-[85vh] overflow-y-auto">
          <h2 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Edit Page</h2>
          <input v-model="editPageForm.title" placeholder="Page title" class="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm mb-4 focus:outline-none focus:border-indigo-500 font-semibold" />
          
          <div class="flex items-center justify-between mb-2">
            <label class="block text-xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Content</label>
            <div class="flex bg-slate-100 dark:bg-slate-900/60 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 text-[10px] select-none">
              <button type="button" @click="editPageMode = 'visual'" :class="editPageMode === 'visual' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-700'" class="px-2.5 py-1 rounded">Visual</button>
              <button type="button" @click="editPageMode = 'html'" :class="editPageMode === 'html' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm font-extrabold' : 'text-slate-500 hover:text-slate-700'" class="px-2.5 py-1 rounded font-semibold">HTML Source</button>
            </div>
          </div>
          
          <div class="mb-5">
            <TipTapEditor v-if="editPageMode === 'visual'" v-model="editPageForm.content" class="min-h-[250px]" />
            <textarea v-else v-model="editPageForm.content" placeholder="Type custom HTML content..." rows="12" class="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:border-indigo-550"></textarea>
          </div>

          <div class="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-750">
            <button @click="showEditPageModal = false" class="px-4 py-2 text-sm font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition">Cancel</button>
            <button @click="savePageEdit" :disabled="!editPageForm.title" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50">Save Changes</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { 
  Plus as PlusIcon, 
  Trash2 as Trash2Icon, 
  FileText as FileTextIcon, 
  BookOpen as BookOpenIcon, 
  X as XIcon, 
  HelpCircle as HelpCircleIcon,
  Edit as EditIcon
} from 'lucide-vue-next';
import api from '../services/api';
import { useToastStore } from '../store/toast';
import TipTapEditor from '../components/TipTapEditor.vue';

export default defineComponent({
  name: 'WikiView',
  components: { 
    PlusIcon, 
    Trash2Icon, 
    FileTextIcon, 
    BookOpenIcon, 
    XIcon, 
    HelpCircleIcon, 
    EditIcon,
    TipTapEditor 
  },
  setup() {
    const route = useRoute();
    const toast = useToastStore();
    const projectId = computed(() => route.params.projectId as string);

    const loading = ref(false);
    const showHelp = ref(true);
    const spaces = ref<any[]>([]);
    const selectedSpaceId = ref('');
    const currentSpace = computed(() => spaces.value.find(s => s.id === selectedSpaceId.value));
    const pages = ref<any[]>([]);
    const viewingPage = ref<any>(null);
    
    // Space Create
    const showSpaceModal = ref(false);
    const spaceForm = ref({ name: '', description: '' });

    // Page Create
    const showPageModal = ref(false);
    const pageForm = ref({ title: '', content: '' });
    const createPageMode = ref<'visual' | 'html'>('visual');

    // Page Edit
    const showEditPageModal = ref(false);
    const editPageForm = ref({ id: '', title: '', content: '' });
    const editPageMode = ref<'visual' | 'html'>('visual');

    const fetchSpaces = async () => {
      try {
        const { data } = await api.get(`/wiki/spaces?projectId=${projectId.value}`);
        spaces.value = data.data || [];
        if (spaces.value.length && !selectedSpaceId.value) {
          selectedSpaceId.value = spaces.value[0].id;
          await loadPages();
        }
      } catch { /* empty */ }
    };

    const loadPages = async () => {
      if (!selectedSpaceId.value) return;
      loading.value = true;
      try {
        const { data } = await api.get(`/wiki/spaces/${selectedSpaceId.value}/pages`);
        pages.value = data.data || [];
      } catch { /* empty */ } finally { loading.value = false; }
    };

    const openSpaceModal = () => { spaceForm.value = { name: '', description: '' }; showSpaceModal.value = true; };
    const openPageModal = () => { 
      pageForm.value = { title: '', content: '' }; 
      createPageMode.value = 'visual';
      showPageModal.value = true; 
    };

    const createSpace = async () => {
      try {
        await api.post('/wiki/spaces', { ...spaceForm.value, projectId: projectId.value });
        toast.success('Space created');
        showSpaceModal.value = false;
        await fetchSpaces();
      } catch { toast.error('Failed to create space'); }
    };

    const createPage = async () => {
      try {
        await api.post(`/wiki/spaces/${selectedSpaceId.value}/pages`, { ...pageForm.value });
        toast.success('Page created');
        showPageModal.value = false;
        await loadPages();
      } catch { toast.error('Failed to create page'); }
    };

    const viewPage = async (page: any) => {
      try {
        const { data } = await api.get(`/wiki/pages/${page.id}`);
        viewingPage.value = data.data;
      } catch { viewingPage.value = page; }
    };

    const startEdit = (page: any) => {
      editPageForm.value = { id: page.id, title: page.title, content: page.content || '' };
      editPageMode.value = 'visual';
      showEditPageModal.value = true;
      viewingPage.value = null; // Close viewer
    };

    const savePageEdit = async () => {
      try {
        await api.put(`/wiki/pages/${editPageForm.value.id}`, {
          title: editPageForm.value.title,
          content: editPageForm.value.content
        });
        toast.success('Page updated');
        showEditPageModal.value = false;
        await loadPages();
      } catch {
        toast.error('Failed to update page');
      }
    };

    const deletePage = async (id: string) => {
      if (!confirm('Delete this page?')) return;
      try {
        await api.delete(`/wiki/pages/${id}`);
        toast.success('Page deleted');
        await loadPages();
      } catch { toast.error('Failed to delete'); }
    };

    const deleteSpace = async () => {
      if (!selectedSpaceId.value) return;
      if (!confirm('Delete this space and all of its pages?')) return;
      try {
        await api.delete(`/wiki/spaces/${selectedSpaceId.value}`);
        toast.success('Space deleted');
        selectedSpaceId.value = '';
        pages.value = [];
        await fetchSpaces();
      } catch {
        toast.error('Failed to delete space');
      }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString();

    onMounted(fetchSpaces);

    return { 
      loading, 
      spaces, 
      selectedSpaceId, 
      currentSpace, 
      pages, 
      viewingPage, 
      showSpaceModal, 
      showPageModal, 
      spaceForm, 
      pageForm, 
      openSpaceModal, 
      openPageModal, 
      createSpace, 
      createPage, 
      viewPage, 
      deletePage, 
      loadPages, 
      formatDate, 
      showHelp,
      createPageMode,
      editPageMode,
      showEditPageModal,
      editPageForm,
      startEdit,
      savePageEdit,
      deleteSpace
    };
  },
});
</script>
