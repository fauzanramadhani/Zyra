<template>
  <router-view />
  <AppModalContainer />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import AppModalContainer from './components/ui/AppModalContainer.vue';

export default defineComponent({
  name: 'App',
  components: { AppModalContainer },
});
</script>
