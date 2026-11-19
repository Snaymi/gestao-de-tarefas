import { createRouter, createWebHistory } from 'vue-router';
import { useSession } from '../stores/session';
import LoginPage from '../pages/LoginPage.vue';
import DashboardPage from '../pages/DashboardPage.vue';
import TasksPage from '../pages/TasksPage.vue';
import UsersPage from '../pages/UsersPage.vue';
import AuditPage from '../pages/AuditPage.vue';
import NotFoundPage from '../pages/NotFoundPage.vue';
const router = createRouter({ history: createWebHistory(), routes: [
  { path: '/login', component: LoginPage, meta: { public: true } },
  { path: '/', component: DashboardPage },
  { path: '/tarefas', component: TasksPage },
  { path: '/usuarios', component: UsersPage, meta: { admin: true } },
  { path: '/auditoria', component: AuditPage, meta: { admin: true } },
  { path: '/:pathMatch(.*)*', component: NotFoundPage, meta: { public: true } }
] });
router.beforeEach(async to => { const session = useSession(); if (!session.ready) await session.restore(); if (!to.meta.public && !session.user) return '/login'; if (to.meta.admin && session.user?.role !== 'ADMIN') return '/'; if (to.path === '/login' && session.user) return '/'; });
export default router;
