import { Controller, ForbiddenException, Get, Query, UseGuards } from '@nestjs/common';
import { Actor } from '../auth/auth.types';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuditQueryDto } from './audit-query.dto';
import { AuditLogService } from './audit-log.service';

@Controller('audit')
@UseGuards(AuthGuard)
export class AuditController {
  constructor(private readonly audit: AuditLogService) {}

  @Get()
  list(@CurrentUser() actor: Actor, @Query() query: AuditQueryDto) {
    if (actor.role !== 'ADMIN') throw new ForbiddenException('Acesso exclusivo para administradores.');
    return this.audit.list(query);
  }
}
