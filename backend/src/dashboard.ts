import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { Actor, AuthGuard, CurrentUser } from './auth';

@Controller('dashboard') @UseGuards(AuthGuard)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('summary')
  async summary(@CurrentUser() actor: Actor) {
    const where = actor.role === 'ADMIN' ? {} : { ownerId: actor.id };
    const [total, pending, completed, recent] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.task.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.task.findMany({ where, take: 5, orderBy: { createdAt: 'desc' }, include: { owner: { select: { id: true, name: true } } } })
    ]);
    return { total, pending, completed, percentage: total ? Math.round(completed / total * 100) : 0, recent };
  }
}
