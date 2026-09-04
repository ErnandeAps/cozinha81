import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ProducaoService, RegistrarProducaoDto } from './producao.service';
import { ReconciliacaoService, PedidoItemRef, causeKeyPedidoItem } from './reconciliacao.service';

interface PedidoDespachadoEvent {
  tenantId: string;
  pedidoId: string;
  origem: string;
  itens: { id: string; ficha_id?: string; quantidade: number; nome: string }[];
  causeKey: string;
}

interface PedidoCanceladoEvent {
  tenantId: string;
  pedidoId: string;
  itens: PedidoItemRef[];
}

@Injectable()
export class EstoqueListener {
  constructor(
    private readonly producaoService: ProducaoService,
    private readonly reconciliacao: ReconciliacaoService
  ) {}

  @OnEvent('pedido.despachado')
  async handlePedidoDespachado(event: PedidoDespachadoEvent) {
    // Verifica de antemão se já estava cancelado (baixa tardia)
    const pedidoCancelado = await this.reconciliacao.isCancelado(event.tenantId, event.pedidoId);

    // Para cada item com ficha_id, registra a produção para gerar a baixa automática.
    // Se pedidoCancelado=true, a ProducaoService fará baixa+estorno atomicamente (AD-13).
    for (const item of event.itens) {
      if (item.ficha_id) {
        const dto: RegistrarProducaoDto = {
          fichaId: item.ficha_id,
          quantidade: item.quantidade,
          // cause_key (uuid) ESTÁVEL por (pedido, item): torna a baixa idempotente
          // por item de pedido e localizável pela reconciliação de cancelamento.
          causeKey: causeKeyPedidoItem(event.pedidoId, item.id),
          pedidoCancelado, // passa a flag para processamento atômico
        };
        try {
          await this.producaoService.registrar(event.tenantId, dto);
        } catch (err) {
          console.error(`Erro ao baixar estoque para pedido ${event.pedidoId}`, err);
        }
      }
    }
  }

  @OnEvent('pedido.cancelado')
  async handlePedidoCancelado(event: PedidoCanceladoEvent) {
    // AC#2/#4 (7.6): marca o cancelamento e estorna baixas existentes (idempotente).
    await this.reconciliacao.cancelarEEstornar(event.tenantId, event.pedidoId, event.itens);
  }
}
