<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-tr from-orange-50 via-slate-50 to-orange-100 p-6">
    <!-- Card Container -->
    <div class="w-full max-w-md bg-white dark:bg-slate-900 bg-opacity-80 dark:bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl border border-white dark:border-slate-700 p-8 transition duration-300 hover:shadow-2xl">
      <!-- Brand Logo / Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-md mb-4 text-white text-3xl font-extrabold font-serif">
          🍊
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-slate-100 font-sans">
          <span class="text-zyra-primary">Zyra</span>
        </h1>
        <p class="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">Self-hosted private project collaboration platform</p>
      </div>

      <!-- Error alert -->
      <div v-if="error" class="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
        <span>⚠️</span> {{ error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-5">
        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Email Address</label>
          <input
            type="email"
            v-model="email"
            required
            placeholder="e.g. admin@zyra.local"
            maxlength="255"
            class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-zyra-primary focus:border-transparent bg-white dark:bg-slate-800 dark:text-slate-100 shadow-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1">Password</label>
          <input
            type="password"
            v-model="password"
            required
            placeholder="••••••••"
            maxlength="128"
            class="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-zyra-primary focus:border-transparent bg-white dark:bg-slate-800 dark:text-slate-100 shadow-sm"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading" class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
          Sign In
        </button>
      </form>

      <!-- Footer links -->
      <div class="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 dark:text-slate-400">
        <p>
          Don't have an account yet?
          <router-link to="/register" class="text-zyra-primary font-bold hover:underline">Create an Account</router-link>
        </p>
        <p class="mt-2 text-[10px] text-slate-400 dark:text-slate-500">Default Demo: admin@zyra.local / admin123</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';

export default defineComponent({
  name: 'Login',
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();

    const email = ref('');
    const password = ref('');
    const error = ref('');
    const loading = ref(false);

    const handleLogin = async () => {
      error.value = '';
      loading.value = true;
      try {
        const success = await authStore.login({
          email: email.value,
          password: password.value,
        });

        if (success) {
          router.push('/workspace');
        }
      } catch (err: any) {
        error.value = err.message || 'Invalid credentials. Please try again.';
      } finally {
        loading.value = false;
      }
    };

    return {
      email,
      password,
      error,
      loading,
      handleLogin,
    };
  },
});
</script>
