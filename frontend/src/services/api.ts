import type { AuditAction, AuditLogPageResult, Summary, Task, User, Role } from '../types';

const base = import.meta.env.VITE_API_URL || '/api';
const AUTH_TIMEOUT_MS = 90_000;

export class ApiError extends Error { constructor(message: string, public status: number, public code?: string) { super(message); } }

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(`${base}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
    const data = await response.json().catch(() => null);
    if (options.signal?.aborted) throw options.signal.reason;

    if (!response.ok) {
      const message = data?.message;
      throw new ApiError(
        Array.isArray(message) ? message.join(' ') : typeof message === 'string' ? message : 'Não foi possível concluir a operação.',
        response.status,
        typeof data?.code === 'string' ? data.code : undefined
      );
    }
    if (data === null) throw new ApiError('Resposta inválida do servidor.', 502);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Não foi possível conectar à API. Tente novamente.', 0);
  }
}

async function authRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);
  try {
    return await request<T>(path, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestUser(path: string, options?: RequestInit): Promise<User> {
  const user = await authRequest<Partial<User>>(path, options);
  if (
    typeof user.id !== 'string' || typeof user.name !== 'string' || typeof user.email !== 'string'
    || (user.role !== 'ADMIN' && user.role !== 'USER')
  ) {
    throw new ApiError('Resposta inválida do servidor.', 502);
  }
  return user as User;
}

export const api = {
  login: (email: string, password: string) => requestUser('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => authRequest<{ message: string }>('/auth/logout', { method: 'POST' }),
  me: () => requestUser('/auth/me', { cache: 'no-store' }),
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
