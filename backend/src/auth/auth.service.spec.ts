import { ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditAction } from '@prisma/client';
import { hash } from 'bcryptjs';
import { AuditLogService } from '../audit/audit-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('autenticação com auditoria indisponível', () => {
  const prisma = { user: { findUnique: jest.fn() } };
  const jwt = { signAsync: jest.fn(), verifyAsync: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
    audit as unknown as AuditLogService
  );
  const warning = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  const password = 'LocalTestPassword123!';
  let passwordHash: string;
  const user = { id: 'local-id', name: 'Usuário local', email: 'user@example.invalid', role: 'ADMIN' as const, active: true };

  beforeAll(async () => { passwordHash = await hash(password, 4); });
  beforeEach(() => {
    jest.clearAllMocks();
    audit.record.mockRejectedValue(new Error('secret=never-log-this'));
    jwt.signAsync.mockResolvedValue('test-token');
    jwt.verifyAsync.mockResolvedValue({ sub: user.id });
  });
  afterAll(() => warning.mockRestore());

  it('mantém login válido e cookie mesmo quando a auditoria falha', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, passwordHash });
    const controller = new AuthController(service);
    const response = { cookie: jest.fn() };
    await expect(controller.login({ email: user.email, password }, response as never)).resolves.toMatchObject({ id: user.id, role: 'ADMIN' });
    expect(response.cookie).toHaveBeenCalledWith('session', 'test-token', expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/api' }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LOGIN_SUCCEEDED }));
  });

  it('mantém 401 para credenciais inválidas mesmo quando a auditoria falha', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: user.email, password: 'incorreta' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LOGIN_FAILED }));
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('mantém 403 para conta inativa mesmo quando a auditoria falha', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...user, active: false, passwordHash });
    await expect(service.login({ email: user.email, password })).rejects.toBeInstanceOf(ForbiddenException);
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LOGIN_BLOCKED_INACTIVE }));
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('limpa o cookie e conclui logout mesmo se a auditoria falhar', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    const response = { clearCookie: jest.fn() };
    const controller = new AuthController(service);
    await expect(controller.logout({ cookies: { session: 'test-token' } } as never, response as never))
      .resolves.toEqual({ message: 'Sessão encerrada.' });
    expect(response.clearCookie).toHaveBeenCalledWith('session', { path: '/api' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: AuditAction.LOGOUT }));
  });

  it('não registra detalhes da exceção nos avisos', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.login({ email: user.email, password: 'incorreta' })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(warning).toHaveBeenCalled();
    expect(JSON.stringify(warning.mock.calls)).not.toContain('never-log-this');
    expect(JSON.stringify(warning.mock.calls)).not.toContain(password);
  });
});
