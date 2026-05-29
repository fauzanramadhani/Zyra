<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  align?: 'left' | 'right'
  width?: string
}>(), {
  align: 'left',
  width: 'w-48',
})

const isOpen = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const activeIndex = ref(-1)

function toggle() {
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    activeIndex.value = -1
    nextTick(() => menuRef.value?.focus())
  }
}

function close() {
  isOpen.value = false
}

function onClickOutside(e: MouseEvent) {
  const target = e.target as Node
  if (!triggerRef.value?.contains(target) && !menuRef.value?.contains(target)) {
    close()
  }
}

function onKeydown(e: KeyboardEvent) {
  if (!isOpen.value) return
  if (e.key === 'Escape') {
    close()
    e.preventDefault()
  }
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="relative inline-block">
    <!-- Trigger -->
    <div ref="triggerRef" @click="toggle">
      <slot name="trigger" :open="isOpen" />
    </div>

    <!-- Menu -->
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95 -translate-y-1"
      enter-to-class="opacity-100 scale-100 translate-y-0"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100 scale-100 translate-y-0"
      leave-to-class="opacity-0 scale-95 -translate-y-1"
    >
      <div
        v-if="isOpen"
        ref="menuRef"
        tabindex="-1"
        role="menu"
        class="absolute z-50 mt-1.5 py-1.5 bg-white dark:bg-zyra-gray-darkCard rounded-xl border border-slate-200 dark:border-zyra-gray-darkBorder shadow-lg outline-none overflow-hidden"
        :class="[width, align === 'right' ? 'right-0' : 'left-0']"
      >
        <slot :close="close" />
      </div>
    </Transition>
  </div>
</template>
