export type Role = 'ADMIN' | 'USER';
export type Status = 'PENDING' | 'COMPLETED';
export interface User { id: string; name: string; email: string; role: Role; active?: boolean; createdAt?: string }
export interface Task { id: string; title: string; description?: string | null; status: Status; ownerId: string; owner: Pick<User, 'id' | 'name'>; createdAt: string; updatedAt: string; completedAt?: string | null }
export interface Summary { total: number; pending: number; completed: number; percentage: number; recent: Task[] }
export const auditActions = [
  'LOGIN_SUCCEEDED', 'LOGIN_FAILED', 'LOGIN_BLOCKED_INACTIVE', 'LOGOUT',
  'TASK_CREATED', 'TASK_UPDATED', 'TASK_COMPLETED', 'TASK_DELETED',
  'USER_CREATED', 'USER_UPDATED', 'USER_ACTIVATED', 'USER_DEACTIVATED'
] as const;
export type AuditAction = typeof auditActions[number];
export type AuditEntityType = 'AUTH' | 'TASK' | 'USER';
export interface AuditLog {
  id: string;
  actorId: string | null;
  actorName: string;
  actorEmail: string | null;
  actorRole: Role | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string | null;
  entityLabel: string | null;
  summary: string;
  details: Record<string, unknown> | null;
  createdAt: string;
}
export interface AuditLogPageResult {
  items: AuditLog[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
