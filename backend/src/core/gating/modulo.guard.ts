import { CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DatabaseService } from '../database/database.service';
import type { AuthPrincipal } from '../auth/jwt-payload';
import type { Modulo } from './modulos';
import { REQUER_MODULO_KEY } from './requer-modulo.decorator';

/**
 * Gating de Módulo server-side (AD-4, FR-1/FR-4). Um endpoint marcado com
 * `@RequerModulo(m)` é rejeitado se a `modulo_flag` do tenant não estiver
 * habilitada — independentemente da UI. Responde com `code` e `details.upsell`
 * para o Portal exibir bloqueio + CTA.
 */
@Injectable()
export class ModuloGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const modulo = this.reflector.getAllAndOverride<Modulo | undefined>(REQUER_MODULO_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!modulo) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthPrincipal }>().user;
    if (!user || user.scope !== 'tenant' || !user.tenantId) {
      throw new ForbiddenException('Acesso a Módulo exige principal de Inquilino.');
    }

    const habilitado = await this.db.withTenant(user.tenantId, (c) =>
      c
        .query<{ habilitado: boolean }>('SELECT habilitado FROM modulo_flag WHERE modulo = $1', [modulo])
        .then((r) => r.rows[0]?.habilitado === true),
    );

    if (!habilitado) {
      throw new ForbiddenException({
        code: 'MODULO_NAO_HABILITADO',
        message: `Módulo "${modulo}" não está habilitado para este Inquilino.`,
        details: { modulo, upsell: true },
      });
    }
    return true;
  }
}
