import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Actor } from '../auth/auth.types';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  private admin(actor: Actor) {
    if (actor.role !== 'ADMIN') throw new ForbiddenException('Acesso exclusivo para administradores.');
  }

  @Get()
  list(@CurrentUser() actor: Actor) {
    this.admin(actor);
    return this.users.list();
  }

  @Get(':id')
  find(@Param('id') id: string, @CurrentUser() actor: Actor) {
    this.admin(actor);
    return this.users.find(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: Actor) {
    this.admin(actor);
    return this.users.create(dto, actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: Actor) {
    this.admin(actor);
    return this.users.update(id, dto, actor);
  }
}
