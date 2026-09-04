import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { AuthPrincipal } from './jwt-payload';

/** Injeta o principal autenticado (`req.user`) num handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthPrincipal =>
    ctx.switchToHttp().getRequest<{ user: AuthPrincipal }>().user,
);
