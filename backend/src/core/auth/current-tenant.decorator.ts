import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { AuthPrincipal } from './jwt-payload';

/**
 * Injeta o `tenantId` do principal autenticado (`req.user.tenantId`).
 * Lança se o principal não tiver um `tenantId` (o guard já garante isso).
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const user = ctx.switchToHttp().getRequest<{ user: AuthPrincipal }>().user;
    if (!user?.tenantId) {
      throw new UnauthorizedException('Tenant context is missing.');
    }
    return user.tenantId;
  },
);
