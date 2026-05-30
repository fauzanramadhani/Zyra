<template>
  <div class="relative" ref="containerRef">
    <button
      @click="open = !open"
      type="button"
      :class="[
        'w-full px-3 py-2 border rounded-lg text-sm text-left flex items-center justify-between gap-2 transition outline-none',
        'border-slate-300 dark:border-zyra-gray-darkBorder',
        'bg-white dark:bg-zyra-gray-darkBg',
        'text-slate-800 dark:text-white',
        'focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500',
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
      ]"
      :disabled="disabled"
    >
      <span :class="displayText ? '' : 'text-slate-400 dark:text-slate-500'">
        {{ displayText || placeholder }}
      </span>
      <ChevronDownIcon
        :class="open ? 'rotate-180' : ''"
        class="w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform flex-shrink-0"
      />
    </button>
    <Teleport to="body">
      <Transition name="dropdown">
        <div
          v-if="open"
          class="fixed z-[80] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl overflow-hidden"
          :style="dropdownStyle"
        >
          <div class="max-h-56 overflow-y-auto py-1">
            <div
              v-if="options.length === 0"
              class="px-3 py-2 text-sm text-slate-400 dark:text-slate-500"
            >
              {{ emptyText }}
            </div>
            <button
              v-for="opt in options"
              :key="opt.value"
              @click="selectOption(opt)"
              type="button"
              :class="[
                'w-full text-left px-3 py-2 text-sm transition flex items-center gap-2',
                modelValue === opt.value
                  ? 'bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700',
              ]"
            >
              <CheckIcon
                v-if="modelValue === opt.value"
                class="w-4 h-4 flex-shrink-0"
              />
              <span v-else class="w-4 flex-shrink-0" />
              {{ opt.label }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- Click-away backdrop -->
    <div v-if="open" class="fixed inset-0 z-[79]" @click="open = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { ChevronDown as ChevronDownIcon, Check as CheckIcon } from 'lucide-vue-next';

interface Option {
  value: string;
  label: string;
}

const props = withDefaults(defineProps<{
  modelValue: string;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  emptyText?: string;
}>(), {
  placeholder: 'Select...',
  disabled: false,
  emptyText: 'No options available',
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

const open = ref(false);
const containerRef = ref<HTMLElement | null>(null);
const dropdownStyle = ref({ top: '0px', left: '0px', minWidth: '0px' });

const displayText = computed(() => {
  const selected = props.options.find((o) => o.value === props.modelValue);
  return selected?.label ?? '';
});

function selectOption(opt: Option) {
  emit('update:modelValue', opt.value);
  open.value = false;
}

function updatePosition() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  dropdownStyle.value = {
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    minWidth: `${rect.width}px`,
  };
}

watch(open, async (val) => {
  if (val) {
    await nextTick();
    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
  } else {
    window.removeEventListener('scroll', updatePosition, true);
    window.removeEventListener('resize', updatePosition);
  }
});
</script>

<style scoped>
.dropdown-enter-active {
  transition: all 0.15s ease-out;
}
.dropdown-leave-active {
  transition: all 0.1s ease-in;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
