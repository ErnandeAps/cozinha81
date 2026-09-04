import { Injectable, Logger } from '@nestjs/common';
import { DeliveryProviderPort } from '../ports/delivery-provider.port';
import { NormalizedWebhookEvent, NormalizedOrder } from '../ports/delivery-types';

@Injectable()
export class IfoodAdapter implements DeliveryProviderPort {
  private readonly logger = new Logger(IfoodAdapter.name);

  async validateCredentials(storeId: string, credentialsRaw: string): Promise<boolean> {
    // AC#5: logar só o storeId — nunca o segredo bruto.
    this.logger.debug(`Validando credenciais iFood para loja ${storeId}`);
    // Em uma implementação real faríamos um request para a API do iFood para pegar um token.
    return Boolean(storeId?.trim() && credentialsRaw?.trim());
  }

  parseWebhook(payload: any): NormalizedWebhookEvent {
    return {
      type: 'unknown',
      provider: 'ifood',
      rawPayload: payload,
    };
  }

  async fetchOrder(orderId: string, tenantId: string): Promise<NormalizedOrder> {
    throw new Error('Not implemented yet');
  }

  async syncStatus(orderId: string, tenantId: string, status: string): Promise<void> {
    this.logger.debug(`Sync status ifood: ${status}`);
  }

  async cancelOrder(orderId: string, tenantId: string, reason: string): Promise<void> {
    this.logger.debug(`Cancel order ifood: ${reason}`);
  }

  async pauseReceiving(storeId: string): Promise<void> {
    // Implementação real na Story 7.5 (pausar recebimento).
    this.logger.debug(`Pause receiving ifood: loja ${storeId}`);
  }

  async resumeReceiving(storeId: string): Promise<void> {
    // Implementação real na Story 7.5 (retomar recebimento).
    this.logger.debug(`Resume receiving ifood: loja ${storeId}`);
  }
}
