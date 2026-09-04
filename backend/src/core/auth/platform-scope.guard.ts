import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { AuthPrincipal } from './jwt-payload';

/**
 * Fronteira do realm de plataforma (AD-14, AC-5).
 *
 * Só `scope=platform` passa. Tokens de Inquilino (mesmo Dono/Admin) são negados
 * server-side — a UI nunca é a fronteira. Use sempre junto de `AuthGuard('jwt')`,
 * que popula `req.user`.
 */
@Injectable()
export class PlatformScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest<{ user?: AuthPrincipal }>().user;
    if (!user || user.scope !== 'platform') {
      throw new ForbiddenException('Acesso restrito ao realm de plataforma (backoffice).');
    }
    return true;
  }
}
