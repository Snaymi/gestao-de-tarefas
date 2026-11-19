import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

export class BootstrapError extends Error {
  constructor(readonly code: 'connection' | 'postgres-auth' | 'password-invalid' | 'password-mismatch' | 'transaction' | 'database-not-empty', message: string) {
    super(message);
    this.name = 'BootstrapError';
  }
}

function prismaCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const value = error as { code?: unknown; errorCode?: unknown };
  return typeof value.errorCode === 'string' ? value.errorCode : typeof value.code === 'string' ? value.code : undefined;
}

export function safeDatabaseError(error: unknown, phase: 'connection' | 'query' | 'transaction'): BootstrapError {
  const code = prismaCode(error);
  if (code === 'P1000' || code === 'P1010') {
    return new BootstrapError('postgres-auth', 'Autenticação do PostgreSQL recusada. Confira o usuário, a senha e as permissões da URL externa.');
  }
  if (phase === 'connection' || ['P1001', 'P1002', 'P1003', 'P1011', 'P1017'].includes(code ?? '')) {
    return new BootstrapError('connection', 'Falha de conexão com o PostgreSQL. Confira a URL externa, o TLS e a liberação temporária do seu IP.');
  }
  if (phase === 'transaction') {
    return new BootstrapError('transaction', 'Falha na operação transacional. Nenhum ADMIN foi confirmado; confira as restrições do banco antes de tentar novamente.');
  }
  return new BootstrapError('transaction', 'Falha ao consultar o PostgreSQL. Confira se as migrations foram aplicadas antes de tentar novamente.');
}

export function safeBootstrapMessage(error: unknown): string {
  return error instanceof BootstrapError ? error.message : 'Falha inesperada no bootstrap. Nenhuma mensagem interna será exibida.';
}

export function validatePassword(password: string, confirmation: string): void {
  if (password.length < 12) throw new BootstrapError('password-invalid', 'Senha inválida: use ao menos 12 caracteres.');
  if (password !== confirmation) throw new BootstrapError('password-mismatch', 'A confirmação da senha não coincide.');
}

export async function createAdminInTransaction(
  prisma: Pick<PrismaClient, '$transaction'>,
  input: { name: string; email: string; password: string; confirmation: string }
): Promise<'created' | 'admin-exists' | 'database-not-empty'> {
  validatePassword(input.password, input.confirmation);
  const passwordHash = await hash(input.password, 12);
  try {
    return await prisma.$transaction(async transaction => {
      // SELECT da função void não pode ser desserializado pelo Prisma. O literal inteiro preserva o lock.
      const rows = await transaction.$queryRaw<Array<{ acquired: number }>>`
        SELECT 1 AS acquired FROM pg_advisory_xact_lock(hashtext('fluxo_first_admin_bootstrap'))
      `;
      if (rows.length !== 1 || rows[0].acquired !== 1) throw new Error('Advisory lock não confirmado.');
      if (await transaction.user.count({ where: { role: 'ADMIN' } })) return 'admin-exists';
      if (await transaction.user.count()) return 'database-not-empty';

      await transaction.user.create({ data: { name: input.name, email: input.email, passwordHash, role: 'ADMIN' } });
      return 'created';
    });
  } catch (error) {
    throw safeDatabaseError(error, 'transaction');
  }
}

function askLine(message: string): Promise<string> {
  const readline = createInterface({ input: stdin, output: stdout });
  return readline.question(message).finally(() => readline.close());
}

function askHidden(message: string): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Execute este comando em um terminal interativo.'));
  }

  stdout.write(message);

  return new Promise((resolve, reject) => {
    let value = '';
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
      stdout.write('\n');
    };
    const onData = (chunk: Buffer | string) => {
      const input = chunk.toString();
      if (input.includes('\u0003')) {
        cleanup();
        reject(new Error('Operação cancelada.'));
        return;
      }

      for (const character of input) {
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = [...value].slice(0, -1).join('');
        } else {
          value += character;
        }
      }
    };

    stdin.setRawMode(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

async function main() {
  const rawDatabaseUrl = (await askHidden('Cole a URL externa do PostgreSQL Render (entrada oculta): ')).trim();
  let databaseUrl: URL;
  try {
    databaseUrl = new URL(rawDatabaseUrl);
  } catch {
    throw new Error('A URL informada não é válida.');
  }

  if (!['postgres:', 'postgresql:'].includes(databaseUrl.protocol)) {
    throw new Error('A URL precisa usar o protocolo PostgreSQL.');
  }
  if (!databaseUrl.hostname.toLowerCase().endsWith('.render.com')) {
    throw new Error('Por segurança, este bootstrap aceita somente uma URL PostgreSQL do Render.');
  }
  if (!databaseUrl.username || !databaseUrl.password) {
    throw new Error('A URL PostgreSQL precisa conter credenciais válidas.');
  }

  const databaseName = decodeURIComponent(databaseUrl.pathname.replace(/^\/+/, ''));
  if (!databaseName) throw new Error('Não foi possível identificar o nome do banco na URL.');
  databaseUrl.searchParams.set('sslmode', 'require');

  stdout.write(`Host: ${databaseUrl.hostname}\nBanco: ${databaseName}\n`);
  const confirmation = (await askLine('Digite exatamente o nome do banco para confirmar: ')).trim();
  if (confirmation !== databaseName) throw new Error('O banco não foi confirmado; nenhuma alteração foi feita.');

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl.toString() } } });
  try {
    try {
      await prisma.$connect();
    } catch (error) {
      throw safeDatabaseError(error, 'connection');
    }

    let adminCount: number;
    let userCount: number;
    try {
      adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
      userCount = adminCount ? 0 : await prisma.user.count();
    } catch (error) {
      throw safeDatabaseError(error, 'query');
    }
    if (adminCount) {
      stdout.write('Já existe um ADMIN; nenhuma alteração foi feita.\n');
      return;
    }
    if (userCount) {
      throw new BootstrapError('database-not-empty', 'O banco contém usuários, mas nenhum ADMIN. O bootstrap inicial foi recusado.');
    }

    const name = (await askLine('Nome do administrador: ')).trim();
    const email = (await askLine('E-mail do administrador: ')).trim().toLowerCase();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Informe um nome e um e-mail válidos.');
    }

    const password = await askHidden('Senha (mínimo de 12 caracteres; entrada oculta): ');
    const confirmationPassword = await askHidden('Confirme a senha (entrada oculta): ');
    const result = await createAdminInTransaction(prisma, { name, email, password, confirmation: confirmationPassword });

    if (result === 'created') stdout.write('Administrador criado.\n');
    else if (result === 'admin-exists') stdout.write('Outro ADMIN já foi criado; nenhuma alteração adicional foi feita.\n');
    else throw new BootstrapError('database-not-empty', 'O banco deixou de estar vazio. Nenhum administrador foi criado.');
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error(safeBootstrapMessage(error));
    process.exitCode = 1;
  });
}
