import { Injectable } from '@nestjs/common';
import { v5 as uuidv5 } from 'uuid';
import { DatabaseService } from '../../core/database/database.service';
import { ProducaoService } from './producao.service';

/** Namespace fixo para a cause_key (uuid) da produção/baixa de um item de Pedido. */
const PEDIDO_ITEM_NS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export interface PedidoItemRef {
  id: string;
  ficha_id?: string;
  quantidade?: number;
}

/**
 * cause_key (uuid) ESTÁVEL da baixa de um item de Pedido. Determinística por
 * (pedido, item): torna a baixa idempotente por Pedido e previne colisão quando
 * um pedido tem múltiplos itens com a mesma ficha.
 */
export function causeKeyPedidoItem(pedidoId: string, itemId: string): string {
  return uuidv5(`${pedidoId}:${itemId}`, PEDIDO_ITEM_NS);
}

/**
 * Reconciliação de estoque no cancelamento de Pedido (Story 7.6 — AD-13).
 *
 * O gestao-cozinha (dono do ledger) marca o pedido como cancelado e estorna as baixas.
 * A lógica de descobrir insumos e estornar foi movida para ProducaoService, 
 * que calcula as cause_keys de forma puramente determinística.
 */
@Injectable()
export class ReconciliacaoService {
  constructor(
    private readonly db: DatabaseService,
    private readonly producaoService: ProducaoService
  ) {}

  /** Pedido cancelado na origem: marca e estorna as baixas já existentes. Idempotente. */
  async cancelarEEstornar(tenantId: string, pedidoId: string, itens: PedidoItemRef[]): Promise<void> {
    await this.db.withTenant(tenantId, async (c) => {
      await c.query(
        `INSERT INTO pedido_cancelado (tenant_id, pedido_id) VALUES ($1, $2)
         ON CONFLICT (tenant_id, pedido_id) DO NOTHING`,
        [tenantId, pedidoId]
      );
    });
    
    // Para cada item, solicita ao ProducaoService que estorne atomicamente
    // caso a produção já tenha ocorrido.
    for (const item of itens ?? []) {
      if (!item.ficha_id) continue;
      const causeKey = causeKeyPedidoItem(pedidoId, item.id);
      await this.producaoService.estornarPorCauseKey(tenantId, causeKey, `Estorno cancelamento pedido ${pedidoId}`);
    }
  }

  /**
   * Verifica de forma otimizada se um pedido está marcado como cancelado.
   * Usado para compensação atômica (baixa tardia).
   */
  async isCancelado(tenantId: string, pedidoId: string): Promise<boolean> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query(
        `SELECT 1 FROM pedido_cancelado WHERE tenant_id = $1 AND pedido_id = $2`, 
        [tenantId, pedidoId]
      );
      return rows.length > 0;
    });
  }
}
