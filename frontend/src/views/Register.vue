<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-tr from-orange-50 via-slate-50 to-orange-100 p-6">
    <!-- Card Container -->
    <div class="w-full max-w-md bg-white bg-opacity-80 backdrop-blur-md rounded-2xl shadow-xl border border-white p-8 transition duration-300 hover:shadow-2xl">
      <!-- Logo / Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 shadow-md mb-4 text-white text-3xl font-extrabold">
          🍊
        </div>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-800 font-sans">
          Get Started
        </h1>
        <p class="text-sm text-slate-500 mt-2 font-medium">Create your self-hosted private workspace</p>
      </div>

      <!-- Error alert -->
      <div v-if="error" class="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
        <span>⚠️</span> {{ error }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleRegister" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">First Name</label>
            <input
              type="text"
              v-model="firstName"
              required
              placeholder="e.g. Alex"
              maxlength="50"
              class="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-zyra-primary focus:border-transparent bg-white shadow-sm"
            />
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Last Name</label>
            <input
              type="text"
              v-model="lastName"
              required
              placeholder="e.g. Smith"
              maxlength="50"
              class="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm outline-none transition focus:ring-2 focus:ring-zyra-primary focus:border-transparent bg-white shadow-sm"
            />
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Email Address</label>
          <input
            type="email"
            v-model="email"
            required
            maxlength="255"
            placeholder="e.g. alex@example.com"
            class="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-zyra-primary focus:border-transparent bg-white shadow-sm"
          />
        </div>

        <div>
          <label class="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Password</label>
          <input
            type="password"
            v-model="password"
            required
            maxlength="128"
            placeholder="Min 6 characters"
            class="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-zyra-primary focus:border-transparent bg-white shadow-sm"
          />
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 mt-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-lg font-bold text-sm shadow-md hover:shadow-lg transition duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading" class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></span>
          Register & Create Workspace
        </button>
      </form>

      <!-- Footer links -->
      <div class="mt-8 pt-6 border-t border-slate-200 text-center text-xs text-slate-500">
        <p>
          Already have an account?
          <router-link to="/login" class="text-zyra-primary font-bold hover:underline">Log In</router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../store/auth';

export default defineComponent({
  name: 'Register',
  setup() {
    const authStore = useAuthStore();
    const router = useRouter();

    const firstName = ref('');
    const lastName = ref('');
    const email = ref('');
    const password = ref('');
    const error = ref('');
    const loading = ref(false);

    const handleRegister = async () => {
      error.value = '';
      loading.value = true;
      try {
        const success = await authStore.register({
          email: email.value,
          password: password.value,
          firstName: firstName.value,
          lastName: lastName.value,
        });

        if (success) {
          router.push('/workspace');
        }
      } catch (err: any) {
        error.value = err.message || 'Registration failed. Please try again.';
      } finally {
        loading.value = false;
      }
    };

    return {
      firstName,
      lastName,
      email,
      password,
      error,
      loading,
      handleRegister,
    };
  },
});
</script>
