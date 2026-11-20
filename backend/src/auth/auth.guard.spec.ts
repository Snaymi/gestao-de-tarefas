import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from './auth.guard';
import type { Actor } from './auth.types';

describe('AuthGuard', () => {
  const jwt = { verifyAsync: jest.fn() };
  const prisma = { user: { findUnique: jest.fn() } };
  const guard = new AuthGuard(jwt as unknown as JwtService, prisma as unknown as PrismaService);
  const actor: Actor = { id: 'local-id', name: 'Usuário local', email: 'user@example.invalid', role: 'ADMIN' };

  function makeRequest(token?: string) {
    const request: { cookies?: { session: string }; actor?: Actor } = token ? { cookies: { session: token } } : {};
    const context = { switchToHttp: () => ({ getRequest: () => request }) } as ExecutionContext;
    return { request, context };
  }

  beforeEach(() => {
    jest.resetAllMocks();
    jwt.verifyAsync.mockResolvedValue({ sub: actor.id });
    prisma.user.findUnique.mockResolvedValue({ ...actor, active: true });
  });

  it('retorna 401 quando o cookie de sessão está ausente', async () => {
    const { context } = makeRequest();

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.verifyAsync).not.toHaveBeenCalled();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('retorna 401 quando a verificação do token falha', async () => {
    const { context } = makeRequest('invalid-token');
    jwt.verifyAsync.mockRejectedValue(new Error('invalid token'));

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it.each([undefined, 42, '  '])('retorna 401 para identificador inválido: %p', async sub => {
    const { context } = makeRequest('test-token');
    jwt.verifyAsync.mockResolvedValue({ sub });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['ausente', null],
    ['inativo', { ...actor, active: false }]
  ])('retorna 401 para usuário %s', async (_label, user) => {
    const { context } = makeRequest('test-token');
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('propaga falhas na consulta ao banco para o tratamento de erros do servidor', async () => {
    const { context, request } = makeRequest('test-token');
    const databaseFailure = new Error('database unavailable');
    prisma.user.findUnique.mockRejectedValue(databaseFailure);

    await expect(guard.canActivate(context)).rejects.toBe(databaseFailure);
    expect(request.actor).toBeUndefined();
  });

  it('identifica o usuário ativo com uma sessão válida', async () => {
    const { context, request } = makeRequest('test-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: actor.id } });
    expect(request.actor).toEqual(actor);
  });
});
