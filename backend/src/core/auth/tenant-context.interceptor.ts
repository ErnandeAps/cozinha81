import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { runInTenantContext, type TenantContext } from '../database/tenant-context';
import type { AuthPrincipal } from './jwt-payload';

/**
 * Resolve `(tenant_id, role)` do **principal autenticado** e roda o handler
 * dentro do tenant context (AsyncLocalStorage) — AC-2 da Story 1.4.
 *
 * Fonte de verdade é o JWT, não o header (que era só o mecanismo da 1.2). Roda
 * depois dos guards (req.user já populado) e antes do handler, então qualquer
 * query via `DatabaseService.withAmbient` enxerga o tenant correto. Operador é
 * marcado `noCost` (FR-3), consumido pelo interceptor de custo na Story 1.6.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest<{ user?: AuthPrincipal }>().user;
    if (!user) return next.handle();

    const tenantCtx: TenantContext =
      user.scope === 'platform'
        ? { scope: 'platform', papel: user.papel }
        : {
            scope: 'tenant',
            tenantId: user.tenantId,
            papel: user.papel,
            noCost: user.papel === 'operador',
          };

    // subscribe DENTRO do run() => o handler executa no contexto ALS.
    return new Observable((subscriber) => {
      runInTenantContext(tenantCtx, () => {
        next.handle().subscribe(subscriber);
      });
    });
  }
}
