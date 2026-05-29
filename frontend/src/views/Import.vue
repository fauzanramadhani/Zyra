<template>
  <div class="flex-grow p-6 flex flex-col h-screen overflow-hidden text-[#172B4D] dark:text-slate-200">
    
    <!-- Top Header -->
    <div class="mb-6">
      <h1 class="text-xl font-bold text-slate-800 dark:text-white">CSV Importer</h1>
      <p class="text-xs text-slate-400">Migrate issues from Jira Cloud/Server or bulk load tickets using customized templates</p>
    </div>

    <!-- Step Progress Bar -->
    <div class="flex items-center gap-2 mb-8 bg-white dark:bg-zyra-gray-darkCard p-4 rounded-xl border border-gray-200 dark:border-zyra-gray-darkBorder shadow-sm max-w-3xl">
      <div v-for="step in steps" :key="step.number" class="flex items-center gap-2 flex-grow last:flex-grow-0">
        <div
          :class="stepNumberClass(step.number)"
          class="w-6 h-6 rounded-full font-bold text-xs flex items-center justify-center border transition duration-200"
        >
          {{ step.number }}
        </div>
        <span :class="stepTextClass(step.number)" class="text-xs font-semibold select-none">{{ step.label }}</span>
        <!-- Connector line -->
        <div v-if="step.number < 4" class="h-0.5 bg-gray-200 dark:bg-slate-700 flex-grow mx-4 rounded"></div>
      </div>
    </div>

    <!-- Step 1: Upload file panel -->
    <div v-if="currentStep === 1" class="flex-grow flex flex-col justify-center items-center max-w-3xl bg-white dark:bg-zyra-gray-darkCard border border-gray-200 dark:border-zyra-gray-darkBorder rounded-xl shadow-sm p-8">
      <div
        @dragover.prevent="isDragging = true"
        @dragleave.prevent="isDragging = false"
        @drop.prevent="handleFileDrop"
        :class="{ 'border-zyra-primary bg-orange-50/20': isDragging }"
        class="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-12 text-center bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 dark:hover:bg-slate-700 transition cursor-pointer w-full"
        @click="$refs.csvInput.click()"
      >
        <input type="file" ref="csvInput" class="hidden" accept=".csv" @change="handleFileSelect" />
        <UploadCloudIcon class="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 class="font-bold text-sm text-gray-700 dark:text-slate-200">Drag your CSV export here</h3>
        <p class="text-xs text-gray-400 mt-1.5">Or browse files from your computer (UTF-8 encoding support)</p>
      </div>

      <div v-if="uploadError" class="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg w-full">
        {{ uploadError }}
      </div>
    </div>

    <!-- Step 2: Mapping panel -->
    <div v-else-if="currentStep === 2 && previewData" class="flex-grow flex flex-col overflow-hidden max-w-4xl bg-white dark:bg-zyra-gray-darkCard border border-gray-200 dark:border-zyra-gray-darkBorder rounded-xl shadow-sm">
      <div class="p-5 border-b border-gray-200 dark:border-zyra-gray-darkBorder flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
        <div>
          <h3 class="font-bold text-sm text-slate-800">Map CSV Headers to Fields</h3>
          <p class="text-xs text-slate-400">Match your source columns to target fields. Columns not mapped will be saved as Custom Metadata.</p>
        </div>
        <span class="text-xs text-slate-400 font-bold bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-gray-200 dark:border-slate-700">
          Filename: {{ previewData.originalName }}
        </span>
      </div>

      <!-- Mapping Table list -->
      <div class="flex-grow overflow-y-auto p-5">
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-gray-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase">
              <th class="pb-3 w-1/3">CSV Header Column</th>
              <th class="pb-3 w-1/3">Map To Target Field</th>
              <th class="pb-3">Sample Row Values</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-150 dark:divide-slate-700 text-slate-700 dark:text-slate-300">
            <tr v-for="(suggestion, idx) in columnMappings" :key="suggestion.header + '-' + idx" class="hover:bg-slate-50/50">
              <td class="py-3 font-semibold text-slate-800 dark:text-slate-200">{{ suggestion.header }}</td>
              <td class="py-3 pr-4">
                <select
                  v-model="suggestion.targetField"
                  class="w-full border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-zyra-primary focus:border-transparent"
                >
                  <option value="">-- Save as Custom Field --</option>
                  <option value="issueKey">Issue Key (e.g. PROJ-12)</option>
                  <option value="summary">Summary / Title</option>
                  <option value="description">Description / Content</option>
                  <option value="status">Status / Workflow Column</option>
                  <option value="priority">Priority / Severity</option>
                  <option value="type">Issue Type (Bug/Story)</option>
                  <option value="storyPoints">Story Points</option>
                  <option value="assignee">Assignee (Email/Name)</option>
                  <option value="labels">Labels / Tags</option>
                  <option value="ignore">-- Ignore column --</option>
                </select>
              </td>
              <td class="py-3 text-slate-400 truncate max-w-[200px]" :title="suggestion.sampleValues.join(', ')">
                {{ suggestion.sampleValues.slice(0, 3).join(', ') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Footer navigation -->
      <div class="p-4 border-t border-gray-200 flex justify-between bg-slate-50">
        <button @click="currentStep = 1" class="px-4 py-2 border border-gray-300 text-slate-500 font-bold rounded-lg text-xs hover:bg-slate-100 transition">
          Back
        </button>
        <button @click="currentStep = 3" class="px-4 py-2 bg-zyra-primary text-white font-bold rounded-lg text-xs hover:bg-zyra-primary-hover shadow transition">
          Next: Config Options
        </button>
      </div>
    </div>

    <!-- Step 3: Config Options panel -->
    <div v-else-if="currentStep === 3" class="flex-grow flex flex-col justify-between max-w-2xl bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <div>
        <h3 class="font-bold text-sm mb-5 pb-2 border-b border-gray-100 text-slate-800">Import Configuration Options</h3>

        <div class="space-y-4">
          <!-- Checkbox 1 -->
          <div class="flex items-start gap-3">
            <input type="checkbox" id="users" v-model="options.autoCreateUsers" class="mt-1 rounded text-zyra-primary focus:ring-zyra-primary" />
            <div>
              <label for="users" class="text-xs font-bold text-slate-700 block">Auto-create Workspace Members</label>
              <span class="text-[10px] text-slate-400 block">If assignee email address isn't registered, create account with a default password.</span>
            </div>
          </div>

          <!-- Checkbox 2 -->
          <div class="flex items-start gap-3">
            <input type="checkbox" id="statuses" v-model="options.autoCreateStatuses" class="mt-1 rounded text-zyra-primary focus:ring-zyra-primary" />
            <div>
              <label for="statuses" class="text-xs font-bold text-slate-700 block">Auto-create Workflow Statuses</label>
              <span class="text-[10px] text-slate-400 block">If issues contain statuses not defined in the project board, create them as columns.</span>
            </div>
          </div>

          <!-- Select 1 -->
          <div>
            <label class="block text-xs font-bold text-slate-700 mb-1.5">Duplicate Issue Handling</label>
            <select v-model="options.duplicateHandling" class="border border-gray-300 rounded px-3 py-1.5 text-xs bg-white focus:ring-1 focus:ring-zyra-primary outline-none">
              <option value="create_new">Generate new ticket keys sequentially (Default)</option>
              <option value="skip">Skip rows with matching keys</option>
              <option value="overwrite">Overwrite existing issues with matching keys</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Footer navigation -->
      <div class="pt-6 border-t border-gray-200 flex justify-between">
        <button @click="currentStep = 2" class="px-4 py-2 border border-gray-300 text-slate-500 font-bold rounded-lg text-xs hover:bg-slate-100 transition">
          Back
        </button>
        <button @click="triggerStartImport" class="px-5 py-2 bg-zyra-primary text-white font-bold rounded-lg text-xs hover:bg-zyra-primary-hover shadow transition">
          Launch Import Background Job
        </button>
      </div>
    </div>

    <!-- Step 4: Progress panel -->
    <div v-else-if="currentStep === 4" class="flex-grow flex flex-col max-w-3xl bg-white border border-gray-200 rounded-xl shadow-sm p-6 overflow-hidden">
      <div class="text-center mb-6">
        <h3 class="font-bold text-base text-slate-800">Processing Import Job</h3>
        <p class="text-xs text-slate-400 mt-1">Please do not close this window while streaming database records</p>
      </div>

      <!-- Progress bar -->
      <div class="space-y-2 mb-8">
        <div class="flex justify-between text-xs font-bold text-slate-600">
          <span>Job Status: <span class="text-zyra-primary uppercase">{{ importJob?.status }}</span></span>
          <span>{{ importJob?.progress }}% ({{ importJob?.successRows + importJob?.failedRows }} / {{ importJob?.totalRows }} Rows)</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-3">
          <div
            class="bg-gradient-to-r from-orange-400 to-orange-500 h-3 rounded-full transition-all duration-300"
            :style="{ width: importJob?.progress + '%' }"
          ></div>
        </div>
      </div>

      <!-- Counters -->
      <div class="grid grid-cols-2 gap-4 mb-6">
        <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <p class="text-[10px] text-green-600 font-extrabold uppercase">Success Records</p>
          <p class="text-xl font-black text-green-700 mt-0.5">{{ importJob?.successRows }}</p>
        </div>
        <div class="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <p class="text-[10px] text-red-500 font-extrabold uppercase">Failed Records</p>
          <p class="text-xl font-black text-red-700 mt-0.5">{{ importJob?.failedRows }}</p>
        </div>
      </div>

      <!-- Errors list box -->
      <div class="flex-grow flex flex-col overflow-hidden">
        <h4 class="text-xs font-extrabold text-slate-500 uppercase tracking-wide mb-2">Error logs (first 50 errors)</h4>
        <div class="flex-grow border border-gray-200 bg-gray-50 rounded-lg overflow-y-auto p-3 space-y-1.5 text-[10px] font-mono">
          <div v-if="!importJob?.errors || importJob.errors.length === 0" class="text-center py-6 text-slate-400">
            No record violations logged. Excellent!
          </div>

          <div v-for="err in importJob?.errors" :key="err.id" class="p-2 border-b border-gray-150 pb-1.5 last:border-0 last:pb-0">
            <span class="text-red-500 font-bold block">Row {{ err.rowNumber }}: {{ err.errorMessage }}</span>
            <span class="text-slate-400 truncate block">Raw payload: {{ err.rawData }}</span>
          </div>
        </div>
      </div>

      <!-- Finish button -->
      <div v-if="importJob?.status === 'COMPLETED' || importJob?.status === 'FAILED'" class="pt-5 border-t border-gray-200 mt-4 flex justify-end">
        <button @click="finishImport" class="px-5 py-2 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-slate-800 shadow transition">
          Return to Board
        </button>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToastStore } from '../store/toast';
import api from '../services/api';
import { socket } from '../services/socket';
import { UploadCloud as UploadCloudIcon } from 'lucide-vue-next';

export default defineComponent({
  name: 'CSVImportWizard',
  components: {
    UploadCloudIcon,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const toast = useToastStore();

    const currentStep = ref(1);
    const isDragging = ref(false);
    const uploadError = ref('');

    // Step 2 Preview Mappings
    const previewData = ref<any>(null);
    const columnMappings = ref<any[]>([]);

    // Step 3 Options
    const options = ref({
      autoCreateUsers: true,
      autoCreateStatuses: true,
      autoCreateLabels: true,
      duplicateHandling: 'create_new',
    });

    // Step 4 Import Job Progress
    const importJob = ref<any>(null);

    const projectId = computed(() => route.params.projectId as string);

    const steps = [
      { number: 1, label: 'Upload CSV' },
      { number: 2, label: 'Column Mapping' },
      { number: 3, label: 'Import Options' },
      { number: 4, label: 'Execution Feed' },
    ];

    // File selection
    const handleFileSelect = (e: any) => {
      const files = e.target.files;
      if (files && files[0]) {
        uploadCSVFile(files[0]);
      }
    };

    const handleFileDrop = (e: any) => {
      isDragging.value = false;
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        uploadCSVFile(files[0]);
      }
    };

    const uploadCSVFile = async (file: File) => {
      uploadError.value = '';
      if (!file.name.endsWith('.csv')) {
        uploadError.value = 'Invalid file type. Please upload a standard CSV file.';
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await api.post(`/projects/${projectId.value}/imports/preview`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data.success) {
          previewData.value = response.data.data;
          columnMappings.value = response.data.data.suggestedMappings;
          currentStep.value = 2;
        }
      } catch (err: any) {
        uploadError.value = err.response?.data?.message || 'Failed to upload and preview CSV.';
      }
    };

    // Trigger Import Run
    const triggerStartImport = async () => {
      if (!previewData.value) return;

      const mappingsPayload: { [key: string]: string } = {};
      columnMappings.value.forEach((mapping) => {
        if (mapping.targetField !== 'ignore') {
          mappingsPayload[mapping.header] = mapping.targetField;
        }
      });

      try {
        const response = await api.post(`/projects/${projectId.value}/imports/start`, {
          filename: previewData.value.filename,
          mappings: mappingsPayload,
          options: options.value,
        });

        if (response.data.success) {
          importJob.value = response.data.data;
          currentStep.value = 4;
          // Socket will handle progress updates in room `user:${userId}`
        }
      } catch (err: any) {
        toast.error(err.response?.data?.message || 'Failed to trigger background import job.');
      }
    };

    const loadRunningJobProgress = async (jobId: string) => {
      try {
        const res = await api.get(`/imports/jobs/${jobId}`);
        if (res.data.success) {
          importJob.value = res.data.data;
        }
      } catch (err) {
        console.error('Failed to reload job status:', err);
      }
    };

    const finishImport = () => {
      router.push(`/project/${projectId.value}/board`);
    };

    // Step styling mapping
    const stepNumberClass = (num: number) => {
      if (currentStep.value === num) {
        return 'bg-zyra-primary border-zyra-primary text-white shadow-sm';
      }
      if (currentStep.value > num) {
        return 'bg-green-500 border-green-500 text-white';
      }
      return 'bg-white border-gray-300 text-gray-400';
    };

    const stepTextClass = (num: number) => {
      if (currentStep.value === num) return 'text-zyra-primary';
      if (currentStep.value > num) return 'text-green-600';
      return 'text-gray-400';
    };

    onMounted(() => {
      socket.on('import:progress', (data) => {
        if (importJob.value && importJob.value.id === data.jobId) {
          importJob.value.progress = data.progress;
          importJob.value.successRows = data.successRows;
          importJob.value.failedRows = data.failedRows;
        }
      });

      socket.on('import:completed', (data) => {
        if (importJob.value && importJob.value.id === data.jobId) {
          importJob.value.status = 'COMPLETED';
          importJob.value.progress = 100;
          importJob.value.successRows = data.successRows;
          importJob.value.failedRows = data.failedRows;
          loadRunningJobProgress(data.jobId); // load all errors
        }
      });
    });

    onUnmounted(() => {
      socket.off('import:progress');
      socket.off('import:completed');
    });

    return {
      currentStep,
      steps,
      isDragging,
      uploadError,
      previewData,
      columnMappings,
      options,
      importJob,
      handleFileSelect,
      handleFileDrop,
      triggerStartImport,
      finishImport,
      stepNumberClass,
      stepTextClass,
    };
  },
});
</script>
