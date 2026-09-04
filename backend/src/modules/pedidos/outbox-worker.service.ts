import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../core/database/database.service';
import { DeliveryProviderFactory } from './ports/delivery-provider.factory';

/**
 * Story 7.4 — caminho de SAÍDA. Drena `delivery_outbox` e envia as transições
 * de status ao provedor via adapter (ACL/AD-8), com retry durável (AD-7).
 * Nunca chamado de forma síncrona na transição — o enfileiramento é feito por
 * `PedidosService.mudarStatus`.
 */
@Injectable()
export class OutboxWorkerService {
  /** Teto de tentativas antes de marcar FAILED (AC#4). */
  static readonly MAX_ATTEMPTS = 5;

  private isProcessing = false;
  private readonly logger = new Logger(OutboxWorkerService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly providerFactory: DeliveryProviderFactory
  ) {}

  // Poll a cada 1 segundo p/ NFR-2 (sync ≤3s p95 quando online).
  @Cron('*/1 * * * * *')
  async drainOutbox() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      let rowsToProcess: any[] = [];
      await this.db.withPlatform(async (client) => {
        // Libera mensagens presas em 'PROCESSING' por mais de 5 minutos (crash do worker)
        await client.query(`
          UPDATE delivery_outbox 
          SET status_envio = 'PENDING', updated_at = NOW() 
          WHERE status_envio = 'PROCESSING' AND updated_at < NOW() - INTERVAL '5 minutes'
        `);

        // Bloqueia e marca as linhas, e imediatamente solta a conexão principal
        const { rows } = await client.query(
          `UPDATE delivery_outbox
           SET status_envio = 'PROCESSING', updated_at = NOW()
           WHERE id IN (
             SELECT id FROM delivery_outbox
             WHERE status_envio = 'PENDING'
             ORDER BY created_at ASC
             FOR UPDATE SKIP LOCKED
             LIMIT 50
           )
           RETURNING id, tenant_id, provider, origem_id, status, tipo, attempts, created_at`
        );
        rowsToProcess = rows;
      });

      if (rowsToProcess.length === 0) return;

      // Processa as mensagens em paralelo (concorrência HTTP) liberando o client pool
      await Promise.allSettled(
        rowsToProcess.map(async (row) => {
          try {
            const adapter = this.providerFactory.getAdapter(row.provider);
            // AC#1/AD-8: envia ao provedor via ACL. Idempotente: a linha só é
            // enviada uma vez (PENDING→SENT); retry só ocorre enquanto não-SENT.
            if (row.tipo === 'pausa') {
              await adapter.pauseReceiving(row.origem_id);
            } else if (row.tipo === 'retomada') {
              await adapter.resumeReceiving(row.origem_id);
            } else {
              await adapter.syncStatus(row.origem_id, row.tenant_id, row.status);
            }

            await this.db.withPlatform(async (client) => {
              await client.query(
                `UPDATE delivery_outbox
                    SET status_envio = 'SENT', sent_at = NOW(), updated_at = NOW()
                  WHERE id = $1`,
                [row.id]
              );
            });

            // Observabilidade básica (AC#2): latência enfileiramento→envio.
            const latenciaMs = Date.now() - new Date(row.created_at).getTime();
            this.logger.debug(
              `Outbox enviado id=${row.id} status=${row.status} latência=${latenciaMs}ms`
            );
          } catch (err: any) {
            // AC#4: falha temporária não perde a sync — retry com teto.
            this.logger.error(
              `Falha ao sincronizar outbox id=${row.id} (tentativa ${row.attempts + 1}/${OutboxWorkerService.MAX_ATTEMPTS}): ${err.message}`
            );
            await this.db.withPlatform(async (client) => {
              await client.query(
                `UPDATE delivery_outbox
                    SET attempts = attempts + 1,
                        status_envio = CASE WHEN attempts + 1 >= $1 THEN 'FAILED' ELSE 'PENDING' END,
                        error_message = $2,
                        updated_at = NOW()
                  WHERE id = $3`,
                [OutboxWorkerService.MAX_ATTEMPTS, err.message, row.id]
              );
            });
          }
        })
      );
    } catch (err) {
      this.logger.error('Erro fatal no loop do OutboxWorker:', err as any);
    } finally {
      this.isProcessing = false;
    }
  }
}
