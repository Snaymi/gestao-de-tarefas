import { compare, getRounds } from 'bcryptjs';
import type { PrismaClient } from '@prisma/client';
import { BootstrapError, createAdminInTransaction, safeBootstrapMessage, safeDatabaseError, validatePassword } from '../prisma/create-admin';

function mockDatabase(adminCount = 0, userCount = 0) {
  const queryRaw = jest.fn().mockResolvedValue([{ acquired: 1 }]);
  const count = jest.fn()
    .mockResolvedValueOnce(adminCount)
    .mockResolvedValueOnce(userCount);
  const create = jest.fn().mockResolvedValue({ id: 'mock-id' });
  const transaction = jest.fn(async callback => callback({ $queryRaw: queryRaw, user: { count, create } }));
  return { prisma: { $transaction: transaction } as unknown as Pick<PrismaClient, '$transaction'>, queryRaw, count, create, transaction };
}

const input = { name: 'Admin Local', email: 'admin@example.invalid', password: 'TestPassword123!', confirmation: 'TestPassword123!' };

describe('bootstrap do primeiro ADMIN (Prisma simulado)', () => {
  it('adquire o lock na transação com resultado inteiro antes de consultar e criar', async () => {
    const db = mockDatabase();
    await expect(createAdminInTransaction(db.prisma, input)).resolves.toBe('created');
    const sql = (db.queryRaw.mock.calls[0][0] as TemplateStringsArray).join('');
    expect(sql).toContain('SELECT 1 AS acquired FROM pg_advisory_xact_lock');
    expect(db.queryRaw.mock.invocationCallOrder[0]).toBeLessThan(db.count.mock.invocationCallOrder[0]);
    expect(db.create).toHaveBeenCalledTimes(1);
    const passwordHash = db.create.mock.calls[0][0].data.passwordHash as string;
    expect(passwordHash).not.toBe(input.password);
    expect(getRounds(passwordHash)).toBe(12);
    await expect(compare(input.password, passwordHash)).resolves.toBe(true);
  });

  it('recusa outro ADMIN após adquirir o lock', async () => {
    const db = mockDatabase(1);
    await expect(createAdminInTransaction(db.prisma, input)).resolves.toBe('admin-exists');
    expect(db.create).not.toHaveBeenCalled();
  });

  it('recusa banco com usuários sem ADMIN', async () => {
    const db = mockDatabase(0, 1);
    await expect(createAdminInTransaction(db.prisma, input)).resolves.toBe('database-not-empty');
    expect(db.create).not.toHaveBeenCalled();
  });

  it('distingue senha curta e confirmação divergente antes da transação', async () => {
    const db = mockDatabase();
    expect(() => validatePassword('curta', 'curta')).toThrow('Senha inválida');
    expect(() => validatePassword(input.password, 'diferente')).toThrow('confirmação');
    await expect(createAdminInTransaction(db.prisma, { ...input, confirmation: 'diferente' })).rejects.toMatchObject({ code: 'password-mismatch' });
    expect(db.transaction).not.toHaveBeenCalled();
  });

  it('não revela erro interno da transação', async () => {
    const db = mockDatabase();
    db.queryRaw.mockRejectedValueOnce(new Error('secret=do-not-print'));
    const result = createAdminInTransaction(db.prisma, input);
    await expect(result).rejects.toMatchObject({ code: 'transaction' });
    await expect(result).rejects.not.toThrow('do-not-print');
    expect(db.create).not.toHaveBeenCalled();
  });

  it('separa autenticação, conexão e falha de transação sem expor erros brutos', () => {
    const auth = safeDatabaseError({ errorCode: 'P1000', message: 'password=secret' }, 'connection');
    const connection = safeDatabaseError({ errorCode: 'P1001', message: 'postgres://secret' }, 'connection');
    const transaction = safeDatabaseError({ code: 'P2002', message: 'secret' }, 'transaction');
    expect(auth).toBeInstanceOf(BootstrapError);
    expect(auth.code).toBe('postgres-auth');
    expect(connection.code).toBe('connection');
    expect(transaction.code).toBe('transaction');
    for (const error of [auth, connection, transaction]) expect(error.message).not.toContain('secret');
    expect(safeBootstrapMessage(new Error('password=secret'))).toBe('Falha inesperada no bootstrap. Nenhuma mensagem interna será exibida.');
  });
});
