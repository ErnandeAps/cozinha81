import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KdsGateway } from './kds.gateway';
import { NormalizedOrder } from './ports/delivery-types';

export interface PedidoItem {
  id: string; // uuid do item ou sku
  ficha_id?: string;
  quantidade: number;
  nome: string;
}

export interface CriarPedidoManualDto {
  itens: PedidoItem[];
}

export interface MudarStatusDto {
  status: string;
  cause_key: string;
}

@Injectable()
export class PedidosService {
  constructor(
    private readonly db: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly kdsGateway: KdsGateway
  ) {}

  async criarPedidoManual(tenantId: string, dto: CriarPedidoManualDto) {
    return this.db.withTenant(tenantId, async (c) => {
      // 1. Insert into pedido
      const { rows: pRows } = await c.query(
        `INSERT INTO pedido (tenant_id, origem, itens, valor_centavos) VALUES ($1, $2, $3::jsonb, $4) RETURNING id, numero, criado_em`,
        [tenantId, 'Manual', JSON.stringify(dto.itens), 0]
      );
      const pedido = pRows[0];

      // 2. Insert into pedido_status (status initial = 'aceitar')
      await c.query(
        `INSERT INTO pedido_status (tenant_id, pedido_id, status, cause_key) VALUES ($1, $2, $3, $4)`,
        [tenantId, pedido.id, 'aceitar', pedido.id] // using pedido.id as cause_key for initial status is safe and idempotent for creation
      );

      // 3. Emit local event for inventory reduction
      const totalItens = dto.itens.reduce((acc, i) => acc + i.quantidade, 0);
      
      this.eventEmitter.emit('pedido.criado', {
        tenantId,
        pedidoId: pedido.id,
        origem: 'Manual',
        itens: dto.itens
      });

      // 4. Emit WS event to KDS
      this.kdsGateway.server.emit('newOrder', {
        orderId: pedido.id,
        origin: 'Manual',
        number: String(pedido.numero),
        items: totalItens,
        time: pedido.criado_em.toISOString()
      }, (ack: boolean) => {
        // Ack handled in gateway memory if needed, or ignored for now since gateway handles it natively
      });

      return pedido;
    });
  }

  async getPedidoIdByOrigem(tenantId: string, origem: string, origemId: string): Promise<string | null> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query(
        `SELECT id FROM pedido WHERE tenant_id = $1 AND origem = $2 AND origem_id = $3`,
        [tenantId, origem, origemId]
      );
      return rows.length > 0 ? rows[0].id : null;
    });
  }

  async processarPedidoDelivery(tenantId: string, order: NormalizedOrder) {
    return this.db.withTenant(tenantId, async (c) => {
      // 1. Insert into pedido (idempotente — AC#4 Story 7.3). Reentrega/reprocessamento
      //    do mesmo pedido externo (tenant, origem, origem_id) não cria duplicado.
      const { rows: pRows } = await c.query(
        `INSERT INTO pedido (tenant_id, origem, origem_id, itens, criado_em, valor_centavos)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6)
         ON CONFLICT (tenant_id, origem, origem_id) WHERE origem_id IS NOT NULL DO NOTHING
         RETURNING id, numero, criado_em`,
        [tenantId, order.provider, order.id, JSON.stringify(order.itens), order.criadoEm || new Date(), Math.round(order.total || 0)]
      );

      // Conflito => Pedido já ingerido antes. Não duplica nem reemite ao KDS.
      if (pRows.length === 0) {
        return { deduplicated: true };
      }

      const pedido = pRows[0];

      // 2. Insert initial status
      await c.query(
        `INSERT INTO pedido_status (tenant_id, pedido_id, status, cause_key) VALUES ($1, $2, $3, $4)`,
        [tenantId, pedido.id, order.status, pedido.id]
      );

      const totalItens = order.itens.reduce((acc, i) => acc + i.quantidade, 0);

      // 3. Emit local event for inventory reduction
      this.eventEmitter.emit('pedido.criado', {
        tenantId,
        pedidoId: pedido.id,
        origem: order.provider,
        itens: order.itens
      });

      // 4. Emit WS event to KDS
      this.kdsGateway.server.emit('newOrder', {
        orderId: pedido.id,
        origin: order.provider,
        number: String(pedido.numero),
        items: totalItens,
        time: pedido.criado_em.toISOString()
      });

      return pedido;
    });
  }

  async mudarStatus(tenantId: string, pedidoId: string, dto: MudarStatusDto) {
    return this.db.withTenant(tenantId, async (c) => {
      try {
        // Carrega o Pedido e o status atual ANTES de inserir o novo status
        const { rows: pRows } = await c.query(
          `SELECT p.itens, p.origem, p.origem_id, p.criado_em, p.valor_centavos,
                  (SELECT ps.status FROM pedido_status ps WHERE ps.pedido_id = p.id ORDER BY ps.alterado_em DESC, ps.id DESC LIMIT 1) as previous_status
           FROM pedido p WHERE p.id = $1`,
          [pedidoId]
        );
        const pedido = pRows[0];
        const previousStatus = pedido?.previous_status;

        const { rows } = await c.query(
          `INSERT INTO pedido_status (tenant_id, pedido_id, status, cause_key)
           VALUES ($1, $2, $3, $4) RETURNING *`,
          [tenantId, pedidoId, dto.status, dto.cause_key]
        );
        const novoStatus = rows[0];

        // Outbox de saída (Story 7.4, AD-7/AD-8): transições de Pedidos de delivery
        // refletem na origem de forma assíncrona/resiliente — nunca síncrono aqui.
        // dedup_key garante idempotência de enfileiramento (AC#3).
        if (pedido && ['ifood', '99food'].includes(pedido.origem) && pedido.origem_id) {
          await c.query(
            `INSERT INTO delivery_outbox (tenant_id, pedido_id, provider, origem_id, status, dedup_key)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (tenant_id, dedup_key) DO NOTHING`,
            [tenantId, pedidoId, pedido.origem, pedido.origem_id, dto.status, `${pedidoId}:${dto.status}`]
          );
        }

        // Se o status for despachado, emite o evento para baixar estoque (Story 6.3)
        if (dto.status === 'despachado' && pedido) {
          this.eventEmitter.emit('pedido.despachado', {
            tenantId,
            pedidoId,
            origem: pedido.origem,
            itens: pedido.itens,
            causeKey: dto.cause_key,
          });
        }

        // Cancelamento (Story 7.6): sinaliza ao gestao-cozinha para reconciliar o
        // estoque (estorno por invariante — AD-13). pedidos NÃO escreve no ledger.
        if (dto.status === 'cancelado' && pedido) {
          this.eventEmitter.emit('pedido.cancelado', {
            tenantId,
            pedidoId,
            itens: pedido.itens,
          });
        }

        // Faturamento (Story 7.7 refactored): publica evento de faturamento delta
        if (pedido) {
          const wasBilled = ['concluido', 'entregue'].includes(previousStatus);
          const isBilled = ['concluido', 'entregue'].includes(dto.status);
          const competencia = pedido.criado_em.toISOString().substring(0, 7); // 'YYYY-MM'

          if (!wasBilled && isBilled) {
            this.eventEmitter.emit('pedidos.faturamento_periodo_atualizado', {
              tenantId,
              competencia,
              operacao: 'adicionar',
              valorCentavos: pedido.valor_centavos,
            });
          } else if (wasBilled && !isBilled) {
            this.eventEmitter.emit('pedidos.faturamento_periodo_atualizado', {
              tenantId,
              competencia,
              operacao: 'subtrair',
              valorCentavos: pedido.valor_centavos,
            });
          }
        }

        // Emit WebSocket event
        this.kdsGateway.server.emit('orderStatusChanged', {
          orderId: pedidoId,
          status: dto.status,
          causeKey: dto.cause_key
        });

        return { success: true, status: novoStatus };
      } catch (err: any) {
        // Postgres unique constraint violation
        if (err.code === '23505') {
          return { success: true, deduplicated: true }; // idempotent success
        }
        throw err;
      }
    });
  }
}
