<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import AppBackdrop from './AppBackdrop.vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  side?: 'bottom' | 'top'
  title?: string
  persistent?: boolean
}>(), {
  side: 'bottom',
  persistent: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

function close() {
  if (props.persistent) return
  emit('update:modelValue', false)
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) close()
}

watch(() => props.modelValue, (open) => {
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <AppBackdrop :show="modelValue" @click="close" />
    <Transition
      :enter-active-class="`transition duration-250 ease-out`"
      :enter-from-class="side === 'bottom' ? 'translate-y-full' : '-translate-y-full'"
      enter-to-class="translate-y-0"
      :leave-active-class="`transition duration-200 ease-in`"
      leave-from-class="translate-y-0"
      :leave-to-class="side === 'bottom' ? 'translate-y-full' : '-translate-y-full'"
    >
      <div
        v-if="modelValue"
        role="dialog"
        aria-modal="true"
        class="fixed z-[100] left-0 right-0 bg-white shadow-2xl border-slate-200 rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden"
        :class="[side === 'bottom' ? 'bottom-0 border-t' : 'top-0 border-b rounded-t-none rounded-b-2xl']"
      >
        <!-- Drag handle -->
        <div class="flex justify-center py-2 flex-shrink-0">
          <div class="w-10 h-1 rounded-full bg-slate-300"></div>
        </div>

        <!-- Header -->
        <div v-if="title || $slots.header" class="px-6 pb-3 flex items-center justify-between flex-shrink-0">
          <slot name="header">
            <h2 class="text-base font-bold text-slate-800">{{ title }}</h2>
          </slot>
          <button @click="close" class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition" aria-label="Close">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Content -->
        <div class="flex-grow overflow-y-auto px-6 pb-6">
          <slot />
        </div>

        <!-- Footer -->
        <div v-if="$slots.footer" class="px-6 py-4 border-t border-slate-200 flex-shrink-0">
          <slot name="footer" :close="close" />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
