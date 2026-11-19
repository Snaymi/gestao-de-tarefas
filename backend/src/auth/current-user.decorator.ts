import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Actor, AuthRequest } from './auth.types';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): Actor =>
  context.switchToHttp().getRequest<AuthRequest>().actor
);
