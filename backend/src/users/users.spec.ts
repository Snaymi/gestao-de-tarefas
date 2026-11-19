import { ConflictException, ForbiddenException } from '@nestjs/common';
import { AuditAction, Role } from '@prisma/client';
import { compare } from 'bcryptjs';
import type { Actor } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import type { AuditLogService } from '../audit/audit-log.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const admin: Actor = { id: 'admin-id', name: 'Admin', email: 'admin@example.invalid', role: Role.ADMIN };
const member: Actor = { id: 'user-id', name: 'User', email: 'user@example.invalid', role: Role.USER };
const createdAt = new Date('2026-01-01T00:00:00Z');
const user = { id: member.id, name: member.name, email: member.email, role: Role.USER, active: true, createdAt };

function setup() {
  const transaction = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn()
    }
  };
  const prisma = {
    $transaction: jest.fn((callback: (tx: typeof transaction) => Promise<unknown>) => callback(transaction))
  } as unknown as PrismaService;
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
  const service = new UsersService(prisma, audit);
  return { transaction, prisma, audit, service };
}

describe('gestão de usuários com Prisma simulado', () => {
  it('restringe listagem, criação e atualização ao ADMIN', () => {
    const service = { list: jest.fn(), create: jest.fn(), update: jest.fn() } as unknown as UsersService;
    const controller = new UsersController(service);
    expect(() => controller.list(member)).toThrow(ForbiddenException);
    expect(() => controller.create({ name: 'Novo', email: 'novo@example.invalid', password: 'test-password', role: Role.USER }, member)).toThrow(ForbiddenException);
    expect(() => controller.update(member.id, { active: false }, member)).toThrow(ForbiddenException);
    expect(service.list).not.toHaveBeenCalled();
    controller.list(admin);
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('cria usuário e auditoria na mesma transação, sem retornar hash', async () => {
    const { service, transaction, prisma, audit } = setup();
    transaction.user.findUnique.mockResolvedValue(null);
    transaction.user.create.mockResolvedValue(user);
    const result = await service.create({ name: ' User ', email: 'USER@EXAMPLE.INVALID ', password: 'test-password', role: Role.USER }, admin);
    expect(result).toEqual(user);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    const data = transaction.user.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ name: 'User', email: 'user@example.invalid', role: Role.USER });
    expect(data.passwordHash).not.toBe('test-password');
    await expect(compare('test-password', data.passwordHash)).resolves.toBe(true);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.USER_CREATED, actor: admin }), transaction);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('recusa e-mail duplicado sem gravar usuário nem auditoria', async () => {
    const { service, transaction, audit } = setup();
    transaction.user.findUnique.mockResolvedValue({ id: member.id });
    await expect(service.create({ name: 'Outro', email: member.email, password: 'test-password', role: Role.USER }, admin)).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.user.create).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('impede que ADMIN desative ou rebaixe a própria conta', async () => {
    const { service, transaction, audit } = setup();
    transaction.user.findUnique.mockResolvedValue({ ...user, id: admin.id, role: Role.ADMIN });
    await expect(service.update(admin.id, { active: false }, admin)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.update(admin.id, { role: Role.USER }, admin)).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.user.updateMany).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('detecta atualização concorrente sem gravar auditoria', async () => {
    const { service, transaction, audit } = setup();
    transaction.user.findUnique.mockResolvedValue(user);
    transaction.user.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.update(member.id, { name: 'Novo nome' }, admin)).rejects.toBeInstanceOf(ConflictException);
    expect(audit.record).not.toHaveBeenCalled();
  });
});
