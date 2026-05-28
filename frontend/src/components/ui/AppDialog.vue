<script setup lang="ts">
import { watch, onMounted, onUnmounted, ref, nextTick } from 'vue'
import AppBackdrop from './AppBackdrop.vue'

export type DialogSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  description?: string
  size?: DialogSize
  persistent?: boolean
  loading?: boolean
  closeOnBackdrop?: boolean
  closeOnEsc?: boolean
}>(), {
  size: 'md',
  persistent: false,
  loading: false,
  closeOnBackdrop: true,
  closeOnEsc: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const dialogRef = ref<HTMLElement | null>(null)

const sizeClasses: Record<DialogSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  full: 'max-w-[90vw] max-h-[90vh]',
}

function close() {
  if (props.persistent || props.loading) return
  emit('update:modelValue', false)
  emit('close')
}

function onBackdropClick() {
  if (props.closeOnBackdrop) close()
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.closeOnEsc && props.modelValue) {
    close()
  }
}

// Body scroll lock
watch(() => props.modelValue, (open) => {
  if (open) {
    document.body.style.overflow = 'hidden'
    nextTick(() => {
      dialogRef.value?.focus()
    })
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <template v-if="modelValue">
      <AppBackdrop :show="true" @click="onBackdropClick" />
      <Transition
        appear
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          class="fixed inset-0 z-[100] flex items-center justify-center p-4"
          @click.self="onBackdropClick"
        >
          <div
            ref="dialogRef"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="title ? 'dialog-title' : undefined"
            :aria-describedby="description ? 'dialog-desc' : undefined"
            tabindex="-1"
            class="relative w-full bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden outline-none"
            :class="sizeClasses[size]"
          >
            <!-- Loading overlay -->
            <div v-if="loading" class="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-xl">
              <div class="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent"></div>
            </div>

            <!-- Header -->
            <div v-if="title || $slots.header" class="px-6 pt-5 pb-3">
              <slot name="header">
                <h2 v-if="title" id="dialog-title" class="text-lg font-bold text-slate-800">{{ title }}</h2>
                <p v-if="description" id="dialog-desc" class="text-xs text-slate-500 mt-1">{{ description }}</p>
              </slot>
            </div>

            <!-- Content -->
            <div class="flex-grow px-6 py-3 overflow-y-auto">
              <slot />
            </div>

            <!-- Footer -->
            <div v-if="$slots.footer" class="px-6 pb-5 pt-3 flex justify-end gap-2 border-t border-slate-100">
              <slot name="footer" :close="close" />
            </div>
          </div>
        </div>
      </Transition>
    </template>
  </Teleport>
</template>
