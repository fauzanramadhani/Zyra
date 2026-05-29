<script setup lang="ts">
import { ref } from 'vue'
import AppDialog from './AppDialog.vue'

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success'

const props = withDefaults(defineProps<{
  modelValue: boolean
  title?: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: ConfirmVariant
  loading?: boolean
}>(), {
  title: 'Are you sure?',
  description: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger',
  loading: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const variantStyles: Record<ConfirmVariant, { icon: string; btnClass: string; iconBg: string }> = {
  danger: {
    icon: '🗑️',
    btnClass: 'bg-red-500 hover:bg-red-600 text-white',
    iconBg: 'bg-red-50 border-red-200',
  },
  warning: {
    icon: '⚠️',
    btnClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    iconBg: 'bg-amber-50 border-amber-200',
  },
  info: {
    icon: 'ℹ️',
    btnClass: 'bg-blue-500 hover:bg-blue-600 text-white',
    iconBg: 'bg-blue-50 border-blue-200',
  },
  success: {
    icon: '✓',
    btnClass: 'bg-green-500 hover:bg-green-600 text-white',
    iconBg: 'bg-green-50 border-green-200',
  },
}

function close() {
  emit('update:modelValue', false)
}

function onConfirm() {
  emit('confirm')
}

function onCancel() {
  emit('cancel')
  close()
}
</script>

<template>
  <AppDialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" size="sm" :loading="loading" :persistent="loading">
    <div class="flex flex-col items-center text-center py-2">
      <div class="w-12 h-12 rounded-full flex items-center justify-center border text-xl mb-4" :class="variantStyles[variant].iconBg">
        {{ variantStyles[variant].icon }}
      </div>
      <h3 class="text-base font-bold text-slate-800 dark:text-white mb-1">{{ title }}</h3>
      <p v-if="description" class="text-sm text-slate-500 dark:text-slate-400 max-w-xs">{{ description }}</p>
    </div>

    <template #footer>
      <button
        @click="onCancel"
        :disabled="loading"
        class="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition disabled:opacity-50"
      >
        {{ cancelText }}
      </button>
      <button
        @click="onConfirm"
        :disabled="loading"
        class="px-4 py-2 text-sm font-bold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-2"
        :class="variantStyles[variant].btnClass"
      >
        <span v-if="loading" class="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></span>
        {{ confirmText }}
      </button>
    </template>
  </AppDialog>
</template>
