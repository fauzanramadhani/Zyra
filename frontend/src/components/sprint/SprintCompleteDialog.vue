<template>
  <AppDialog v-model="visible" title="Complete Sprint" size="md">
    <div class="space-y-4">
      <!-- Sprint Summary -->
      <div class="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
        <h4 class="text-sm font-bold text-slate-800 dark:text-white mb-3">{{ sprint?.name }} Summary</h4>
        <div class="grid grid-cols-3 gap-3">
          <div class="text-center">
            <div class="text-lg font-bold text-green-600 dark:text-green-400">{{ completedCount }}</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Completed</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-orange-500">{{ incompleteCount }}</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Incomplete</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-slate-700 dark:text-slate-200">{{ totalCount }}</div>
            <div class="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Total</div>
          </div>
        </div>

        <!-- Progress bar -->
        <div class="mt-3">
          <div class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-300"
              :style="{ width: progressPercent + '%' }"
            ></div>
          </div>
          <div class="text-right text-[10px] text-slate-500 dark:text-slate-400 mt-1">{{ progressPercent }}% complete</div>
        </div>
      </div>

      <!-- Incomplete Issues Warning -->
      <div v-if="incompleteCount > 0" class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
        <p class="text-xs font-medium text-orange-700 dark:text-orange-300 mb-2">
          {{ incompleteCount }} issue{{ incompleteCount > 1 ? 's' : '' }} will be moved:
        </p>
        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">Move incomplete issues to:</label>
          <select
            v-model="targetSprintId"
            class="w-full border border-gray-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-slate-200 outline-none focus:ring-1 focus:ring-zyra-primary transition"
          >
            <option value="">Backlog (no sprint)</option>
            <option v-for="s in availableSprints" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
      </div>

      <!-- All done message -->
      <div v-else class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
        <p class="text-xs font-medium text-green-700 dark:text-green-300">
          All issues are completed. This sprint is ready to close.
        </p>
      </div>
    </div>

    <template #footer="{ close }">
      <button type="button" @click="close" class="px-4 py-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition">
        Cancel
      </button>
      <button
        @click="handleComplete"
        class="px-4 py-2 bg-zyra-primary hover:bg-zyra-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition"
      >
        Complete Sprint
      </button>
    </template>
  </AppDialog>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import AppDialog from '../ui/AppDialog.vue';

export default defineComponent({
  name: 'SprintCompleteDialog',
  components: { AppDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    sprint: { type: Object, default: null },
    sprints: { type: Array as () => any[], default: () => [] },
  },
  emits: ['update:modelValue', 'complete'],
  setup(props, { emit }) {
    const visible = computed({
      get: () => props.modelValue,
      set: (v) => emit('update:modelValue', v),
    });

    const targetSprintId = ref('');

    const issues = computed(() => props.sprint?.issues || []);
    const totalCount = computed(() => issues.value.length);
    const completedCount = computed(() => {
      return issues.value.filter((i: any) =>
        i.status?.name?.toLowerCase() === 'done' || i.statusName?.toLowerCase() === 'done'
      ).length;
    });
    const incompleteCount = computed(() => totalCount.value - completedCount.value);
    const progressPercent = computed(() =>
      totalCount.value > 0 ? Math.round((completedCount.value / totalCount.value) * 100) : 0
    );

    const availableSprints = computed(() =>
      props.sprints.filter((s: any) => s.id !== props.sprint?.id && s.status === 'FUTURE')
    );

    const handleComplete = () => {
      emit('complete', { targetSprintId: targetSprintId.value || null });
      visible.value = false;
    };

    return { visible, targetSprintId, totalCount, completedCount, incompleteCount, progressPercent, availableSprints, handleComplete };
  },
});
</script>
