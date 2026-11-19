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

    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user?.active) throw new Error('Inactive');
      request.actor = { id: user.id, name: user.name, email: user.email, role: user.role };
      return true;
    } catch {
      throw new UnauthorizedException('Sessão expirada. Entre novamente.');
    }
  }
}
