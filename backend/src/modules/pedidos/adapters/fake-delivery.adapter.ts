import { Injectable, Logger } from '@nestjs/common';
import { DeliveryProviderPort } from '../ports/delivery-provider.port';
import { NormalizedWebhookEvent, NormalizedOrder } from '../ports/delivery-types';

@Injectable()
export class FakeDeliveryAdapter implements DeliveryProviderPort {
  private readonly logger = new Logger(FakeDeliveryAdapter.name);

  async validateCredentials(storeId: string, credentialsRaw: string): Promise<boolean> {
    this.logger.debug(`Validando fake credenciais para loja ${storeId}`);
    return true;
  }

  parseWebhook(payload: any): NormalizedWebhookEvent {
    this.logger.debug(`Parsing fake webhook: ${JSON.stringify(payload)}`);
    return {
      type: payload?.type || 'unknown',
      provider: 'fake',
      rawPayload: payload,
      orderId: payload?.orderId,
      status: payload?.status,
    };
  }

  async fetchOrder(orderId: string, tenantId: string): Promise<NormalizedOrder> {
    this.logger.debug(`Fetching fake order ${orderId} for tenant ${tenantId}`);
    return {
      id: orderId,
      provider: 'fake',
      status: 'pending',
      criadoEm: new Date(),
      clienteNome: 'Cliente Fake',
      itens: [{ id: '1', nome: 'Item Fake', quantidade: 1, precoUnitario: 100 }],
      total: 100,
      pagamentoStatus: 'pago',
    };
  }

  async syncStatus(orderId: string, tenantId: string, status: string): Promise<void> {
    this.logger.debug(`Syncing status ${status} for order ${orderId} (tenant ${tenantId})`);
  }

  async cancelOrder(orderId: string, tenantId: string, reason: string): Promise<void> {
    this.logger.debug(`Cancelling order ${orderId} for tenant ${tenantId} (Reason: ${reason})`);
  }

  async pauseReceiving(storeId: string): Promise<void> {
    this.logger.debug(`Pausing fake receiving for store ${storeId}`);
  }

  async resumeReceiving(storeId: string): Promise<void> {
    this.logger.debug(`Resuming fake receiving for store ${storeId}`);
  }
}
