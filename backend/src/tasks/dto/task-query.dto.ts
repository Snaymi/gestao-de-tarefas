import { TaskStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class TaskQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TaskStatus) status?: TaskStatus;
}
