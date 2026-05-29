<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  text: string
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}>(), {
  position: 'top',
  delay: 300,
})

const show = ref(false)
let timeout: ReturnType<typeof setTimeout> | null = null

function onEnter() {
  timeout = setTimeout(() => { show.value = true }, props.delay)
}

function onLeave() {
  if (timeout) clearTimeout(timeout)
  show.value = false
}

const positionClasses: Record<string, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}
</script>

<template>
  <div class="relative inline-block" @mouseenter="onEnter" @mouseleave="onLeave" @focus="onEnter" @blur="onLeave">
    <slot />
    <Transition
      enter-active-class="transition duration-150 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-100 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        role="tooltip"
        class="absolute z-[200] px-2.5 py-1.5 text-[11px] font-medium text-white bg-slate-800 rounded-lg shadow-lg whitespace-nowrap pointer-events-none"
        :class="positionClasses[position]"
      >
        {{ text }}
      </div>
    </Transition>
  </div>
</template>
