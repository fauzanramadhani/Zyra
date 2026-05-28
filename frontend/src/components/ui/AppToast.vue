<script setup lang="ts">
import { useToastStore, type ToastVariant } from '../../store/toast'

const toastStore = useToastStore()

const variantStyles: Record<ToastVariant, { bg: string; icon: string; border: string }> = {
  success: { bg: 'bg-green-50', icon: '✓', border: 'border-green-200' },
  error: { bg: 'bg-red-50', icon: '✕', border: 'border-red-200' },
  warning: { bg: 'bg-amber-50', icon: '⚠', border: 'border-amber-200' },
  info: { bg: 'bg-blue-50', icon: 'ℹ', border: 'border-blue-200' },
}

const variantText: Record<ToastVariant, string> = {
  success: 'text-green-800',
  error: 'text-red-800',
  warning: 'text-amber-800',
  info: 'text-blue-800',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 right-4 z-[999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 translate-x-4 scale-95"
        enter-to-class="opacity-100 translate-x-0 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-x-0 scale-100"
        leave-to-class="opacity-0 translate-x-4 scale-95"
      >
        <div
          v-for="toast in toastStore.toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg"
          :class="[variantStyles[toast.variant].bg, variantStyles[toast.variant].border]"
        >
          <span class="flex-shrink-0 text-base leading-none mt-0.5" :class="variantText[toast.variant]">
            {{ variantStyles[toast.variant].icon }}
          </span>
          <div class="flex-grow min-w-0">
            <p class="text-sm font-bold" :class="variantText[toast.variant]">{{ toast.title }}</p>
            <p v-if="toast.description" class="text-xs mt-0.5 opacity-80" :class="variantText[toast.variant]">{{ toast.description }}</p>
          </div>
          <button
            @click="toastStore.dismiss(toast.id)"
            class="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition"
            :class="variantText[toast.variant]"
            aria-label="Dismiss"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
