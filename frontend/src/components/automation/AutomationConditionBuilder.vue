<template>
  <div class="space-y-3">
    <!-- Condition rows -->
    <div v-if="localConditions.length > 0" class="space-y-2">
      <div
        v-for="(condition, index) in localConditions"
        :key="condition.id"
        class="group"
      >
        <!-- AND/OR separator -->
        <div v-if="index > 0" class="flex items-center gap-2 my-2">
          <div class="flex-grow h-px bg-slate-700/50" />
          <button
            @click="toggleLogicalOperator"
            class="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all duration-200"
            :class="logicalOperator === 'AND'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
              : 'bg-purple-500/10 text-purple-400 border-purple-500/30 hover:bg-purple-500/20'"
          >
            {{ logicalOperator }}
          </button>
          <div class="flex-grow h-px bg-slate-700/50" />
        </div>

        <!-- Condition row card -->
        <div class="flex items-start gap-2 p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl hover:border-slate-600/60 transition-all duration-200">
          <!-- Field Selector -->
          <div class="flex-shrink-0 w-36">
            <select
              v-model="condition.field"
              @change="onFieldChange(condition)"
              class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition cursor-pointer"
            >
              <option v-for="f in conditionFields" :key="f.value" :value="f.value">{{ f.label }}</option>
            </select>
          </div>

          <!-- Operator Selector -->
          <div class="flex-shrink-0 w-32">
            <select
              v-model="condition.operator"
              class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition cursor-pointer"
            >
              <option
                v-for="op in getOperatorsForField(condition.field)"
                :key="op.value"
                :value="op.value"
              >{{ op.label }}</option>
            </select>
          </div>

          <!-- Value Input -->
          <div class="flex-grow">
            <!-- Dropdown for enum fields -->
            <select
              v-if="isEnumField(condition.field) && !isEmptyOperator(condition.operator)"
              v-model="condition.value"
              @change="emitUpdate"
              class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition cursor-pointer"
            >
              <option value="">— Select —</option>
              <option v-for="opt in getEnumOptions(condition.field)" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
            </select>

            <!-- Number input for story_points -->
            <input
              v-else-if="condition.field === 'story_points' && !isEmptyOperator(condition.operator)"
              v-model="condition.value"
              @input="emitUpdate"
              type="number"
              min="0"
              placeholder="e.g. 5"
              class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition"
            />

            <!-- Date input for due_date -->
            <input
              v-else-if="condition.field === 'due_date' && !isEmptyOperator(condition.operator)"
              v-model="condition.value"
              @input="emitUpdate"
              type="date"
              class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition"
            />

            <!-- Empty operator label -->
            <div
              v-else-if="isEmptyOperator(condition.operator)"
              class="px-2.5 py-2 text-xs text-slate-500 italic"
            >
              No value required
            </div>

            <!-- Text input fallback -->
            <input
              v-else
              v-model="condition.value"
              @input="emitUpdate"
              type="text"
              placeholder="Enter value..."
              class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition"
            />
          </div>

          <!-- Remove button -->
          <button
            @click="removeCondition(index)"
            class="flex-shrink-0 p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
            title="Remove condition"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="flex flex-col items-center py-6 rounded-xl border border-dashed border-slate-700/60 text-center">
      <Filter class="w-8 h-8 text-slate-600 mb-2" />
      <p class="text-sm font-medium text-slate-500">No conditions yet</p>
      <p class="text-xs text-slate-600 mt-1">Add conditions to filter when this rule runs</p>
    </div>

    <!-- Add Condition button -->
    <button
      @click="addCondition"
      class="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-orange-500/30 text-orange-400 text-sm font-medium hover:bg-orange-500/10 hover:border-orange-500/50 transition-all duration-200 w-full justify-center"
    >
      <Plus class="w-4 h-4" />
      Add Condition
    </button>

    <!-- Logical operator hint -->
    <div v-if="localConditions.length > 1" class="flex items-center gap-2 text-xs text-slate-500">
      <Info class="w-3.5 h-3.5 flex-shrink-0" />
      <span>Click <span class="font-bold text-slate-400">{{ logicalOperator }}</span> between conditions to toggle between AND / OR logic</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';
import { Plus, X, Filter, Info } from 'lucide-vue-next';

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface FieldDef {
  value: string;
  label: string;
  type: 'enum' | 'text' | 'number' | 'date';
}

interface OperatorDef {
  value: string;
  label: string;
}

export default defineComponent({
  name: 'AutomationConditionBuilder',
  components: { Plus, X, Filter, Info },
  props: {
    conditions: {
      type: Array as () => any[],
      default: () => []
    },
    projectId: {
      type: String,
      required: true
    }
  },
  emits: ['update:conditions'],
  setup(props, { emit }) {
    const localConditions = ref<Condition[]>(
      (props.conditions || []).map((c: any) => ({ ...c, id: c.id || crypto.randomUUID() }))
    );
    const logicalOperator = ref<'AND' | 'OR'>('AND');

    const conditionFields: FieldDef[] = [
      { value: 'issue_type', label: 'Issue Type', type: 'enum' },
      { value: 'priority', label: 'Priority', type: 'enum' },
      { value: 'status', label: 'Status', type: 'enum' },
      { value: 'assignee', label: 'Assignee', type: 'text' },
      { value: 'reporter', label: 'Reporter', type: 'text' },
      { value: 'label', label: 'Label', type: 'text' },
      { value: 'sprint', label: 'Sprint', type: 'text' },
      { value: 'project', label: 'Project', type: 'text' },
      { value: 'story_points', label: 'Story Points', type: 'number' },
      { value: 'due_date', label: 'Due Date', type: 'date' },
    ];

    const allOperators: OperatorDef[] = [
      { value: 'equals', label: 'equals' },
      { value: 'not_equals', label: 'not equals' },
      { value: 'contains', label: 'contains' },
      { value: 'greater_than', label: 'greater than' },
      { value: 'less_than', label: 'less than' },
      { value: 'is_empty', label: 'is empty' },
      { value: 'is_not_empty', label: 'is not empty' },
    ];

    const numericOperators = ['equals', 'not_equals', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'];
    const textOperators = ['equals', 'not_equals', 'contains', 'is_empty', 'is_not_empty'];
    const enumOperators = ['equals', 'not_equals', 'is_empty', 'is_not_empty'];
    const dateOperators = ['equals', 'not_equals', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'];

    const getOperatorsForField = (field: string): OperatorDef[] => {
      const fd = conditionFields.find(f => f.value === field);
      if (!fd) return allOperators;
      let allowed: string[];
      switch (fd.type) {
        case 'enum': allowed = enumOperators; break;
        case 'number': allowed = numericOperators; break;
        case 'date': allowed = dateOperators; break;
        default: allowed = textOperators;
      }
      return allOperators.filter(op => allowed.includes(op.value));
    };

    const enumOptions: Record<string, { value: string; label: string }[]> = {
      issue_type: [
        { value: 'TASK', label: 'Task' },
        { value: 'BUG', label: 'Bug' },
        { value: 'STORY', label: 'Story' },
        { value: 'EPIC', label: 'Epic' },
        { value: 'SUBTASK', label: 'Subtask' },
      ],
      priority: [
        { value: 'LOW', label: 'Low' },
        { value: 'MEDIUM', label: 'Medium' },
        { value: 'HIGH', label: 'High' },
        { value: 'HIGHEST', label: 'Highest / Blocker' },
      ],
      status: [
        { value: 'TO_DO', label: 'To Do' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'IN_REVIEW', label: 'In Review' },
        { value: 'DONE', label: 'Done' },
      ],
    };

    const isEnumField = (field: string) => field in enumOptions;
    const getEnumOptions = (field: string) => enumOptions[field] || [];
    const isEmptyOperator = (op: string) => op === 'is_empty' || op === 'is_not_empty';

    const emitUpdate = () => {
      emit('update:conditions', localConditions.value.map(c => ({
        id: c.id,
        field: c.field,
        operator: c.operator,
        value: c.value,
        logicalOperator: logicalOperator.value
      })));
    };

    const addCondition = () => {
      localConditions.value.push({
        id: crypto.randomUUID(),
        field: 'priority',
        operator: 'equals',
        value: ''
      });
      emitUpdate();
    };

    const removeCondition = (index: number) => {
      localConditions.value.splice(index, 1);
      emitUpdate();
    };

    const onFieldChange = (condition: Condition) => {
      condition.operator = 'equals';
      condition.value = '';
      emitUpdate();
    };

    const toggleLogicalOperator = () => {
      logicalOperator.value = logicalOperator.value === 'AND' ? 'OR' : 'AND';
      emitUpdate();
    };

    watch(() => props.conditions, (newVal) => {
      if (JSON.stringify(newVal) !== JSON.stringify(localConditions.value)) {
        localConditions.value = (newVal || []).map((c: any) => ({ ...c, id: c.id || crypto.randomUUID() }));
      }
    }, { deep: true });

    return {
      localConditions,
      logicalOperator,
      conditionFields,
      getOperatorsForField,
      isEnumField,
      getEnumOptions,
      isEmptyOperator,
      emitUpdate,
      addCondition,
      removeCondition,
      onFieldChange,
      toggleLogicalOperator
    };
  }
});
</script>
