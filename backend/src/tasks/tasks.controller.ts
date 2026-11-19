import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { Actor } from '../auth/auth.types';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(AuthGuard)
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: TaskQueryDto) {
    return this.tasks.list(actor, query);
  }

  @Get(':id')
  find(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.tasks.find(id, actor);
  }

  @Post()
  create(@Body() dto: CreateTaskDto, @CurrentUser() actor: Actor) {
    return this.tasks.create(dto, actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentUser() actor: Actor) {
    return this.tasks.update(id, dto, actor);
  }

  @Patch(':id/complete')
  complete(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.tasks.complete(id, actor);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: Actor) {
    return this.tasks.remove(id, actor);
  }
}
