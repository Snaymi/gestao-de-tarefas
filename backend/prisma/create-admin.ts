import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';

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
    await prisma.$connect();

    if (await prisma.user.count({ where: { role: 'ADMIN' } })) {
      stdout.write('Já existe um ADMIN; nenhuma alteração foi feita.\n');
      return;
    }
    if (await prisma.user.count()) {
      throw new Error('O banco já contém usuários, mas nenhum ADMIN. O bootstrap inicial foi recusado.');
    }

    const name = (await askLine('Nome do administrador: ')).trim();
    const email = (await askLine('E-mail do administrador: ')).trim().toLowerCase();
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Informe um nome e um e-mail válidos.');
    }

    const password = await askHidden('Senha (mínimo de 12 caracteres; entrada oculta): ');
    const confirmationPassword = await askHidden('Confirme a senha (entrada oculta): ');
    if (password.length < 12 || password !== confirmationPassword) {
      throw new Error('A senha precisa ter ao menos 12 caracteres e as confirmações devem coincidir.');
    }

    const passwordHash = await hash(password, 12);
    const result = await prisma.$transaction(async transaction => {
      await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('fluxo_first_admin_bootstrap'))`;
      if (await transaction.user.count({ where: { role: 'ADMIN' } })) return 'admin-exists';
      if (await transaction.user.count()) return 'database-not-empty';

      await transaction.user.create({ data: { name, email, passwordHash, role: 'ADMIN' } });
      return 'created';
    });

    if (result === 'created') stdout.write(`Administrador criado para ${email}.\n`);
    else if (result === 'admin-exists') stdout.write('Outro ADMIN já foi criado; nenhuma alteração adicional foi feita.\n');
    else throw new Error('O banco deixou de estar vazio. Nenhum administrador foi criado.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error('Bootstrap não concluído. Confira o acesso ao banco e execute novamente; valores secretos não são exibidos.');
  process.exitCode = 1;
});
