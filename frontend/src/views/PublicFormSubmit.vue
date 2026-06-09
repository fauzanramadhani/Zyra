<template>
  <div class="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4 md:p-8">
    <div class="w-full max-w-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden transition-all duration-300">
      
      <!-- Loading State -->
      <div v-if="loading" class="flex flex-col items-center justify-center py-20 px-6">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
        <p class="text-sm text-slate-500 dark:text-slate-400">Loading form...</p>
      </div>

      <!-- Error State -->
      <div v-else-if="errorMsg" class="text-center py-20 px-6">
        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircleIcon class="w-8 h-8 text-red-500 dark:text-red-400" />
        </div>
        <h2 class="text-xl font-bold text-slate-800 dark:text-white mb-2">Form Not Found</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">{{ errorMsg }}</p>
      </div>

      <!-- Success State -->
      <div v-else-if="submitted" class="text-center py-16 px-6">
        <div class="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckIcon class="w-8 h-8 text-green-500 dark:text-green-400" />
        </div>
        <h2 class="text-xl font-bold text-slate-800 dark:text-white mb-2">Thank you!</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-6">Your submission has been received successfully.</p>
        <div v-if="createdIssueKey" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-750 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-200 mb-8">
          <span>Ticket Reference:</span>
          <span class="font-mono text-orange-500">{{ createdIssueKey }}</span>
        </div>
        <div>
          <button @click="resetForm" class="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-lg text-sm hover:bg-orange-600 transition">
            Submit another response
          </button>
        </div>
      </div>

      <!-- Form Content -->
      <div v-else-if="form">
        <!-- Header -->
        <div class="p-6 md:p-8 bg-gradient-to-r from-orange-500 to-amber-600 text-white">
          <h1 class="text-2xl font-bold">{{ form.title }}</h1>
          <p v-if="form.description" class="text-sm opacity-90 mt-2 whitespace-pre-wrap">{{ form.description }}</p>
        </div>

        <!-- Form Body -->
        <form @submit.prevent="handleSubmit" class="p-6 md:p-8 space-y-6">
          <div v-for="field in form.fields" :key="field.name" class="space-y-1">
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              {{ field.name }}
              <span v-if="field.required" class="text-red-500" title="Required">*</span>
            </label>

            <!-- Text area -->
            <textarea
              v-if="field.type === 'TEXTAREA'"
              v-model="submissionData[field.name]"
              :required="field.required"
              rows="4"
              class="w-full px-3 py-2 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none dark:text-white"
            ></textarea>

            <!-- Select dropdown -->
            <select
              v-else-if="field.type === 'SELECT'"
              v-model="submissionData[field.name]"
              :required="field.required"
              class="w-full px-3 py-2 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none dark:text-white"
            >
              <option value="">Select an option</option>
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <!-- Email Input -->
            <input
              v-else-if="field.type === 'EMAIL'"
              type="email"
              v-model="submissionData[field.name]"
              :required="field.required"
              class="w-full px-3 py-2 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none dark:text-white"
            />

            <!-- Standard text input -->
            <input
              v-else
              type="text"
              v-model="submissionData[field.name]"
              :required="field.required"
              class="w-full px-3 py-2 border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-900 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none dark:text-white"
            />
          </div>

          <div class="pt-4 flex justify-end">
            <button
              type="submit"
              :disabled="submitting"
              class="w-full md:w-auto px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-lg text-sm hover:bg-orange-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span v-if="submitting" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              <span>{{ submitting ? 'Submitting...' : 'Submit Form' }}</span>
            </button>
          </div>
        </form>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Check as CheckIcon, AlertCircle as AlertCircleIcon } from 'lucide-vue-next';
import api from '../services/api';

export default defineComponent({
  name: 'PublicFormSubmit',
  components: { CheckIcon, AlertCircleIcon },
  setup() {
    const route = useRoute();
    const slug = route.params.slug as string;

    const loading = ref(true);
    const submitting = ref(false);
    const submitted = ref(false);
    const errorMsg = ref('');
    const form = ref<any>(null);
    const submissionData = ref<Record<string, any>>({});
    const createdIssueKey = ref('');

    const fetchForm = async () => {
      loading.value = true;
      errorMsg.value = '';
      try {
        const { data } = await api.get(`/public/forms/${slug}`);
        if (data.success && data.data) {
          form.value = data.data;
          // Initialize fields
          form.value.fields.forEach((field: any) => {
            submissionData.value[field.name] = '';
          });
        } else {
          errorMsg.value = 'Form not found or has been disabled.';
        }
      } catch (err: any) {
        errorMsg.value = err.response?.data?.message || 'Failed to load form.';
      } finally {
        loading.value = false;
      }
    };

    const handleSubmit = async () => {
      submitting.value = true;
      try {
        const { data } = await api.post(`/public/forms/${slug}/submit`, {
          data: submissionData.value
        });
        if (data.success) {
          createdIssueKey.value = data.data.issue?.key || '';
          submitted.value = true;
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to submit form.');
      } finally {
        submitting.value = false;
      }
    };

    const resetForm = () => {
      submitted.value = false;
      createdIssueKey.value = '';
      if (form.value) {
        form.value.fields.forEach((field: any) => {
          submissionData.value[field.name] = '';
        });
      }
    };

    onMounted(fetchForm);

    return {
      loading,
      submitting,
      submitted,
      errorMsg,
      form,
      submissionData,
      createdIssueKey,
      handleSubmit,
      resetForm
    };
  }
});
</script>
