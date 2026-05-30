<template>
  <div
    class="group flex items-center gap-3 p-3 bg-white dark:bg-zyra-gray-darkCard hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-lg shadow-sm hover:shadow transition-all duration-150 cursor-grab active:cursor-grabbing"
    :class="{ 'ring-2 ring-zyra-primary/50 bg-orange-50 dark:bg-orange-900/10': selected }"
  >
    <!-- Drag Handle -->
    <div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 dark:text-slate-500">
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="8" cy="4" r="2"/><circle cx="16" cy="4" r="2"/>
        <circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/>
        <circle cx="8" cy="20" r="2"/><circle cx="16" cy="20" r="2"/>
      </svg>
    </div>

    <!-- Checkbox -->
    <input
      type="checkbox"
      :checked="selected"
      @change="$emit('toggle-select', issue.id)"
      class="w-3.5 h-3.5 rounded border-gray-300 dark:border-slate-600 text-orange-500 focus:ring-orange-500 flex-shrink-0"
      @click.stop
    />

    <!-- Type Badge -->
    <span :class="typeBadgeClass" class="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider flex-shrink-0">
      {{ issue.type }}
    </span>

    <!-- Key -->
    <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide flex-shrink-0">
      {{ issue.key }}
    </span>

    <!-- Title -->
    <p class="text-xs font-medium text-slate-700 dark:text-slate-200 truncate flex-grow min-w-0">
      {{ issue.summary }}
    </p>

    <!-- Right side info -->
    <div class="flex items-center gap-2 flex-shrink-0">
      <!-- Priority -->
      <span v-if="issue.priority" :class="priorityClass" class="w-4 h-4 rounded flex items-center justify-center" :title="issue.priority">
        <svg v-if="issue.priority === 'HIGH' || issue.priority === 'HIGHEST'" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l-2 8h4l-2 8"/></svg>
        <svg v-else-if="issue.priority === 'LOW' || issue.priority === 'LOWEST'" class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 22l2-8h-4l2-8"/></svg>
        <span v-else class="w-2 h-0.5 bg-current rounded"></span>
      </span>

      <!-- Story Points -->
      <span v-if="issue.storyPoints" class="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
        {{ issue.storyPoints }}
      </span>

      <!-- Assignee Avatar -->
      <div v-if="issue.assignee" class="w-5 h-5 rounded-full bg-zyra-primary/20 flex items-center justify-center" :title="issue.assignee.firstName || issue.assignee.email">
        <span class="text-[8px] font-bold text-zyra-primary uppercase">
          {{ (issue.assignee.firstName || issue.assignee.email || '?')[0] }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  name: 'BacklogIssueCard',
  props: {
    issue: { type: Object, required: true },
    selected: { type: Boolean, default: false },
  },
  emits: ['toggle-select'],
  setup(props) {
    const typeBadgeClass = computed(() => {
      const map: Record<string, string> = {
        BUG: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
        STORY: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
        TASK: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
        EPIC: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
        SUBTASK: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
      };
      return map[props.issue.type] || map.TASK;
    });

    const priorityClass = computed(() => {
      const map: Record<string, string> = {
        HIGHEST: 'text-red-600',
        HIGH: 'text-orange-500',
        MEDIUM: 'text-yellow-500',
        LOW: 'text-blue-500',
        LOWEST: 'text-slate-400',
      };
      return map[props.issue.priority] || 'text-slate-400';
    });

    return { typeBadgeClass, priorityClass };
  },
});
</script>
