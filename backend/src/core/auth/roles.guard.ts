import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthPrincipal } from './jwt-payload';
import { PAPEIS_KEY } from './papeis.decorator';

/**
 * Autorização por Papel server-side (AD-4). Lê os papéis exigidos via
 * `@Papeis(...)` e nega quem não os tiver. Use junto de `AuthGuard('jwt')`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<string[] | undefined>(PAPEIS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!exigidos || exigidos.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthPrincipal }>().user;
    if (!user || !exigidos.includes(user.papel)) {
      throw new ForbiddenException('Papel sem permissão para esta operação.');
    }
    return true;
  }
}
