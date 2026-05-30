<template>
  <AppDialog v-model="visible" :title="isEdit ? 'Edit Sprint' : 'Create Sprint'" size="md">
    <form @submit.prevent="handleSubmit" class="space-y-4">
      <div>
        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Sprint Name *</label>
        <input
          type="text"
          v-model="form.name"
          required
          placeholder="e.g. Sprint 12"
          maxlength="80"
          class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none transition"
        />
      </div>

      <div>
        <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Goal / Description</label>
        <textarea
          v-model="form.goal"
          rows="2"
          placeholder="What do you want to achieve in this sprint?"
          maxlength="500"
          class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none transition resize-none"
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Start Date</label>
          <input
            type="date"
            v-model="form.startDate"
            class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none transition"
          />
        </div>
        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">End Date</label>
          <input
            type="date"
            v-model="form.endDate"
            class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-zyra-primary outline-none transition"
          />
        </div>
      </div>

      <div v-if="!isEdit" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p class="text-xs text-blue-700 dark:text-blue-300">
          New sprints start in <strong>FUTURE</strong> status. You can start them from the Backlog view when ready.
        </p>
      </div>
    </form>

    <template #footer="{ close }">
      <button type="button" @click="close" class="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
        Cancel
      </button>
      <button
        @click="handleSubmit"
        :disabled="!form.name.trim()"
        class="px-4 py-2 bg-zyra-primary hover:bg-zyra-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition"
      >
        {{ isEdit ? 'Save Changes' : 'Create Sprint' }}
      </button>
    </template>
  </AppDialog>
</template>

<script lang="ts">
import { defineComponent, ref, watch, computed } from 'vue';
import AppDialog from '../ui/AppDialog.vue';

export default defineComponent({
  name: 'SprintEditDialog',
  components: { AppDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    sprint: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'submit'],
  setup(props, { emit }) {
    const visible = computed({
      get: () => props.modelValue,
      set: (v) => emit('update:modelValue', v),
    });

    const isEdit = computed(() => !!props.sprint);

    const form = ref({
      name: '',
      goal: '',
      startDate: '',
      endDate: '',
    });

    watch(() => props.modelValue, (open) => {
      if (open && props.sprint) {
        form.value = {
          name: props.sprint.name || '',
          goal: props.sprint.goal || '',
          startDate: props.sprint.startDate ? props.sprint.startDate.split('T')[0] : '',
          endDate: props.sprint.endDate ? props.sprint.endDate.split('T')[0] : '',
        };
      } else if (open) {
        form.value = { name: '', goal: '', startDate: '', endDate: '' };
      }
    });

    const handleSubmit = () => {
      if (!form.value.name.trim()) return;
      emit('submit', { ...form.value });
      visible.value = false;
    };

    return { visible, isEdit, form, handleSubmit };
  },
});
</script>
