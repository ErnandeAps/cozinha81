import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import {
  getTenantContext,
  MissingTenantContextError,
  runInTenantContext,
  type TenantContext,
} from './tenant-context';

/** Token de injeção do `pg.Pool`. */
export const DATABASE_POOL = Symbol('DATABASE_POOL');

/**
 * Acesso a dados consciente de tenant.
 *
 * Toda unidade de trabalho roda dentro de uma transação onde
 * `app.tenant_id` é setado com `set_config(..., is_local := true)` — ou seja,
 * **transaction-local**. Isso garante dois invariantes de AD-1 de uma vez:
 *
 * - a RLS enxerga o tenant durante a transação (AC-2);
 * - o GUC é descartado automaticamente no COMMIT/ROLLBACK, então a conexão
 *   devolvida ao pool nunca vaza o tenant para o próximo checkout (AC-3).
 */
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  constructor(@Inject(DATABASE_POOL) private readonly pool: Pool) {}

  /** Pool cru — para migrations/health checks. Não usar para dados tenant-scoped. */
  get rawPool(): Pool {
    return this.pool;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  /** Executa `fn` numa transação isolada para `tenantId`. */
  async withTenant<T>(tenantId: string, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!tenantId) throw new MissingTenantContextError();
    return this.runScoped({ scope: 'tenant', tenantId }, fn);
  }

  /**
   * Executa `fn` no realm de plataforma (AD-14): sem `app.tenant_id`.
   * Na Story 1.2 a policy ainda não concede acesso cross-tenant — então isto
   * serve hoje para operações não tenant-scoped (ex.: ler `current_setting`).
   */
  async withPlatform<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    return this.runScoped({ scope: 'platform' }, fn);
  }

  /**
   * Usa o contexto de tenant ambiente (definido pelo middleware de request ou
   * por `runWithTenant` em workers). Rejeita se não houver contexto — é o que
   * impede qualquer query tenant-scoped de rodar sem tenant resolvido (AC-2/AC-4).
   */
  async withAmbient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const ctx = getTenantContext();
    if (!ctx) throw new MissingTenantContextError();
    return this.runScoped(ctx, fn);
  }

  private async runScoped<T>(ctx: TenantContext, fn: (client: PoolClient) => Promise<T>): Promise<T> {
    if (ctx.scope === 'tenant' && !ctx.tenantId) {
      throw new MissingTenantContextError();
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (ctx.scope === 'tenant') {
        // is_local = true => vale só nesta transação e some no fim.
        await client.query('SELECT set_config($1, $2, true)', ['app.tenant_id', ctx.tenantId]);
      } else {
        await client.query('SELECT set_config($1, $2, true)', ['app.scope', 'platform']);
      }

      const result = await runInTenantContext(ctx, () => fn(client));
      await client.query('COMMIT');
      return result;
    } catch (err) {
      // Não deixar uma falha no ROLLBACK (ex.: conexão já morta) mascarar o erro original.
      try {
        await client.query('ROLLBACK');
      } catch {
        /* preserva err */
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
