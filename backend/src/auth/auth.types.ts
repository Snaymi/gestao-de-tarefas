import { Role } from '@prisma/client';
import { Request } from 'express';

export type Actor = { id: string; name: string; email: string; role: Role };
export type AuthRequest = Request & { actor: Actor };
