import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuditAction, AuditEntityType } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService, AuditRecord } from '../audit/audit-log.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditLogService
  ) {}

  private async recordAudit(entry: AuditRecord): Promise<void> {
    try {
      await this.audit.record(entry);
    } catch {
      // A indisponibilidade da auditoria não altera o resultado da autenticação.
      this.logger.warn('Falha ao registrar evento de autenticação na auditoria.');
    }
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      await this.recordAudit({
        actorName: 'Não autenticado',
        action: AuditAction.LOGIN_FAILED,
        entityType: AuditEntityType.AUTH,
        entityLabel: email,
        summary: 'Tentativa de login sem sucesso.',
        details: { attemptedEmail: email }
      });
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    if (!user.active) {
      await this.recordAudit({
        actor: user,
        action: AuditAction.LOGIN_BLOCKED_INACTIVE,
        entityType: AuditEntityType.AUTH,
        entityId: user.id,
        entityLabel: user.email,
        summary: `Tentativa de acesso bloqueada para a conta inativa de ${user.name}.`,
        details: { reason: 'ACCOUNT_INACTIVE' }
      });
      throw new ForbiddenException({
        code: 'ACCOUNT_INACTIVE',
        message: 'Esta conta está inativa.'
      });
    }

    const token = await this.jwt.signAsync({ sub: user.id });
    await this.recordAudit({
      actor: user,
      action: AuditAction.LOGIN_SUCCEEDED,
      entityType: AuditEntityType.AUTH,
      entityId: user.id,
      entityLabel: user.email,
      summary: 'Login realizado com sucesso.'
    });
    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  }

  async recordLogout(token?: string) {
    if (!token) return;

    let subject: string;
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      subject = payload.sub;
    } catch {
      return;
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: subject },
        select: { id: true, name: true, email: true, role: true }
      });
      if (!user) return;

      await this.recordAudit({
        actor: user,
        action: AuditAction.LOGOUT,
        entityType: AuditEntityType.AUTH,
        entityId: user.id,
        entityLabel: user.email,
        summary: 'Sessão encerrada.'
      });
    } catch {
      this.logger.warn('Falha ao consultar usuário para auditoria de logout.');
    }
  }
}
