import { Injectable } from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { Actor } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { AuditQueryDto } from './audit-query.dto';

export type AuditRecord = {
  actor?: Actor | null;
  actorName?: string;
  actorEmail?: string | null;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  entityLabel?: string | null;
  summary: string;
  details?: Prisma.InputJsonValue;
  createdAt?: Date;
};

function toAuditInput(entry: AuditRecord): Prisma.AuditLogUncheckedCreateInput {
  return {
    actorId: entry.actor?.id ?? null,
    actorName: entry.actor?.name ?? entry.actorName ?? 'Visitante',
    actorEmail: entry.actor?.email ?? entry.actorEmail ?? null,
    actorRole: entry.actor?.role ?? null,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId ?? null,
    entityLabel: entry.entityLabel ?? null,
    summary: entry.summary,
    ...(entry.details !== undefined ? { details: entry.details } : {}),
    ...(entry.createdAt ? { createdAt: entry.createdAt } : {})
  };
}

export function recordAudit(entry: AuditRecord, transaction: Prisma.TransactionClient) {
  return transaction.auditLog.create({ data: toAuditInput(entry) });
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  record(entry: AuditRecord, transaction?: Prisma.TransactionClient) {
    const data = toAuditInput(entry);
    if (transaction) return transaction.auditLog.create({ data });
    return this.prisma.auditLog.create({ data });
  }

  async list(query: AuditQueryDto) {
    const search = query.search?.trim();
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(search ? {
        OR: [
          { actorName: { contains: search, mode: 'insensitive' } },
          { actorEmail: { contains: search, mode: 'insensitive' } },
          { entityLabel: { contains: search, mode: 'insensitive' } },
          { summary: { contains: search, mode: 'insensitive' } }
        ]
      } : {})
    };
    const pageSize = query.pageSize || 10;
    const total = await this.prisma.auditLog.count({ where });
    const totalPages = Math.ceil(total / pageSize);
    const page = totalPages ? Math.min(query.page || 1, totalPages) : 1;
    const items = await this.prisma.auditLog.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
    });

    return {
      items,
      page,
      pageSize,
      total,
      totalPages
    };
  }
}
