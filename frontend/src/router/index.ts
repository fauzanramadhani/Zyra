import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '../store/auth';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue'),
    meta: { guestOnly: true },
  },
  {
    path: '/workspace',
    name: 'Workspace',
    component: () => import('../views/Workspace.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/account',
    name: 'AccountSettings',
    component: () => import('../views/UserSettings.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/workspace-settings',
    name: 'WorkspaceSettings',
    component: () => import('../views/WorkspaceSettings.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/notifications',
    name: 'NotificationInbox',
    component: () => import('../views/NotificationInbox.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/project/:projectId',
    component: () => import('../views/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: { name: 'Board' },
      },
      {
        path: 'board',
        name: 'Board',
        component: () => import('../views/Board.vue'),
      },
      {
        path: 'backlog',
        name: 'Backlog',
        component: () => import('../views/Backlog.vue'),
      },
      {
        path: 'analytics',
        name: 'Analytics',
        component: () => import('../views/Analytics.vue'),
      },
      {
        path: 'import',
        name: 'Import',
        component: () => import('../views/Import.vue'),
      },
      {
        path: 'settings',
        name: 'ProjectSettings',
        component: () => import('../views/ProjectSettings.vue'),
      },
      {
        path: 'trash',
        name: 'TrashBin',
        component: () => import('../views/TrashBin.vue'),
      },
      {
        path: 'releases',
        name: 'Releases',
        component: () => import('../views/Releases.vue'),
      },
      {
        path: 'automation',
        name: 'Automation',
        component: () => import('../views/Automation.vue'),
      },
      {
        path: 'templates',
        name: 'Templates',
        component: () => import('../views/Templates.vue'),
      },
      {
        path: 'roadmap',
        name: 'Roadmap',
        component: () => import('../views/Roadmap.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/workspace',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Navigation Route Guards
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Try loading active user session once if not loaded yet
  if (!authStore.user) {
    await authStore.fetchMe();
  }

  const isAuthenticated = authStore.isAuthenticated;

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else if (to.meta.guestOnly && isAuthenticated) {
    next('/workspace');
  } else {
    next();
  }
});

export default router;
