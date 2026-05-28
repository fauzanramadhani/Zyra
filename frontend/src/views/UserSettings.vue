<template>
  <div class="min-h-screen bg-slate-50 py-6 md:py-10 px-4 md:px-6 font-sans">
    <div class="max-w-4xl mx-auto space-y-6 md:space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between pb-6 border-b border-slate-200">
        <div>
          <router-link to="/workspace" class="text-sm font-semibold text-orange-500 hover:underline flex items-center gap-1">
            <span class="text-xs">&larr;</span> Back to Workspace
          </router-link>
          <h1 class="text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">Account Settings</h1>
          <p class="text-sm text-slate-500 mt-1">Manage your public profile, security credentials, active sessions, and appearance preferences.</p>
        </div>
      </div>

      <!-- Tab Buttons -->
      <div class="flex border-b border-slate-200 gap-4 md:gap-6 overflow-x-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="pb-4 text-sm font-bold border-b-2 transition"
          :class="activeTab === tab.id ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-500 hover:text-slate-700'"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content Area -->
      <div class="space-y-6">
        <!-- 1. Profile Settings -->
        <div v-if="activeTab === 'profile'" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <h2 class="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100">Public Profile</h2>
          
          <form @submit.prevent="saveProfile" class="space-y-6">
            <!-- Avatar Edit -->
            <div class="flex items-center gap-6">
              <img :src="profileAvatar" class="w-16 h-16 rounded-full object-cover border border-slate-200 shadow-sm bg-slate-50" />
              <div class="space-y-1">
                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider">Avatar Image</label>
                <div class="flex items-center gap-3">
                  <input type="file" ref="avatarInput" @change="onAvatarChange" accept="image/*" class="hidden" />
                  <button type="button" @click="$refs.avatarInput.click()" class="px-3.5 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition">
                    Upload Avatar
                  </button>
                  <button type="button" v-if="profileForm.avatarUrl || avatarFile" @click="clearAvatar" class="text-xs font-bold text-red-500 hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            </div>

            <!-- Profile Details -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700">First Name</label>
                <input type="text" v-model="profileForm.firstName" required maxlength="50" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700">Last Name</label>
                <input type="text" v-model="profileForm.lastName" required maxlength="50" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700">Username</label>
                <input type="text" v-model="profileForm.username" maxlength="30" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" placeholder="johndoe" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700">Timezone</label>
                <select v-model="profileForm.timezone" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-700 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition">
                  <option value="Asia/Jakarta">Jakarta (GMT+7)</option>
                  <option value="UTC">UTC (GMT+0)</option>
                  <option value="America/New_York">New York (EST/EDT)</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                </select>
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="block text-sm font-semibold text-slate-700">Biography</label>
              <textarea v-model="profileForm.bio" rows="3" maxlength="500" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" placeholder="Tell us about yourself..."></textarea>
            </div>

            <div class="flex justify-end pt-4 border-t border-slate-100">
              <button type="submit" :disabled="saving" class="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition shadow-sm">
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>

        <!-- 2. Security Settings -->
        <div v-if="activeTab === 'security'" class="space-y-6">
          <!-- Password Form -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
            <h2 class="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100">Change Password</h2>
            
            <form @submit.prevent="savePassword" class="space-y-4">
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700">Current Password</label>
                <input type="password" v-model="passwordForm.currentPassword" required maxlength="128" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>
              <div class="space-y-1.5">
                <label class="block text-sm font-semibold text-slate-700">New Password</label>
                <input type="password" v-model="passwordForm.newPassword" required maxlength="128" placeholder="Minimum 6 characters" class="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition" />
              </div>

              <div class="flex justify-end pt-4 border-t border-slate-100">
                <button type="submit" :disabled="savingPassword" class="px-5 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition shadow-sm">
                  {{ savingPassword ? 'Updating...' : 'Update Password' }}
                </button>
              </div>
            </form>
          </div>

          <!-- Active Sessions / Devices list -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
            <h2 class="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100">Active Sessions & Devices</h2>
            <p class="text-xs text-slate-500">Track and revoke other device sessions actively logged into your account.</p>

            <div class="divide-y divide-slate-150 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/20">
              <div v-for="s in sessions" :key="s.id" class="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                <div class="flex items-center gap-3">
                  <span class="text-2xl">💻</span>
                  <div>
                    <p class="text-sm font-bold text-slate-800">{{ s.deviceInfo }}</p>
                    <p class="text-xs text-slate-400">IP: {{ s.ipAddress }} &bull; Logged: {{ formatDate(s.createdAt) }}</p>
                  </div>
                </div>
                <button @click="revokeSession(s.id)" class="text-xs font-bold text-red-500 hover:text-red-600 hover:underline">
                  Revoke Device
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 3. Appearance Settings -->
        <div v-if="activeTab === 'appearance'" class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
          <h2 class="text-lg font-bold text-slate-800 pb-2 border-b border-slate-100">Theme Preferences</h2>
          <p class="text-xs text-slate-500">Choose your premium application theme styling layout.</p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div @click="setTheme('light')" class="p-5 rounded-xl border-2 cursor-pointer transition flex flex-col items-center gap-3" :class="activeTheme === 'light' ? 'border-orange-500 bg-orange-50/20' : 'border-slate-200 hover:border-slate-300 bg-white'">
              <span class="text-3xl">☀️</span>
              <span class="font-bold text-sm text-slate-700">Premium Light Mode</span>
            </div>
            <div @click="setTheme('dark')" class="p-5 rounded-xl border-2 cursor-pointer transition flex flex-col items-center gap-3" :class="activeTheme === 'dark' ? 'border-orange-500 bg-orange-50/20' : 'border-slate-200 hover:border-slate-300 bg-white'">
              <span class="text-3xl">🌙</span>
              <span class="font-bold text-sm text-slate-700">Sleek Dark Mode</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AppConfirmDialog
      :model-value="confirmDialog.show"
      @update:model-value="confirmDialog.show = $event"
      :title="confirmDialog.title"
      :description="confirmDialog.message"
      variant="warning"
      confirm-text="Revoke"
      @confirm="onConfirm"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { useAuthStore } from '../store/auth';
import { useToastStore } from '../store/toast';
import AppConfirmDialog from '../components/ui/AppConfirmDialog.vue';

export default defineComponent({
  name: 'UserSettings',
  components: { AppConfirmDialog },
  setup() {
    const authStore = useAuthStore();
    const toast = useToastStore();
    const activeTab = ref('profile');
    const saving = ref(false);
    const savingPassword = ref(false);
    const avatarFile = ref<File | null>(null);
    const activeTheme = ref('light');

    const tabs = [
      { id: 'profile', label: 'My Profile' },
      { id: 'security', label: 'Security & Sessions' },
      { id: 'appearance', label: 'Appearance' }
    ];

    const profileForm = ref({
      firstName: authStore.user?.firstName || '',
      lastName: authStore.user?.lastName || '',
      username: authStore.user?.username || '',
      timezone: authStore.user?.timezone || 'Asia/Jakarta',
      bio: authStore.user?.bio || '',
      avatarUrl: authStore.user?.avatarUrl || ''
    });

    const passwordForm = ref({
      currentPassword: '',
      newPassword: ''
    });

    const sessions = computed(() => authStore.sessions);

    onMounted(() => {
      authStore.fetchSessions();
    });

    const profileAvatar = computed(() => {
      if (avatarFile.value) {
        return URL.createObjectURL(avatarFile.value);
      }
      return profileForm.value.avatarUrl || 'https://api.dicebear.com/7.x/adventurer/svg?seed=' + profileForm.value.firstName;
    });

    const onAvatarChange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        avatarFile.value = target.files[0];
      }
    };

    const clearAvatar = () => {
      avatarFile.value = null;
      profileForm.value.avatarUrl = '';
    };

    const saveProfile = async () => {
      saving.value = true;
      try {
        const formData = new FormData();
        formData.append('firstName', profileForm.value.firstName);
        formData.append('lastName', profileForm.value.lastName);
        formData.append('username', profileForm.value.username);
        formData.append('timezone', profileForm.value.timezone);
        formData.append('bio', profileForm.value.bio);

        if (avatarFile.value) {
          formData.append('avatar', avatarFile.value);
        } else if (!profileForm.value.avatarUrl) {
          formData.append('removeAvatar', 'true');
        }

        const success = await authStore.updateProfile(formData);
        if (success) {
          toast.success('Profile settings saved successfully!');
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to update profile');
      } finally {
        saving.value = false;
      }
    };

    const savePassword = async () => {
      savingPassword.value = true;
      try {
        const success = await authStore.changePassword(passwordForm.value);
        if (success) {
          toast.success('Password updated successfully. Other device sessions were safely logged out.');
          passwordForm.value.currentPassword = '';
          passwordForm.value.newPassword = '';
          authStore.fetchSessions();
        }
      } catch (err: any) {
        toast.error(err.message || 'Failed to update password');
      } finally {
        savingPassword.value = false;
      }
    };

    const confirmDialog = ref({ show: false, title: '', message: '', action: () => {} });

    const revokeSession = async (id: string) => {
      confirmDialog.value = {
        show: true,
        title: 'Revoke Session',
        message: 'Are you sure you want to revoke this session? That device will be forced to log in again.',
        action: async () => {
          const success = await authStore.revokeSession(id);
          if (success) {
            toast.success('Device session revoked successfully.');
          }
        }
      };
    };

    const onConfirm = async () => {
      confirmDialog.value.show = false;
      await confirmDialog.value.action();
    };

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleString();
    };

    const setTheme = (theme: string) => {
      activeTheme.value = theme;
      toast.info(`Visual theme set to ${theme}.`);
    };

    return {
      activeTab,
      tabs,
      profileForm,
      passwordForm,
      saving,
      savingPassword,
      sessions,
      profileAvatar,
      avatarFile,
      activeTheme,
      onAvatarChange,
      clearAvatar,
      saveProfile,
      savePassword,
      revokeSession,
      formatDate,
      setTheme,
      confirmDialog,
      onConfirm
    };
  }
});
</script>
