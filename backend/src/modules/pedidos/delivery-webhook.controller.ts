import { Controller, Post, Body, Param, Req, Res } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

@Controller('webhooks/delivery')
export class DeliveryWebhookController {
  constructor(private readonly db: DatabaseService) {}

  @Post(':tenantId/:provider')
  async receiveWebhook(
    @Param('tenantId') tenantId: string,
    @Param('provider') provider: string,
    @Body() payload: any,
    @Res() res: Response
  ) {
    // Nós retornamos rápido, sem bloquear o provedor.
    // E inserimos as mensagens no inbox para processamento transacional.
    const events = Array.isArray(payload) ? payload : [payload];

    try {
      // Usamos runScoped no nivel de tenant para satisfazer a RLS da tabela
      await this.db.withTenant(tenantId, async (client) => {
        for (const event of events) {
          // Extraímos um ID de evento para deduplicação, se existir, senão geramos um.
          // O iFood manda { id, code, fullCode, ... }
          const eventId = event.id || event.eventId || randomUUID();

          await client.query(
            `INSERT INTO delivery_inbox (tenant_id, provider, provider_event_id, payload)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (tenant_id, provider, provider_event_id) DO NOTHING`,
            [tenantId, provider, eventId, event]
          );
        }
      });
    } catch (err) {
      // Como não queremos que o iFood fique travado ou tentando novamente ad infinitum se a falha for nossa DB caindo?
      // Se a DB estiver offline, é melhor retornar 500 para ele tentar novamente.
      console.error('Falha ao enfileirar webhook de delivery:', err);
      return res.status(500).send('Internal Server Error');
    }

    // Retorna 200 OK imediato
    return res.status(200).send('OK');
  }
}
