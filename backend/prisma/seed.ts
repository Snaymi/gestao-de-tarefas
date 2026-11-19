import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

async function main() {
  if (process.env.NODE_ENV === 'production') throw new Error('Seed de demonstração indisponível em produção.');
  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.upsert({ where: { email: 'admin@demo.local' }, update: {}, create: { name: 'Admin Demo', email: 'admin@demo.local', passwordHash: await hash(process.env.SEED_ADMIN_PASSWORD || 'Admin123!', 12), role: 'ADMIN' } });
    const user = await prisma.user.upsert({ where: { email: 'usuario@demo.local' }, update: {}, create: { name: 'Usuário Demo', email: 'usuario@demo.local', passwordHash: await hash(process.env.SEED_USER_PASSWORD || 'User123!', 12), role: 'USER' } });
    if (await prisma.task.count() === 0) {
      await prisma.task.createMany({ data: [
        { title: 'Planejar prioridades da semana', description: 'Definir as entregas mais importantes.', ownerId: user.id },
        { title: 'Revisar documentação do projeto', description: 'Conferir instruções de inicialização.', ownerId: admin.id },
        { title: 'Configurar ambiente de desenvolvimento', status: 'COMPLETED', completedAt: new Date(), ownerId: user.id }
      ] });
    }
  } finally { await prisma.$disconnect(); }
}
main().catch(error => { console.error(error); process.exit(1); });
