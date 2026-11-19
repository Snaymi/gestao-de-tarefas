import { Body, ConflictException, Controller, ForbiddenException, Get, Injectable, NotFoundException, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { hash } from 'bcryptjs';
import { PrismaService } from './prisma.service';
import { Actor, AuthGuard, CurrentUser } from './auth';

export class CreateUserDto {
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsEnum(Role) role!: Role;
}
export class UpdateUserDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEnum(Role) role?: Role;
  @IsOptional() @IsBoolean() active?: boolean;
}
const publicUser = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}
  list() { return this.prisma.user.findMany({ select: publicUser, orderBy: { createdAt: 'desc' } }); }
  async find(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUser });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }
  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Este e-mail já está cadastrado.');
    return this.prisma.user.create({ data: { name: dto.name.trim(), email, passwordHash: await hash(dto.password, 12), role: dto.role }, select: publicUser });
  }
  async update(id: string, dto: UpdateUserDto, actor: Actor) {
    await this.find(id);
    if (id === actor.id && (dto.active === false || (dto.role && dto.role !== 'ADMIN'))) throw new ForbiddenException('Você não pode remover seu próprio acesso administrativo.');
    return this.prisma.user.update({ where: { id }, data: dto, select: publicUser });
  }
}

@Controller('users') @UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}
  private admin(actor: Actor) { if (actor.role !== 'ADMIN') throw new ForbiddenException('Acesso exclusivo para administradores.'); }
  @Get() list(@CurrentUser() actor: Actor) { this.admin(actor); return this.users.list(); }
  @Get(':id') find(@Param('id') id: string, @CurrentUser() actor: Actor) { this.admin(actor); return this.users.find(id); }
  @Post() create(@Body() dto: CreateUserDto, @CurrentUser() actor: Actor) { this.admin(actor); return this.users.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: Actor) { this.admin(actor); return this.users.update(id, dto, actor); }
}
