import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { Actor } from '../auth/auth.types';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const publicUser = { id: true, name: true, email: true, role: true, active: true, createdAt: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.user.findMany({ select: publicUser, orderBy: { createdAt: 'desc' } });
  }

  async find(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: publicUser });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    return user;
  }

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Este e-mail já está cadastrado.');
    }
    return this.prisma.user.create({
      data: { name: dto.name.trim(), email, passwordHash: await hash(dto.password, 12), role: dto.role },
      select: publicUser
    });
  }

  async update(id: string, dto: UpdateUserDto, actor: Actor) {
    await this.find(id);
    if (id === actor.id && (dto.active === false || (dto.role && dto.role !== 'ADMIN'))) {
      throw new ForbiddenException('Você não pode remover seu próprio acesso administrativo.');
    }
    return this.prisma.user.update({ where: { id }, data: dto, select: publicUser });
  }
}
