import { Body, Controller, Get, Injectable, Post, Req, Res, UnauthorizedException, UseGuards, CanActivate, ExecutionContext, createParamDecorator } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { compare } from 'bcryptjs';
import { Request, Response } from 'express';
import { PrismaService } from './prisma.service';
import { Role } from '@prisma/client';

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
}

export type Actor = { id: string; name: string; email: string; role: Role };
type AuthRequest = Request & { actor: Actor };
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): Actor => context.switchToHttp().getRequest<AuthRequest>().actor);

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
    } catch { throw new UnauthorizedException('Sessão expirada. Entre novamente.'); }
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user?.active || !(await compare(dto.password, user.passwordHash))) throw new UnauthorizedException('E-mail ou senha inválidos.');
    const token = await this.jwt.signAsync({ sub: user.id });
    response.cookie('session', token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 8 * 60 * 60 * 1000, path: '/api' });
    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('session', { path: '/api' });
    return { message: 'Sessão encerrada.' };
  }

  @Get('me') @UseGuards(AuthGuard)
  me(@CurrentUser() actor: Actor) { return actor; }
}
