import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Tenant resolution scope for a unit of work.
 * - `tenant`: ordinary tenant-scoped work; `tenantId` is required.
 * - `platform`: plataforma/staff principal (AD-14); carries no `tenant_id`.
 *   O realm de plataforma é implementado na Story 1.3 — aqui só fica preparado.
 */
export type TenantScope = 'tenant' | 'platform';

export interface TenantContext {
  scope: TenantScope;
  /** Obrigatório quando `scope === 'tenant'`; ausente em `platform`. */
  tenantId?: string;
  /** Papel do principal (Inquilino: dono_admin/operador; plataforma: staff). */
  papel?: string;
  /**
   * Operador não enxerga dados de custo (FR-3). Marcado aqui no contexto de
   * request; a remoção efetiva dos campos é feita pelo interceptor da Story 1.6.
   */
  noCost?: boolean;
}

/**
 * Erro lançado quando uma operação tenant-scoped é tentada sem contexto de
 * tenant estabelecido. É a barreira de aplicação que complementa a RLS do banco
 * (AD-1: RLS é a última linha de defesa, não a única).
 */
export class MissingTenantContextError extends Error {
  constructor(message = 'Nenhum tenant context estabelecido; operação tenant-scoped recusada.') {
    super(message);
    this.name = 'MissingTenantContextError';
  }
}

const storage = new AsyncLocalStorage<TenantContext>();

/** Contexto de tenant ambiente do fluxo assíncrono atual, se houver. */
export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

/**
 * Retorna o `tenantId` ambiente ou lança {@link MissingTenantContextError}.
 * Usado por qualquer caminho que precise garantir tenancy antes de tocar dados.
 */
export function requireTenantId(): string {
  const ctx = storage.getStore();
  if (!ctx || ctx.scope !== 'tenant' || !ctx.tenantId) {
    throw new MissingTenantContextError();
  }
  return ctx.tenantId;
}

/** Executa `fn` com `ctx` como contexto de tenant ambiente. */
export function runInTenantContext<T>(ctx: TenantContext, fn: () => T): T {
  return storage.run(ctx, fn);
}
