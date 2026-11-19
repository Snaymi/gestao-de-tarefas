import type { AuditAction, AuditLogPageResult, Summary, Task, User, Role } from '../types';

const base = import.meta.env.VITE_API_URL || '/api';
export class ApiError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try { response = await fetch(`${base}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...options }); }
  catch { throw new ApiError('Não foi possível conectar à API. Tente novamente.', 0); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(Array.isArray(data.message) ? data.message.join(' ') : data.message || 'Não foi possível concluir a operação.', response.status, typeof data.code === 'string' ? data.code : undefined);
  return data as T;
}
export const api = {
  login: (email: string, password: string) => request<User>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<{ message: string }>('/auth/logout', { method: 'POST' }),
  me: () => request<User>('/auth/me'),
  tasks: (search = '', status = '') => request<Task[]>(`/tasks?${new URLSearchParams({ search, ...(status ? { status } : {}) })}`),
  task: (id: string) => request<Task>(`/tasks/${id}`),
  createTask: (body: { title: string; description?: string; ownerId?: string }) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  updateTask: (id: string, body: { title: string; description?: string; ownerId?: string }) => request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  completeTask: (id: string) => request<Task>(`/tasks/${id}/complete`, { method: 'PATCH' }),
  deleteTask: (id: string) => request<{ message: string }>(`/tasks/${id}`, { method: 'DELETE' }),
  summary: () => request<Summary>('/dashboard/summary', { cache: 'no-store' }),
  auditLogs: (search = '', action: AuditAction | '' = '', page = 1, pageSize = 10) => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (search.trim()) query.set('search', search.trim());
    if (action) query.set('action', action);
    return request<AuditLogPageResult>(`/audit?${query.toString()}`, { cache: 'no-store' });
  },
  users: () => request<User[]>('/users'),
  createUser: (body: { name: string; email: string; password: string; role: Role }) => request<User>('/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: { name?: string; role?: Role; active?: boolean }) => request<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
};
