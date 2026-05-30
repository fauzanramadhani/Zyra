<template>
  <div class="space-y-3">
    <!-- Action rows -->
    <div v-if="localActions.length > 0" class="space-y-2">
      <div
        v-for="(action, index) in localActions"
        :key="action.id"
        class="group p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl hover:border-slate-600/60 transition-all duration-200"
      >
        <div class="flex items-center gap-2 mb-3">
          <!-- Drag handle (visual only) -->
          <div class="flex-shrink-0 cursor-grab text-slate-600 hover:text-slate-400 transition">
            <GripVertical class="w-4 h-4" />
          </div>

          <!-- Step badge -->
          <span class="flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-bold flex items-center justify-center">
            {{ index + 1 }}
          </span>

          <!-- Action type selector -->
          <select
            v-model="action.type"
            @change="onActionTypeChange(action)"
            class="flex-grow px-2.5 py-1.5 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 transition cursor-pointer"
          >
            <option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>

          <!-- Remove button -->
          <button
            @click="removeAction(index)"
            class="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
            title="Remove action"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Dynamic params -->
        <div class="pl-9 space-y-2">
          <!-- assign_user -->
          <template v-if="action.type === 'assign_user' || action.type === 'unassign_user' || action.type === 'send_mention'">
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">User ID</label>
              <input v-model="action.params.userId" @input="emitUpdate" type="text" placeholder="e.g. user-uuid or @username"
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition" />
            </div>
            <div v-if="action.type === 'send_mention'">
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Message</label>
              <textarea v-model="action.params.message" @input="emitUpdate" rows="2" placeholder="Mention message..."
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition resize-none" />
            </div>
          </template>

          <!-- add_label / remove_label -->
          <template v-if="action.type === 'add_label' || action.type === 'remove_label'">
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Label Name</label>
              <input v-model="action.params.labelName" @input="emitUpdate" type="text" placeholder="e.g. urgent, bug, needs-review"
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition" />
            </div>
            <div v-if="action.type === 'add_label'">
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Label Color (optional)</label>
              <div class="flex items-center gap-2">
                <input v-model="action.params.color" @input="emitUpdate" type="color"
                  class="h-8 w-12 rounded cursor-pointer bg-transparent border border-slate-600" />
                <input v-model="action.params.color" @input="emitUpdate" type="text" placeholder="#FF6B35"
                  class="flex-grow px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition" />
              </div>
            </div>
          </template>

          <!-- change_status -->
          <template v-if="action.type === 'change_status'">
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Status ID</label>
              <input v-model="action.params.statusId" @input="emitUpdate" type="text" placeholder="e.g. status-uuid"
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition" />
            </div>
          </template>

          <!-- send_notification -->
          <template v-if="action.type === 'send_notification'">
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">User ID</label>
              <input v-model="action.params.userId" @input="emitUpdate" type="text" placeholder="Target user ID"
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition" />
            </div>
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Title</label>
              <input v-model="action.params.title" @input="emitUpdate" type="text" placeholder="Notification title"
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition" />
            </div>
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Message</label>
              <textarea v-model="action.params.message" @input="emitUpdate" rows="2" placeholder="Notification message body"
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition resize-none" />
            </div>
          </template>

          <!-- add_comment -->
          <template v-if="action.type === 'add_comment'">
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Comment Body</label>
              <textarea v-model="action.params.body" @input="emitUpdate" rows="3" placeholder="Comment text to add..."
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition resize-none" />
            </div>
          </template>

          <!-- create_issue / create_subtask -->
          <template v-if="action.type === 'create_issue' || action.type === 'create_subtask'">
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Summary</label>
              <input v-model="action.params.summary" @input="emitUpdate" type="text" placeholder="Issue summary"
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Type</label>
                <select v-model="action.params.type" @change="emitUpdate"
                  class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition">
                  <option value="TASK">Task</option>
                  <option value="BUG">Bug</option>
                  <option value="STORY">Story</option>
                </select>
              </div>
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Priority</label>
                <select v-model="action.params.priority" @change="emitUpdate"
                  class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="HIGHEST">Highest</option>
                </select>
              </div>
            </div>
          </template>

          <!-- move_sprint / move_issue_to_sprint -->
          <template v-if="action.type === 'move_sprint' || action.type === 'move_issue_to_sprint'">
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Sprint ID</label>
              <input v-model="action.params.sprintId" @input="emitUpdate" type="text" placeholder="Target sprint UUID"
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition" />
            </div>
          </template>

          <!-- websocket_broadcast -->
          <template v-if="action.type === 'websocket_broadcast'">
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Event Name</label>
              <input v-model="action.params.eventName" @input="emitUpdate" type="text" placeholder="e.g. automation_fired"
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition" />
            </div>
            <div>
              <label class="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Payload (JSON)</label>
              <textarea v-model="action.params.payload" @input="emitUpdate" rows="3" placeholder='{"key": "value"}'
                class="w-full px-2.5 py-2 bg-slate-700/60 border border-slate-600/60 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition resize-none font-mono" />
            </div>
          </template>

          <!-- archive_issue / auto_complete_sprint: no extra params needed -->
          <template v-if="action.type === 'archive_issue' || action.type === 'auto_complete_sprint'">
            <p class="text-xs text-slate-500 italic">No additional parameters required.</p>
          </template>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="flex flex-col items-center py-6 rounded-xl border border-dashed border-slate-700/60 text-center">
      <Zap class="w-8 h-8 text-slate-600 mb-2" />
      <p class="text-sm font-medium text-slate-500">No actions yet</p>
      <p class="text-xs text-slate-600 mt-1">Add actions to perform when this rule triggers</p>
    </div>

    <!-- Add Action button -->
    <button
      @click="addAction"
      class="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-orange-500/30 text-orange-400 text-sm font-medium hover:bg-orange-500/10 hover:border-orange-500/50 transition-all duration-200 w-full justify-center"
    >
      <Plus class="w-4 h-4" />
      Add Action
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch } from 'vue';
import { Plus, X, GripVertical, Zap } from 'lucide-vue-next';

interface ActionParam {
  [key: string]: any;
}

interface Action {
  id: string;
  type: string;
  params: ActionParam;
}

const defaultParams = (type: string): ActionParam => {
  switch (type) {
    case 'assign_user': return { userId: '' };
    case 'unassign_user': return { userId: '' };
    case 'add_label': return { labelName: '', color: '#FF6B35' };
    case 'remove_label': return { labelName: '' };
    case 'change_status': return { statusId: '' };
    case 'send_notification': return { userId: '', title: '', message: '' };
    case 'send_mention': return { userId: '', message: '' };
    case 'add_comment': return { body: '' };
    case 'create_issue': return { summary: '', type: 'TASK', priority: 'MEDIUM' };
    case 'create_subtask': return { summary: '', type: 'SUBTASK', priority: 'MEDIUM' };
    case 'move_sprint': return { sprintId: '' };
    case 'move_issue_to_sprint': return { sprintId: '' };
    case 'websocket_broadcast': return { eventName: '', payload: '{}' };
    default: return {};
  }
};

export default defineComponent({
  name: 'AutomationActionBuilder',
  components: { Plus, X, GripVertical, Zap },
  props: {
    actions: {
      type: Array as () => any[],
      default: () => []
    },
    projectId: {
      type: String,
      required: true
    }
  },
  emits: ['update:actions'],
  setup(props, { emit }) {
    const localActions = ref<Action[]>(
      (props.actions || []).map((a: any) => ({ ...a, id: a.id || crypto.randomUUID(), params: { ...a.params } }))
    );

    const actionOptions = [
      { value: 'change_status', label: '🔄 Change Status' },
      { value: 'assign_user', label: '👤 Assign User' },
      { value: 'unassign_user', label: '👤 Unassign User' },
      { value: 'add_label', label: '🏷️ Add Label' },
      { value: 'remove_label', label: '🏷️ Remove Label' },
      { value: 'archive_issue', label: '📦 Archive Issue' },
      { value: 'create_issue', label: '➕ Create Issue' },
      { value: 'create_subtask', label: '➕ Create Subtask' },
      { value: 'move_sprint', label: '🚀 Move Sprint' },
      { value: 'move_issue_to_sprint', label: '🚀 Move Issue to Sprint' },
      { value: 'send_notification', label: '🔔 Send Notification' },
      { value: 'send_mention', label: '@ Send Mention' },
      { value: 'websocket_broadcast', label: '📡 WebSocket Broadcast' },
      { value: 'add_comment', label: '💬 Add Comment' },
      { value: 'auto_complete_sprint', label: '✅ Auto Complete Sprint' },
    ];

    const emitUpdate = () => {
      emit('update:actions', localActions.value.map(a => ({
        id: a.id,
        type: a.type,
        params: { ...a.params }
      })));
    };

    const addAction = () => {
      const type = 'change_status';
      localActions.value.push({
        id: crypto.randomUUID(),
        type,
        params: defaultParams(type)
      });
      emitUpdate();
    };

    const removeAction = (index: number) => {
      localActions.value.splice(index, 1);
      emitUpdate();
    };

    const onActionTypeChange = (action: Action) => {
      action.params = defaultParams(action.type);
      emitUpdate();
    };

    watch(() => props.actions, (newVal) => {
      if (JSON.stringify(newVal) !== JSON.stringify(localActions.value)) {
        localActions.value = (newVal || []).map((a: any) => ({
          ...a,
          id: a.id || crypto.randomUUID(),
          params: { ...a.params }
        }));
      }
    }, { deep: true });

    return { localActions, actionOptions, emitUpdate, addAction, removeAction, onActionTypeChange };
  }
});
</script>
