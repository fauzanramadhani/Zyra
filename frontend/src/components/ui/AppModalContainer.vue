<script setup lang="ts">
/**
 * AppModalContainer — mount this once in App.vue.
 * Provides the centralized toast rendering and a teleport target for modals.
 */
import AppToast from './AppToast.vue'
</script>

<template>
  <!-- Global toast notifications -->
  <AppToast />
  <!-- Teleport target for nested modals (optional usage) -->
  <div id="modal-root"></div>
</template>
