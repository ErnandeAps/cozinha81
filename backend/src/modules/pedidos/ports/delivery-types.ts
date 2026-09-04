export interface NormalizedOrderItem {
  id: string; // ID do produto na integração (ou no nosso sistema, caso mapeado)
  nome: string;
  quantidade: number;
  precoUnitario: number;
  notas?: string;
  adicionais?: NormalizedOrderItem[];
}

export interface NormalizedOrder {
  id: string; // ID externo do provedor
  provider: 'ifood' | '99food' | 'manual' | string;
  status: string; // status normalizado da nossa plataforma
  criadoEm: Date;
  clienteNome: string;
  itens: NormalizedOrderItem[];
  total: number;
  pagamentoStatus: string;
}

export interface NormalizedWebhookEvent {
  type: 'order_placed' | 'order_cancelled' | 'status_changed' | 'unknown';
  provider: string;
  rawPayload: any;
  orderId?: string;
  status?: string; // se status_changed
  reason?: string; // se order_cancelled
}
