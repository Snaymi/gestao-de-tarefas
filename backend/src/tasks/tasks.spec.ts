import 'dotenv/config';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TasksService } from './tasks.service';
import type { Actor } from '../auth/auth.types';

describe('regra de exclusão de tarefas (PostgreSQL)', () => {
  const prisma = new PrismaService();
  const service = new TasksService(prisma);
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let admin: Actor; let user: Actor; let other: Actor;
  const taskIds: string[] = []; const userIds: string[] = [];

  function assertLocalDatabase() {
    const value = process.env.DATABASE_URL;
    if (!value) throw new Error('DATABASE_URL local é obrigatória para testes de integração.');
    let hostname: string;
    try { hostname = new URL(value).hostname.toLowerCase(); }
    catch { throw new Error('DATABASE_URL de teste inválida.'); }
    if (!['localhost', '127.0.0.1', '[::1]'].includes(hostname)) {
      throw new Error('Testes de integração só podem usar PostgreSQL local.');
    }
  }

  beforeAll(async () => {
    assertLocalDatabase();
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
    assertLocalDatabase();
    await prisma.task.deleteMany({ where: { id: { in: taskIds } } });
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
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

  it('persiste criação, atualização e conclusão com auditoria atômica', async () => {
    const task = await service.create({ title: ` Fluxo ${unique} `, description: ' Inicial ' }, user);
    taskIds.push(task.id);
    expect((await prisma.task.findUnique({ where: { id: task.id } }))?.title).toBe(`Fluxo ${unique}`);
    expect(await prisma.auditLog.count({ where: { entityId: task.id, action: AuditAction.TASK_CREATED } })).toBe(1);

    await service.update(task.id, { title: `Atualizada ${unique}`, description: 'Revisada' }, user);
    expect((await prisma.task.findUnique({ where: { id: task.id } }))?.description).toBe('Revisada');
    expect(await prisma.auditLog.count({ where: { entityId: task.id, action: AuditAction.TASK_UPDATED } })).toBe(1);

    await service.complete(task.id, user);
    expect((await prisma.task.findUnique({ where: { id: task.id } }))?.status).toBe('COMPLETED');
    expect(await prisma.auditLog.count({ where: { entityId: task.id, action: AuditAction.TASK_COMPLETED } })).toBe(1);
    await expect(service.remove(task.id, admin)).rejects.toBeInstanceOf(ConflictException);
    expect(await prisma.task.findUnique({ where: { id: task.id } })).not.toBeNull();
    expect(await prisma.auditLog.count({ where: { entityId: task.id, action: AuditAction.TASK_DELETED } })).toBe(0);
  });

  it('persiste exclusão de tarefa pendente e seu registro de auditoria', async () => {
    const task = await service.create({ title: `Excluir ${unique}` }, user);
    taskIds.push(task.id);
    await service.remove(task.id, user);
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
    expect(await prisma.auditLog.count({ where: { entityId: task.id, action: AuditAction.TASK_DELETED } })).toBe(1);
  });
});
