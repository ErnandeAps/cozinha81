import { Injectable, BadRequestException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { randomUUID } from 'crypto';
import { DatabaseService } from '../../core/database/database.service';

export interface EstadoRecebimento {
  /** provider conectado ou null se não há conexão. */
  provider: string | null;
  /** 'ativo' | 'pausado' | null. */
  status: string | null;
}

/**
 * Story 7.5 — pausar/reativar o recebimento de Pedidos de delivery.
 * A pausa reusa `integracoes_delivery.status` ('ativo'↔'pausado'): o gate de
 * ingestão (`IntegracoesService.isProviderConnected`, status='ativo') já
 * interrompe a ingestão quando pausado (AC#1) e retoma ao reativar (AC#4).
 * O reflexo na origem é enfileirado no outbox (AD-7/AD-8).
 */
@Injectable()
export class RecebimentoService {
  constructor(private readonly db: DatabaseService) {}

  async estado(tenantId: string): Promise<EstadoRecebimento> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query(`SELECT provider, status FROM integracoes_delivery LIMIT 1`);
      return rows.length ? { provider: rows[0].provider, status: rows[0].status } : { provider: null, status: null };
    });
  }

  async pausar(tenantId: string): Promise<void> {
    await this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query(
        `UPDATE integracoes_delivery SET status = 'pausado', atualizado_em = now()
          WHERE status = 'ativo' RETURNING provider, store_id`
      );
      if (rows.length === 0) {
        throw new BadRequestException('Nenhuma conexão de delivery ativa para pausar.');
      }
      await this.enfileirar(c, tenantId, rows[0].provider, rows[0].store_id, 'pausa');
    });
  }

  async reativar(tenantId: string): Promise<void> {
    await this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query(
        `UPDATE integracoes_delivery SET status = 'ativo', atualizado_em = now()
          WHERE status = 'pausado' RETURNING provider, store_id`
      );
      if (rows.length === 0) {
        throw new BadRequestException('Nenhuma conexão de delivery pausada para reativar.');
      }
      await this.enfileirar(c, tenantId, rows[0].provider, rows[0].store_id, 'retomada');
    });
  }

  /** Enfileira a mensagem de disponibilidade no outbox (sem Pedido associado). */
  private async enfileirar(
    c: PoolClient,
    tenantId: string,
    provider: string,
    storeId: string | null,
    tipo: 'pausa' | 'retomada'
  ): Promise<void> {
    await c.query(
      `INSERT INTO delivery_outbox (tenant_id, pedido_id, provider, origem_id, status, dedup_key, tipo)
       VALUES ($1, NULL, $2, $3, $4, $5, $6)`,
      [tenantId, provider, storeId, tipo, `${tipo}:${randomUUID()}`, tipo]
    );
  }
}
