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
    path: '/workspace/goals',
    name: 'WorkspaceGoals',
    component: () => import('../views/Goals.vue'),
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
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
      },
      {
        path: 'workflows',
        name: 'Workflows',
        component: () => import('../views/Workflow.vue'),
      },
      {
        path: 'git',
        name: 'GitIntegration',
        component: () => import('../views/GitIntegration.vue'),
      },
      {
        path: 'recurring',
        name: 'RecurringIssues',
        component: () => import('../views/RecurringIssues.vue'),
      },
      {
        path: 'sla',
        name: 'Sla',
        component: () => import('../views/Sla.vue'),
      },
      {
        path: 'goals',
        name: 'Goals',
        component: () => import('../views/Goals.vue'),
      },
      {
        path: 'approvals',
        name: 'Approvals',
        component: () => import('../views/Approvals.vue'),
      },
      {
        path: 'wiki',
        name: 'Wiki',
        component: () => import('../views/Wiki.vue'),
      },
      {
        path: 'forms',
        name: 'PublicForms',
        component: () => import('../views/PublicForms.vue'),
      },
      {
        path: 'email-inbox',
        name: 'EmailInbox',
        component: () => import('../views/EmailInbox.vue'),
      },
      {
        path: 'chat-integrations',
        name: 'ChatIntegrations',
        component: () => import('../views/ChatIntegrations.vue'),
      },
      {
        path: 'timesheet',
        name: 'Timesheet',
        component: () => import('../views/Timesheet.vue'),
      },
      {
        path: 'gantt',
        name: 'Gantt',
        component: () => import('../views/Gantt.vue'),
      },
      {
        path: 'ai',
        name: 'AiAssistant',
        component: () => import('../views/AiAssistant.vue'),
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
