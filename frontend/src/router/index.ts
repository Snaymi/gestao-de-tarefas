import { createRouter, createWebHistory } from 'vue-router';
import { useSession } from '../stores/session';
import ProtectedLayout from '../layouts/ProtectedLayout.vue';
import LoginPage from '../pages/LoginPage.vue';
import DashboardPage from '../pages/DashboardPage.vue';
import TasksPage from '../pages/TasksPage.vue';
import UsersPage from '../pages/UsersPage.vue';
import AuditPage from '../pages/AuditPage.vue';
import NotFoundPage from '../pages/NotFoundPage.vue';
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'login', component: LoginPage },
    {
      path: '/',
      component: ProtectedLayout,
      children: [
        { path: '', component: DashboardPage },
        { path: 'tarefas', component: TasksPage },
        { path: 'usuarios', component: UsersPage, meta: { admin: true } },
        { path: 'auditoria', component: AuditPage, meta: { admin: true } }
      ]
    },
    { path: '/:pathMatch(.*)*', component: NotFoundPage }
  ]
});

router.beforeEach(to => {
  const { user } = useSession();
  if (user && (to.name === 'login' || (to.meta.admin && user.role !== 'ADMIN'))) return '/';
});

export default router;
