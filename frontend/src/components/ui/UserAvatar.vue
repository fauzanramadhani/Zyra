<template>
  <img
    v-if="src && !hasError"
    :src="src"
    :class="[sizeClass, 'rounded-full object-cover flex-shrink-0 border border-slate-100 dark:border-slate-700 shadow-sm']"
    @error="hasError = true"
    alt="User Avatar"
  />
  <div
    v-else
    :class="[
      sizeClass,
      'rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white select-none text-[10px] uppercase shadow-sm'
    ]"
    :style="{ backgroundColor: avatarColor }"
  >
    {{ initials }}
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch } from 'vue';

export default defineComponent({
  name: 'UserAvatar',
  props: {
    src: {
      type: String,
      default: ''
    },
    firstName: {
      type: String,
      default: ''
    },
    lastName: {
      type: String,
      default: ''
    },
    sizeClass: {
      type: String,
      default: 'w-8 h-8'
    }
  },
  setup(props) {
    const hasError = ref(false);

    // Watch src in case it changes dynamically
    watch(() => props.src, () => {
      hasError.value = false;
    });

    const initials = computed(() => {
      const f = props.firstName.trim().charAt(0);
      const l = props.lastName.trim().charAt(0);
      if (f && l) return `${f}${l}`;
      if (f) return f;
      if (l) return l;
      return '?';
    });

    const avatarColor = computed(() => {
      const name = `${props.firstName} ${props.lastName}`.trim() || '?';
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = Math.abs(hash % 360);
      return `hsl(${hue}, 60%, 45%)`; // Premium HSL color
    });

    return {
      hasError,
      initials,
      avatarColor
    };
  }
});
</script>
