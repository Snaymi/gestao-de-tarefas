import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { Actor } from './auth.types';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';

type CookieRequest = Request & { cookies?: Record<string, string | undefined> };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const { token, user } = await this.auth.login(dto);
    response.cookie('session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 8 * 60 * 60 * 1000,
      path: '/api'
    });
    return user;
  }

  @Post('logout')
  async logout(@Req() request: CookieRequest, @Res({ passthrough: true }) response: Response) {
    try {
      await this.auth.recordLogout(request.cookies?.session);
    } finally {
      response.clearCookie('session', { path: '/api' });
    }
    return { message: 'Sessão encerrada.' };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() actor: Actor) {
    return actor;
  }
}
