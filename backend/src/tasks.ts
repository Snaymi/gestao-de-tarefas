import { Body, ConflictException, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, Patch, Post, Delete, Query, UseGuards } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';
import { PrismaService } from './prisma.service';
import { Actor, AuthGuard, CurrentUser } from './auth';

export class CreateTaskDto {
  @IsString() @MinLength(1) @Matches(/\S/) @MaxLength(160) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsUUID() ownerId?: string;
}
export class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(1) @Matches(/\S/) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsUUID() ownerId?: string;
}
export class TaskQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}
  list(actor: Actor, query: TaskQueryDto) {
    return this.prisma.task.findMany({
      where: { ...(actor.role === 'USER' ? { ownerId: actor.id } : {}), ...(query.status ? { status: query.status } : {}), ...(query.search ? { title: { contains: query.search, mode: 'insensitive' as const } } : {}) },
      include: { owner: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }
    });
  }
  async find(id: string, actor: Actor) {
    const task = await this.prisma.task.findUnique({ where: { id }, include: { owner: { select: { id: true, name: true } } } });
    if (!task) throw new NotFoundException('Tarefa não encontrada.');
    if (actor.role !== 'ADMIN' && task.ownerId !== actor.id) throw new ForbiddenException('Você não tem acesso a esta tarefa.');
    return task;
  }
  async create(dto: CreateTaskDto, actor: Actor) {
    const ownerId = actor.role === 'ADMIN' && dto.ownerId ? dto.ownerId : actor.id;
    const owner = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!owner?.active) throw new NotFoundException('Responsável não encontrado ou inativo.');
    return this.prisma.task.create({ data: { title: dto.title.trim(), description: dto.description?.trim(), ownerId }, include: { owner: { select: { id: true, name: true } } } });
  }
  async update(id: string, dto: UpdateTaskDto, actor: Actor) {
    const task = await this.find(id, actor);
    if (task.status === 'COMPLETED') throw new ConflictException('Tarefas concluídas não podem ser alteradas.');
    if (dto.ownerId && actor.role !== 'ADMIN') throw new ForbiddenException('Apenas administradores podem trocar o responsável.');
    if (dto.ownerId) {
      const owner = await this.prisma.user.findUnique({ where: { id: dto.ownerId } });
      if (!owner?.active) throw new NotFoundException('Responsável não encontrado ou inativo.');
    }
    const result = await this.prisma.task.updateMany({ where: { id, status: 'PENDING', ...(actor.role === 'USER' ? { ownerId: actor.id } : {}) }, data: { ...dto, title: dto.title?.trim(), description: dto.description?.trim() } });
    if (!result.count) { await this.find(id, actor); throw new ConflictException('Tarefas concluídas não podem ser alteradas.'); }
    return this.find(id, actor);
  }
  async complete(id: string, actor: Actor) {
    await this.find(id, actor);
    const result = await this.prisma.task.updateMany({ where: { id, status: 'PENDING', ...(actor.role === 'USER' ? { ownerId: actor.id } : {}) }, data: { status: 'COMPLETED', completedAt: new Date() } });
    if (!result.count) { await this.find(id, actor); throw new ConflictException('Esta tarefa já foi concluída.'); }
    return this.find(id, actor);
  }
  async remove(id: string, actor: Actor) {
    const task = await this.find(id, actor);
    if (task.status === 'COMPLETED') throw new ConflictException('Tarefas concluídas não podem ser excluídas.');
    // O predicado é avaliado pelo banco no momento da exclusão, inclusive sob concorrência.
    const result = await this.prisma.task.deleteMany({ where: { id, status: 'PENDING', ...(actor.role === 'USER' ? { ownerId: actor.id } : {}) } });
    if (!result.count) {
      await this.find(id, actor);
      throw new ConflictException('Tarefas concluídas não podem ser excluídas.');
    }
    return { message: 'Tarefa excluída.' };
  }
}

@Controller('tasks') @UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}
  @Get() list(@CurrentUser() actor: Actor, @Query() query: TaskQueryDto) { return this.tasks.list(actor, query); }
  @Get(':id') find(@Param('id') id: string, @CurrentUser() actor: Actor) { return this.tasks.find(id, actor); }
  @Post() create(@Body() dto: CreateTaskDto, @CurrentUser() actor: Actor) { return this.tasks.create(dto, actor); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() actor: Actor) { return this.tasks.update(id, dto, actor); }
  @Patch(':id/complete') complete(@Param('id') id: string, @CurrentUser() actor: Actor) { return this.tasks.complete(id, actor); }
  @Delete(':id') remove(@Param('id') id: string, @CurrentUser() actor: Actor) { return this.tasks.remove(id, actor); }
}
