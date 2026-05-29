<script setup lang="ts">
defineProps<{
  show: boolean
  blur?: boolean
}>()

defineEmits<{
  click: []
}>()
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 bg-slate-900/60 z-[90]"
      :class="{ 'backdrop-blur-sm': blur !== false }"
      @click="$emit('click')"
      aria-hidden="true"
    />
  </Transition>
</template>
