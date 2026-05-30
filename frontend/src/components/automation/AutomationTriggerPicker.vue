<template>
  <div class="space-y-4">
    <!-- Search Input -->
    <div class="relative">
      <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search triggers..."
        class="w-full pl-9 pr-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition"
      />
    </div>

    <!-- Categories -->
    <div v-if="filteredCategories.length > 0" class="space-y-5">
      <div v-for="category in filteredCategories" :key="category.name">
        <div class="flex items-center gap-2 mb-2.5">
          <component :is="category.icon" class="w-3.5 h-3.5 text-slate-500" />
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-500">{{ category.name }}</span>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            v-for="trigger in category.triggers"
            :key="trigger.value"
            @click="select(trigger.value)"
            :class="[
              'group relative flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200',
              modelValue === trigger.value
                ? 'bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/10'
                : 'bg-slate-800/40 border-slate-700/60 hover:bg-slate-700/50 hover:border-slate-600 hover:shadow-lg hover:shadow-slate-900/30'
            ]"
          >
            <!-- Icon bubble -->
            <div :class="[
              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200',
              modelValue === trigger.value
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-slate-700/60 text-slate-400 group-hover:bg-slate-600/60 group-hover:text-slate-300'
            ]">
              <component :is="trigger.icon" class="w-4 h-4" />
            </div>

            <div class="flex-grow min-w-0">
              <p :class="[
                'text-sm font-semibold leading-tight',
                modelValue === trigger.value ? 'text-orange-300' : 'text-slate-200'
              ]">{{ trigger.name }}</p>
              <p class="text-xs text-slate-500 mt-0.5 leading-tight">{{ trigger.description }}</p>
            </div>

            <!-- Selected checkmark -->
            <div v-if="modelValue === trigger.value" class="flex-shrink-0 mt-0.5">
              <CheckCircle2 class="w-4 h-4 text-orange-400" />
            </div>

            <!-- Hover glow -->
            <div class="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ring-1 ring-slate-500/20" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="flex flex-col items-center py-10 text-center">
      <SearchX class="w-10 h-10 text-slate-600 mb-3" />
      <p class="text-sm font-medium text-slate-500">No triggers found</p>
      <p class="text-xs text-slate-600 mt-1">Try a different search term</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed } from 'vue';
import {
  Search, SearchX, CheckCircle2,
  Zap, GitBranch, MessageSquare, Clock,
  PlusCircle, Edit, Trash2, UserCheck, UserX,
  CheckSquare, Archive, ArrowRightLeft, FastForward,
  PlayCircle, StopCircle, FolderPlus, AtSign, Bell,
  RefreshCw, Calendar, AlertCircle
} from 'lucide-vue-next';

interface TriggerDef {
  value: string;
  name: string;
  description: string;
  icon: any;
}

interface CategoryDef {
  name: string;
  icon: any;
  triggers: TriggerDef[];
}

export default defineComponent({
  name: 'AutomationTriggerPicker',
  components: {
    Search, SearchX, CheckCircle2,
    Zap, GitBranch, MessageSquare, Clock,
    PlusCircle, Edit, Trash2, UserCheck, UserX,
    CheckSquare, Archive, ArrowRightLeft, FastForward,
    PlayCircle, StopCircle, FolderPlus, AtSign, Bell,
    RefreshCw, Calendar, AlertCircle
  },
  props: {
    modelValue: {
      type: String,
      default: ''
    },
    projectId: {
      type: String,
      required: true
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const searchQuery = ref('');

    const categories: CategoryDef[] = [
      {
        name: 'Issue Events',
        icon: Zap,
        triggers: [
          { value: 'issue_created', name: 'Issue Created', description: 'When a new issue is created in the project', icon: PlusCircle },
          { value: 'issue_updated', name: 'Issue Updated', description: 'When any field on an issue changes', icon: Edit },
          { value: 'issue_deleted', name: 'Issue Deleted', description: 'When an issue is permanently deleted', icon: Trash2 },
          { value: 'issue_assigned', name: 'Issue Assigned', description: 'When an issue is assigned to a user', icon: UserCheck },
          { value: 'issue_unassigned', name: 'Issue Unassigned', description: 'When an issue is removed from a user', icon: UserX },
          { value: 'issue_completed', name: 'Issue Completed', description: 'When an issue moves to a done state', icon: CheckSquare },
          { value: 'issue_archived', name: 'Issue Archived', description: 'When an issue is archived', icon: Archive },
          { value: 'issue_moved_status', name: 'Status Changed', description: 'When an issue moves between status columns', icon: ArrowRightLeft },
          { value: 'issue_moved_sprint', name: 'Moved to Sprint', description: 'When an issue is moved to a sprint', icon: FastForward },
        ]
      },
      {
        name: 'Sprint Events',
        icon: GitBranch,
        triggers: [
          { value: 'sprint_created', name: 'Sprint Created', description: 'When a new sprint is created', icon: FolderPlus },
          { value: 'sprint_started', name: 'Sprint Started', description: 'When a sprint begins', icon: PlayCircle },
          { value: 'sprint_completed', name: 'Sprint Completed', description: 'When a sprint is marked complete', icon: StopCircle },
        ]
      },
      {
        name: 'Comment Events',
        icon: MessageSquare,
        triggers: [
          { value: 'comment_added', name: 'Comment Added', description: 'When a new comment is posted on an issue', icon: MessageSquare },
          { value: 'mention_detected', name: 'Mention Detected', description: 'When a user is @mentioned in a comment', icon: AtSign },
        ]
      },
      {
        name: 'Time & Schedule',
        icon: Clock,
        triggers: [
          { value: 'scheduled', name: 'Scheduled', description: 'Run at a specific date and time', icon: Calendar },
          { value: 'recurring', name: 'Recurring', description: 'Run on a recurring schedule (daily, weekly)', icon: RefreshCw },
          { value: 'due_date_reached', name: 'Due Date Reached', description: 'When an issue reaches its due date', icon: Bell },
          { value: 'overdue_issue', name: 'Issue Overdue', description: 'When an issue is past its due date', icon: AlertCircle },
        ]
      }
    ];

    const filteredCategories = computed<CategoryDef[]>(() => {
      const q = searchQuery.value.trim().toLowerCase();
      if (!q) return categories;

      return categories
        .map(cat => ({
          ...cat,
          triggers: cat.triggers.filter(
            t => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
          )
        }))
        .filter(cat => cat.triggers.length > 0);
    });

    const select = (value: string) => {
      emit('update:modelValue', value);
    };

    return { searchQuery, filteredCategories, select };
  }
});
</script>
