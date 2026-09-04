import { type CallHandler, type ExecutionContext, Injectable, type NestInterceptor } from '@nestjs/common';
import { type Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { AuthPrincipal } from '../auth/jwt-payload';
import { isCostField } from './cost-fields.registry';

/**
 * Remove recursivamente os campos do registro de custo de `data`, retornando uma
 * cópia limpa (não muta a entrada). Preserva primitivos, `null` e `Date`.
 */
export function redactCostFields<T>(data: T): T {
  if (data === null || typeof data !== 'object') return data;
  if (data instanceof Date) return data;
  if (Array.isArray(data)) {
    return data.map((item) => redactCostFields(item)) as unknown as T;
  }
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(data as Record<string, unknown>)) {
    if (isCostField(chave)) continue;
    saida[chave] = redactCostFields(valor);
  }
  return saida as T;
}

/**
 * Camada ÚNICA de serialização por Papel (AD-4). Para `role=Operador`, remove
 * de TODA resposta os campos sensíveis a custo. Nenhum endpoint serializa esses
 * campos para Operador, e dois endpoints não divergem — a regra mora só aqui.
 */
@Injectable()
export class CostRedactionInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest<{ user?: AuthPrincipal }>().user;
    const operador = user?.scope === 'tenant' && user.papel === 'operador';
    if (!operador) return next.handle();
    return next.handle().pipe(map((data) => redactCostFields(data)));
  }
}
