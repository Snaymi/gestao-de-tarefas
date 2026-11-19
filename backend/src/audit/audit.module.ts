import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from './audit-log.module';
import { AuditController } from './audit.controller';

@Module({
  imports: [AuthModule, AuditLogModule, PrismaModule],
  controllers: [AuditController]
})
export class AuditModule {}
