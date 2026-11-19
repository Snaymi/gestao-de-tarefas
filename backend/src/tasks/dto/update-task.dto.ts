import { IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateTaskDto {
  @IsOptional() @IsString() @MinLength(1) @Matches(/\S/) @MaxLength(160) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsUUID() ownerId?: string;
}
