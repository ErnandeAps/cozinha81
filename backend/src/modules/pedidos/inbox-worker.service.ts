import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../../core/database/database.service';
import { DeliveryProviderFactory } from './ports/delivery-provider.factory';
import { PedidosService } from './pedidos.service';
import { IntegracoesService } from './integracoes.service';

@Injectable()
export class InboxWorkerService {
  /** Teto de tentativas antes de marcar o evento como FAILED (NFR-4/AC#3). */
  static readonly MAX_ATTEMPTS = 5;

  private isProcessing = false;
  private readonly logger = new Logger(InboxWorkerService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly providerFactory: DeliveryProviderFactory,
    private readonly pedidosService: PedidosService,
    private readonly integracoesService: IntegracoesService
  ) {}

  @Cron('*/5 * * * * *')
  async processInbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      let rowsToProcess: any[] = [];
      await this.db.withPlatform(async (client) => {
        // Libera mensagens presas em 'PROCESSING' por mais de 5 minutos (crash do worker)
        await client.query(`
          UPDATE delivery_inbox 
          SET status = 'PENDING', updated_at = NOW() 
          WHERE status = 'PROCESSING' AND updated_at < NOW() - INTERVAL '5 minutes'
        `);

        // Bloqueia e marca as linhas, e imediatamente solta a conexão principal
        const { rows } = await client.query(
          `UPDATE delivery_inbox
           SET status = 'PROCESSING', updated_at = NOW()
           WHERE id IN (
             SELECT id FROM delivery_inbox
             WHERE status = 'PENDING'
             ORDER BY created_at ASC
             FOR UPDATE SKIP LOCKED
             LIMIT 50
           )
           RETURNING id, tenant_id, provider, payload, attempts`
        );
        rowsToProcess = rows;
      });

      if (rowsToProcess.length === 0) return;

      // Processa as mensagens em paralelo (concorrência HTTP) liberando o client pool
      await Promise.allSettled(
        rowsToProcess.map(async (row) => {
          try {
            await this.processEvent(row.tenant_id, row.provider, row.payload);

            await this.db.withPlatform(async (client) => {
              await client.query(
                `UPDATE delivery_inbox SET status = 'PROCESSED', processed_at = NOW(), updated_at = NOW() WHERE id = $1`,
                [row.id]
              );
            });
          } catch (err: any) {
            this.logger.error(
              `Erro ao processar inbox id=${row.id} (tentativa ${row.attempts + 1}/${InboxWorkerService.MAX_ATTEMPTS}): ${err.message}`
            );
            await this.db.withPlatform(async (client) => {
              await client.query(
                `UPDATE delivery_inbox
                    SET attempts = attempts + 1,
                        status = CASE WHEN attempts + 1 >= $1 THEN 'FAILED' ELSE 'PENDING' END,
                        error_message = $2,
                        updated_at = NOW()
                  WHERE id = $3`,
                [InboxWorkerService.MAX_ATTEMPTS, err.message, row.id]
              );
            });
          }
        })
      );
    } catch (err) {
      this.logger.error('Erro fatal no loop do InboxWorker:', err);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processEvent(tenantId: string, provider: string, payload: any) {
    const adapter = this.providerFactory.getAdapter(provider);
    
    // Normaliza o webhook
    const event = adapter.parseWebhook(payload);

    if (event.type === 'order_placed') {
      if (!event.orderId) throw new Error('order_placed sem orderId');

      const conectado = await this.integracoesService.isProviderConnected(tenantId, provider);
      if (!conectado) {
        this.logger.warn(
          `Ingestão ignorada: tenant ${tenantId} sem conexão ativa para ${provider}`
        );
        return;
      }

      const order = await adapter.fetchOrder(event.orderId, tenantId);
      await this.pedidosService.processarPedidoDelivery(tenantId, order);

    } else if (event.type === 'status_changed') {
      if (!event.orderId || !event.status) throw new Error('status_changed incompleto');
      
      const pedidoId = await this.pedidosService.getPedidoIdByOrigem(tenantId, provider, event.orderId);
      if (!pedidoId) throw new Error('Pedido não encontrado para mudança de status: ' + event.orderId);
      
      await this.pedidosService.mudarStatus(tenantId, pedidoId, {
        status: event.status,
        cause_key: `${event.orderId}_${event.status}`
      });
      
    } else if (event.type === 'order_cancelled') {
      if (!event.orderId) throw new Error('order_cancelled incompleto');
      
      const pedidoId = await this.pedidosService.getPedidoIdByOrigem(tenantId, provider, event.orderId);
      if (pedidoId) {
        await this.pedidosService.mudarStatus(tenantId, pedidoId, {
          status: 'cancelado',
          cause_key: `${event.orderId}_cancelled`
        });
      }
    }
  }
}
