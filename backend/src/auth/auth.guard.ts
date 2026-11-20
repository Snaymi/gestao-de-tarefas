import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRequest } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const token = request.cookies?.session;
    if (!token) throw new UnauthorizedException('Faça login para continuar.');

    let payload: { sub?: unknown };
    try {
      payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token);
    } catch {
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    }

    const subject = payload?.sub;
    if (typeof subject !== 'string' || !subject.trim()) {
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: subject } });
    if (!user?.active) throw new UnauthorizedException('Sessão expirada. Entre novamente.');

    request.actor = { id: user.id, name: user.name, email: user.email, role: user.role };
    return true;
  }
}
