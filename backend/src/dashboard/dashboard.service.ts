import { Injectable } from '@nestjs/common';
import { TaskStatus } from '@prisma/client';
import { Actor } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(actor: Actor) {
    const where = actor.role === 'ADMIN' ? {} : { ownerId: actor.id };
    const [total, pending, completed, recent] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.count({ where: { ...where, status: TaskStatus.PENDING } }),
      this.prisma.task.count({ where: { ...where, status: TaskStatus.COMPLETED } }),
      this.prisma.task.findMany({
        where,
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { id: true, name: true } } }
      })
    ]);
    return { total, pending, completed, percentage: total ? Math.round(completed / total * 100) : 0, recent };
  }
}
