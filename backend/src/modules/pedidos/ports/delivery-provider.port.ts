import { NormalizedWebhookEvent, NormalizedOrder } from './delivery-types';

/**
 * Porta (Anti-Corruption Layer) que define o contrato que o nosso módulo de pedidos 
 * exige para se comunicar com provedores de delivery, isolando o nosso domínio
 * das idiossincrasias do iFood, 99Food, etc.
 */
export abstract class DeliveryProviderPort {
  /**
   * Valida as credenciais junto à origem (test-connection).
   */
  abstract validateCredentials(storeId: string, credentialsRaw: string): Promise<boolean>;

  /**
   * Converte um payload bruto recebido via webhook em um formato canônico e previsível.
   */
  abstract parseWebhook(payload: any): NormalizedWebhookEvent;

  /**
   * Busca os detalhes de um pedido na origem e converte para o formato de domínio.
   */
  abstract fetchOrder(orderId: string, tenantId: string): Promise<NormalizedOrder>;

  /**
   * Sincroniza uma mudança de status do nosso lado para a origem.
   */
  abstract syncStatus(orderId: string, tenantId: string, status: string): Promise<void>;

  /**
   * Pede o cancelamento da ordem no provedor de delivery.
   */
  abstract cancelOrder(orderId: string, tenantId: string, reason: string): Promise<void>;

  /**
   * Pausa a recepção de novos pedidos na loja (fechar loja virtualmente).
   */
  abstract pauseReceiving(storeId: string): Promise<void>;

  /**
   * Retoma a recepção de pedidos na loja.
   */
  abstract resumeReceiving(storeId: string): Promise<void>;
}
