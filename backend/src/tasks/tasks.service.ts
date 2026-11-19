import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma, TaskStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor } from '../auth/auth.types';
import { recordAudit } from '../audit/audit-log.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

type TaskWithOwner = Prisma.TaskGetPayload<{
  include: { owner: { select: { id: true; name: true } } }
}>;
type TaskClient = PrismaService | Prisma.TransactionClient;

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  list(actor: Actor, query: TaskQueryDto) {
    return this.prisma.task.findMany({
      where: {
        ...(actor.role === 'USER' ? { ownerId: actor.id } : {}),
        ...(query.status ? { status: query.status } : {}),
        ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {})
      },
      include: { owner: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  private findIn(client: TaskClient, id: string) {
    return client.task.findUnique({
      where: { id },
      include: { owner: { select: { id: true, name: true } } }
    });
  }

  private assertAccess(task: TaskWithOwner | null, actor: Actor): asserts task is TaskWithOwner {
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    if (actor.role !== 'ADMIN' && task.ownerId !== actor.id) {
      throw new ForbiddenException('Você não tem acesso a esta tarefa.');
    }
  }

  async find(id: string, actor: Actor) {
    const task = await this.findIn(this.prisma, id);
    this.assertAccess(task, actor);
    return task;
  }

  async create(dto: CreateTaskDto, actor: Actor) {
    const ownerId = actor.role === 'ADMIN' && dto.ownerId ? dto.ownerId : actor.id;
    return this.prisma.$transaction(async transaction => {
      const owner = await transaction.user.findUnique({
        where: { id: ownerId },
        select: { id: true, name: true, active: true }
      });
      if (!owner?.active) throw new NotFoundException('Responsável não encontrado ou inativo.');

      const task = await transaction.task.create({
        data: { title: dto.title.trim(), description: dto.description?.trim(), ownerId },
        include: { owner: { select: { id: true, name: true } } }
      });
      await recordAudit({
        actor,
        action: AuditAction.TASK_CREATED,
        entityType: AuditEntityType.TASK,
        entityId: task.id,
        entityLabel: task.title,
        summary: `Criou a tarefa "${task.title}".`,
        details: {
          description: task.description,
          owner: { id: task.ownerId, name: task.owner.name },
          status: task.status
        },
        createdAt: task.createdAt
      }, transaction);
      return task;
    });
  }

  async update(id: string, dto: UpdateTaskDto, actor: Actor) {
    return this.prisma.$transaction(async transaction => {
      const task = await this.findIn(transaction, id);
      this.assertAccess(task, actor);
      if (task.status === TaskStatus.COMPLETED) {
        throw new ConflictException('Tarefas concluídas não podem ser alteradas.');
      }
      if (dto.ownerId && actor.role !== 'ADMIN') {
        throw new ForbiddenException('Apenas administradores podem trocar o responsável.');
      }

      const title = dto.title?.trim();
      const description = dto.description?.trim();
      let nextOwner = task.owner;
      if (dto.ownerId && dto.ownerId !== task.ownerId) {
        const owner = await transaction.user.findUnique({
          where: { id: dto.ownerId },
          select: { id: true, name: true, active: true }
        });
        if (!owner?.active) throw new NotFoundException('Responsável não encontrado ou inativo.');
        nextOwner = { id: owner.id, name: owner.name };
      }

      const changes: Prisma.InputJsonObject = {
        ...(title !== undefined && title !== task.title ? { title: { before: task.title, after: title } } : {}),
        ...(description !== undefined && description !== (task.description ?? '') ? { description: { before: task.description, after: description } } : {}),
        ...(dto.ownerId && dto.ownerId !== task.ownerId ? {
          owner: {
            before: { id: task.ownerId, name: task.owner.name },
            after: { id: nextOwner.id, name: nextOwner.name }
          }
        } : {})
      };
      if (!Object.keys(changes).length) return task;

      const result = await transaction.task.updateMany({
        where: {
          id,
          status: TaskStatus.PENDING,
          updatedAt: task.updatedAt,
          ...(actor.role === 'USER' ? { ownerId: actor.id } : {})
        },
        data: {
          ...(title !== undefined ? { title } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(dto.ownerId ? { ownerId: dto.ownerId } : {})
        }
      });
      if (!result.count) {
        const latest = await this.findIn(transaction, id);
        this.assertAccess(latest, actor);
        if (latest.status === TaskStatus.COMPLETED) {
          throw new ConflictException('Tarefas concluídas não podem ser alteradas.');
        }
        throw new ConflictException('Esta tarefa foi alterada por outra pessoa. Atualize a tela e tente novamente.');
      }

      const updated = await this.findIn(transaction, id);
      this.assertAccess(updated, actor);
      await recordAudit({
        actor,
        action: AuditAction.TASK_UPDATED,
        entityType: AuditEntityType.TASK,
        entityId: updated.id,
        entityLabel: updated.title,
        summary: `Atualizou a tarefa "${updated.title}".`,
        details: { changes },
        createdAt: updated.updatedAt
      }, transaction);
      return updated;
    });
  }

  async complete(id: string, actor: Actor) {
    return this.prisma.$transaction(async transaction => {
      const task = await this.findIn(transaction, id);
      this.assertAccess(task, actor);
      if (task.status === TaskStatus.COMPLETED) {
        throw new ConflictException('Esta tarefa já foi concluída.');
      }

      const completedAt = new Date();
      const result = await transaction.task.updateMany({
        where: {
          id,
          status: TaskStatus.PENDING,
          updatedAt: task.updatedAt,
          ...(actor.role === 'USER' ? { ownerId: actor.id } : {})
        },
        data: { status: TaskStatus.COMPLETED, completedAt }
      });
      if (!result.count) {
        const latest = await this.findIn(transaction, id);
        this.assertAccess(latest, actor);
        if (latest.status === TaskStatus.COMPLETED) {
          throw new ConflictException('Esta tarefa já foi concluída.');
        }
        throw new ConflictException('Esta tarefa foi alterada por outra pessoa. Atualize a tela e tente novamente.');
      }

      const completed = await this.findIn(transaction, id);
      this.assertAccess(completed, actor);
      await recordAudit({
        actor,
        action: AuditAction.TASK_COMPLETED,
        entityType: AuditEntityType.TASK,
        entityId: completed.id,
        entityLabel: completed.title,
        summary: `Concluiu a tarefa "${completed.title}".`,
        details: {
          completedAt: completedAt.toISOString(),
          owner: { id: completed.ownerId, name: completed.owner.name }
        },
        createdAt: completedAt
      }, transaction);
      return completed;
    });
  }

  async remove(id: string, actor: Actor) {
    return this.prisma.$transaction(async transaction => {
      const task = await this.findIn(transaction, id);
      this.assertAccess(task, actor);
      if (task.status === TaskStatus.COMPLETED) {
        throw new ConflictException('Tarefas concluídas não podem ser excluídas.');
      }

      const deletedAt = new Date();
      const result = await transaction.task.deleteMany({
        where: {
          id,
          status: TaskStatus.PENDING,
          updatedAt: task.updatedAt,
          ...(actor.role === 'USER' ? { ownerId: actor.id } : {})
        }
      });
      if (!result.count) {
        const latest = await this.findIn(transaction, id);
        this.assertAccess(latest, actor);
        if (latest.status === TaskStatus.COMPLETED) {
          throw new ConflictException('Tarefas concluídas não podem ser excluídas.');
        }
        throw new ConflictException('Esta tarefa foi alterada por outra pessoa. Atualize a tela e tente novamente.');
      }

      await recordAudit({
        actor,
        action: AuditAction.TASK_DELETED,
        entityType: AuditEntityType.TASK,
        entityId: task.id,
        entityLabel: task.title,
        summary: `Excluiu a tarefa "${task.title}".`,
        details: {
          title: task.title,
          description: task.description,
          owner: { id: task.ownerId, name: task.owner.name },
          status: task.status
        },
        createdAt: deletedAt
      }, transaction);
      return { message: 'Tarefa excluída.' };
    });
  }
}
