export type Role = 'ADMIN' | 'USER';
export type Status = 'PENDING' | 'COMPLETED';
export interface User { id: string; name: string; email: string; role: Role; active?: boolean; createdAt?: string }
export interface Task { id: string; title: string; description?: string | null; status: Status; ownerId: string; owner: Pick<User, 'id' | 'name'>; createdAt: string; updatedAt: string; completedAt?: string | null }
export interface Summary { total: number; pending: number; completed: number; percentage: number; recent: Task[] }
