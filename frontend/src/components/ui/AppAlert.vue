<script setup lang="ts">
export type AlertVariant = 'info' | 'warning' | 'success' | 'danger'

const props = withDefaults(defineProps<{
  variant?: AlertVariant
  dismissible?: boolean
  title?: string
}>(), {
  variant: 'info',
  dismissible: false,
})

const emit = defineEmits<{
  dismiss: []
}>()

const variantClasses: Record<AlertVariant, { wrapper: string; icon: string }> = {
  info: {
    wrapper: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: 'ℹ️',
  },
  warning: {
    wrapper: 'bg-amber-50 border-amber-200 text-amber-800',
    icon: '⚠️',
  },
  success: {
    wrapper: 'bg-green-50 border-green-200 text-green-800',
    icon: '✓',
  },
  danger: {
    wrapper: 'bg-red-50 border-red-200 text-red-800',
    icon: '✕',
  },
}
</script>

<template>
  <div
    role="alert"
    class="flex items-start gap-3 px-4 py-3 rounded-xl border text-sm"
    :class="variantClasses[variant].wrapper"
  >
    <span class="flex-shrink-0 text-base leading-none mt-0.5">{{ variantClasses[variant].icon }}</span>
    <div class="flex-grow min-w-0">
      <p v-if="title" class="font-bold text-sm mb-0.5">{{ title }}</p>
      <div class="text-xs opacity-90">
        <slot />
      </div>
    </div>
    <button
      v-if="dismissible"
      @click="$emit('dismiss')"
      class="flex-shrink-0 p-0.5 rounded hover:bg-black/5 transition"
      aria-label="Dismiss"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
    <div v-if="$slots.action" class="flex-shrink-0">
      <slot name="action" />
    </div>
  </div>
</template>
