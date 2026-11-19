import 'dotenv/config';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';
import type { Actor } from '../auth/auth.types';

describe('regra de exclusão de tarefas (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const service = new TasksService(prisma);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let admin: Actor; let user: Actor; let other: Actor;
  const taskIds: string[] = []; const userIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();
    for (const role of ['ADMIN', 'USER', 'USER'] as const) {
      const created = await prisma.user.create({ data: { name: role, email: `${role}-${userIds.length}-${unique}@test.local`, passwordHash: 'test', role } });
      userIds.push(created.id);
    }
    admin = { id: userIds[0], name: 'Admin', email: '', role: 'ADMIN' };
    user = { id: userIds[1], name: 'User', email: '', role: 'USER' };
    other = { id: userIds[2], name: 'Other', email: '', role: 'USER' };
  });
  afterAll(async () => {
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await prisma.$disconnect();
  });
  async function create(status: 'PENDING' | 'COMPLETED', ownerId = user.id) {
    const task = await prisma.task.create({ data: { title: `Teste ${unique}`, ownerId, status, ...(status === 'COMPLETED' ? { completedAt: new Date() } : {}) } });
    taskIds.push(task.id);
    return task;
  }

  it.each(['USER', 'ADMIN'] as const)('rejeita exclusão de tarefa concluída para %s e preserva o registro', async role => {
    const task = await create('COMPLETED');
    await expect(service.remove(task.id, role === 'ADMIN' ? admin : user)).rejects.toBeInstanceOf(ConflictException);
    expect(await prisma.task.findUnique({ where: { id: task.id } })).not.toBeNull();
  });
  it('exclui tarefa pendente do responsável', async () => {
    const task = await create('PENDING');
    await service.remove(task.id, user);
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
  });
  it('nega exclusão por outro usuário', async () => {
    const task = await create('PENDING');
    await expect(service.remove(task.id, other)).rejects.toBeInstanceOf(ForbiddenException);
    expect(await prisma.task.findUnique({ where: { id: task.id } })).not.toBeNull();
  });
  it('mantém a conclusão como estado final', async () => {
    const task = await create('PENDING');
    await service.complete(task.id, user);
    await expect(service.remove(task.id, admin)).rejects.toBeInstanceOf(ConflictException);
    expect((await prisma.task.findUnique({ where: { id: task.id } }))?.status).toBe('COMPLETED');
  });
});
