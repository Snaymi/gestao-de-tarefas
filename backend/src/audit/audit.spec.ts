import { ForbiddenException } from '@nestjs/common';
import { AuditAction, Role } from '@prisma/client';
import type { Actor } from '../auth/auth.types';
import type { PrismaService } from '../prisma/prisma.service';
import { AuditController } from './audit.controller';
import { AuditLogService } from './audit-log.service';

const admin: Actor = { id: 'admin-id', name: 'Admin', email: 'admin@example.invalid', role: Role.ADMIN };
const member: Actor = { id: 'user-id', name: 'User', email: 'user@example.invalid', role: Role.USER };

describe('auditoria com Prisma simulado', () => {
  it('permite consulta ao ADMIN e bloqueia USER', () => {
    const service = { list: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }) } as unknown as AuditLogService;
    const controller = new AuditController(service);
    expect(() => controller.list(member, { page: 1, pageSize: 10 })).toThrow(ForbiddenException);
    expect(service.list).not.toHaveBeenCalled();
    controller.list(admin, { page: 1, pageSize: 10 });
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it('filtra e pagina eventos persistidos, com ordenação estável', async () => {
    const entry = { id: 'audit-id', action: AuditAction.USER_CREATED, createdAt: new Date() };
    const count = jest.fn().mockResolvedValue(12);
    const findMany = jest.fn().mockResolvedValue([entry]);
    const prisma = { auditLog: { count, findMany } } as unknown as PrismaService;
    const service = new AuditLogService(prisma);
    const result = await service.list({ page: 2, pageSize: 5, action: AuditAction.USER_CREATED, search: '  admin  ' });
    expect(result).toEqual({ items: [entry], page: 2, pageSize: 5, total: 12, totalPages: 3 });
    const where = count.mock.calls[0][0].where;
    expect(where.action).toBe(AuditAction.USER_CREATED);
    expect(where.OR[0].actorName.contains).toBe('admin');
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where, skip: 5, take: 5, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }));
  });

  it('grava o ator e a ação pelo cliente da transação fornecido', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'audit-id' });
    const transaction = { auditLog: { create } };
    const prisma = { auditLog: { create: jest.fn() } } as unknown as PrismaService;
    const service = new AuditLogService(prisma);
    await service.record({ actor: admin, action: AuditAction.USER_CREATED, entityType: 'USER', summary: 'Usuário criado.' }, transaction as never);
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ actorId: admin.id, actorRole: Role.ADMIN, action: AuditAction.USER_CREATED }) });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});
