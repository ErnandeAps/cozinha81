import { BadRequestException, Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { runInTenantContext } from '../database/tenant-context';

const TENANT_HEADER = 'x-tenant-id';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve o tenant do request (header `x-tenant-id`) e roda o restante do
 * request dentro do contexto de tenant (AsyncLocalStorage) — AC-2.
 *
 * O contexto vale por todo o fluxo assíncrono iniciado por `next()`, então
 * qualquer query tenant-scoped via `DatabaseService.withAmbient` enxerga o
 * tenant. Sem header, segue sem contexto: queries tenant-scoped serão recusadas.
 *
 * Nota: a fonte de verdade do tenant migra para o principal autenticado na
 * Story 1.4 (login/papéis). Aqui o header estabelece o mecanismo.
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    // Em rota autenticada, o realm (JWT) é a fonte de verdade do tenant (Story
    // 1.4) e o TenantContextInterceptor o resolve. O header só vale na ausência
    // de Authorization — nunca pode forjar/sobrepor o tenant de um principal.
    if (req.header('authorization')) {
      next();
      return;
    }
    const raw = req.header(TENANT_HEADER);
    if (!raw) {
      next();
      return;
    }
    if (!UUID_RE.test(raw)) {
      throw new BadRequestException(`Header ${TENANT_HEADER} inválido: esperado UUID.`);
    }
    runInTenantContext({ scope: 'tenant', tenantId: raw }, () => next());
  }
}
