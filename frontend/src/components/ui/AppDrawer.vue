<script setup lang="ts">
import { watch, onMounted, onUnmounted } from 'vue'
import AppBackdrop from './AppBackdrop.vue'

const props = withDefaults(defineProps<{
  modelValue: boolean
  side?: 'left' | 'right'
  width?: string
  title?: string
  persistent?: boolean
}>(), {
  side: 'right',
  width: 'max-w-lg',
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
    <template v-if="modelValue">
      <AppBackdrop :show="true" @click="close" />
      <Transition
        appear
        :enter-active-class="`transition duration-250 ease-out`"
        :enter-from-class="side === 'right' ? 'translate-x-full' : '-translate-x-full'"
        enter-to-class="translate-x-0"
        :leave-active-class="`transition duration-200 ease-in`"
        leave-from-class="translate-x-0"
        :leave-to-class="side === 'right' ? 'translate-x-full' : '-translate-x-full'"
      >
        <div
          role="dialog"
          aria-modal="true"
          class="fixed inset-y-0 z-[100] w-full flex flex-col bg-white shadow-2xl border-slate-200 overflow-hidden"
          :class="[
            width,
            side === 'right' ? 'right-0 border-l' : 'left-0 border-r'
          ]"
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex-shrink-0">
            <slot name="header">
              <h2 class="text-base font-bold text-slate-800">{{ title }}</h2>
            </slot>
            <button
              @click="close"
              class="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Content -->
          <div class="flex-grow overflow-y-auto">
            <slot />
          </div>

          <!-- Footer -->
          <div v-if="$slots.footer" class="px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex-shrink-0">
            <slot name="footer" :close="close" />
          </div>
        </div>
      </Transition>
    </template>
  </Teleport>
</template>
