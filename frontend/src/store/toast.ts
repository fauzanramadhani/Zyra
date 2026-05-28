import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title: string
  description?: string
  variant: ToastVariant
  duration: number
}

export const useToastStore = defineStore('toast', () => {
  const toasts = ref<Toast[]>([])

  function show(options: { title: string; description?: string; variant?: ToastVariant; duration?: number }) {
    const toast: Toast = {
      id: crypto.randomUUID(),
      title: options.title,
      description: options.description,
      variant: options.variant || 'info',
      duration: options.duration || 4000,
    }
    toasts.value.push(toast)

    setTimeout(() => {
      dismiss(toast.id)
    }, toast.duration)
  }

  function dismiss(id: string) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function success(title: string, description?: string) {
    show({ title, description, variant: 'success' })
  }

  function error(title: string, description?: string) {
    show({ title, description, variant: 'error' })
  }

  function warning(title: string, description?: string) {
    show({ title, description, variant: 'warning' })
  }

  function info(title: string, description?: string) {
    show({ title, description, variant: 'info' })
  }

  return { toasts, show, dismiss, success, error, warning, info }
})
