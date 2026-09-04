import { Injectable, Logger } from '@nestjs/common';
import { DeliveryProviderPort } from '../ports/delivery-provider.port';
import { NormalizedWebhookEvent, NormalizedOrder } from '../ports/delivery-types';

@Injectable()
export class NoveNoveFoodAdapter implements DeliveryProviderPort {
  private readonly logger = new Logger(NoveNoveFoodAdapter.name);

  async validateCredentials(storeId: string, credentialsRaw: string): Promise<boolean> {
    // AC#5: logar só o storeId — nunca o segredo bruto.
    this.logger.debug(`Validando credenciais 99Food para loja ${storeId}`);
    return Boolean(storeId?.trim() && credentialsRaw?.trim());
  }

  parseWebhook(payload: any): NormalizedWebhookEvent {
    return {
      type: 'unknown',
      provider: '99food',
      rawPayload: payload,
    };
  }

  async fetchOrder(orderId: string, tenantId: string): Promise<NormalizedOrder> {
    throw new Error('Not implemented yet');
  }

  async syncStatus(orderId: string, tenantId: string, status: string): Promise<void> {
    // Implementação real na Story 7.4 (sync bidirecional).
    this.logger.debug(`Sync status 99food: ${status}`);
  }

  async cancelOrder(orderId: string, tenantId: string, reason: string): Promise<void> {
    // Implementação real na Story 7.6 (cancelamento/estorno).
    this.logger.debug(`Cancel order 99food: ${reason}`);
  }

  async pauseReceiving(storeId: string): Promise<void> {
    // Implementação real na Story 7.5 (pausar recebimento).
    this.logger.debug(`Pause receiving 99food: loja ${storeId}`);
  }

  async resumeReceiving(storeId: string): Promise<void> {
    // Implementação real na Story 7.5 (retomar recebimento).
    this.logger.debug(`Resume receiving 99food: loja ${storeId}`);
  }
}
