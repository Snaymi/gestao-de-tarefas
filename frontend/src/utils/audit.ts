import type { AuditAction } from '../types';

export const auditActionLabels: Record<AuditAction, string> = {
  LOGIN_SUCCEEDED: 'Login realizado',
  LOGIN_FAILED: 'Login não realizado',
  LOGIN_BLOCKED_INACTIVE: 'Acesso bloqueado',
  LOGOUT: 'Logout',
  TASK_CREATED: 'Tarefa criada',
  TASK_UPDATED: 'Tarefa atualizada',
  TASK_COMPLETED: 'Tarefa concluída',
  TASK_DELETED: 'Tarefa excluída',
  USER_CREATED: 'Usuário cadastrado',
  USER_UPDATED: 'Usuário atualizado',
  USER_ACTIVATED: 'Conta ativada',
  USER_DEACTIVATED: 'Conta desativada'
};

export const auditActionOptions = Object.entries(auditActionLabels) as [AuditAction, string][];
