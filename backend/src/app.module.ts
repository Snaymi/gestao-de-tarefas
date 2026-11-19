import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, AuthGuard } from './auth';
import { DashboardController } from './dashboard';
import { PrismaService } from './prisma.service';
import { TasksController, TasksService } from './tasks';
import { UsersController, UsersService } from './users';

@Module({ imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'local-development-secret-change-before-deploy', signOptions: { expiresIn: '8h' } })], controllers: [AuthController, UsersController, TasksController, DashboardController], providers: [PrismaService, AuthGuard, UsersService, TasksService] })
export class AppModule {}
