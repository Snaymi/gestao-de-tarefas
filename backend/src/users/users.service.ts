import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Actor } from '../auth/auth.types';
import { AuditLogService } from '../audit/audit-log.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const publicUser = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogService
  ) {}

  list() {
    return this.prisma.user.findMany({ select: publicUser, orderBy: { createdAt: 'desc' } });
  }

  async find(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUser });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async create(dto: CreateUserDto, actor: Actor) {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await hash(dto.password, 12);
    return this.prisma.$transaction(async transaction => {
      if (await transaction.user.findUnique({ where: { email }, select: { id: true } })) {
        throw new ConflictException('Este e-mail já está cadastrado.');
      }

      const user = await transaction.user.create({
        data: { name: dto.name.trim(), email, passwordHash, role: dto.role },
        select: publicUser
      });
      await this.audit.record({
        actor,
        action: AuditAction.USER_CREATED,
        entityType: AuditEntityType.USER,
        entityId: user.id,
        entityLabel: user.name,
        summary: `Cadastrou o usuário "${user.name}".`,
        details: { email: user.email, role: user.role, active: user.active },
        createdAt: user.createdAt
      }, transaction);
      return user;
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: Actor) {
    return this.prisma.$transaction(async transaction => {
      const current = await transaction.user.findUnique({ where: { id }, select: publicUser });
      if (!current) throw new NotFoundException('Usuário não encontrado.');
      if (id === actor.id && (dto.active === false || (dto.role && dto.role !== 'ADMIN'))) {
        throw new ForbiddenException('Você não pode remover seu próprio acesso administrativo.');
      }

      const data = {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {})
      };
      const result = await transaction.user.updateMany({
        where: { id, name: current.name, role: current.role, active: current.active },
        data
      });
      if (!result.count) {
        throw new ConflictException('Este usuário foi alterado por outra pessoa. Atualize a tela e tente novamente.');
      }

      const updated = await transaction.user.findUnique({ where: { id }, select: publicUser });
      if (!updated) throw new NotFoundException('Usuário não encontrado.');
      const changes: Prisma.InputJsonObject = {
        ...(current.name !== updated.name ? { name: { before: current.name, after: updated.name } } : {}),
        ...(current.role !== updated.role ? { role: { before: current.role, after: updated.role } } : {}),
        ...(current.active !== updated.active ? { active: { before: current.active, after: updated.active } } : {})
      };
      if (!Object.keys(changes).length) return updated;

      const action = current.active !== updated.active
        ? updated.active ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED
        : AuditAction.USER_UPDATED;
      const summary = action === AuditAction.USER_ACTIVATED
        ? `Ativou a conta de "${updated.name}".`
        : action === AuditAction.USER_DEACTIVATED
          ? `Desativou a conta de "${updated.name}".`
          : `Atualizou os dados de "${updated.name}".`;

      await this.audit.record({
        actor,
        action,
        entityType: AuditEntityType.USER,
        entityId: updated.id,
        entityLabel: updated.name,
        summary,
        details: { email: updated.email, changes }
      }, transaction);
      return updated;
    });
  }
}
