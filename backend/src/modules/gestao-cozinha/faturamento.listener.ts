import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CmvService } from './cmv.service';

@Injectable()
export class FaturamentoListener {
  private readonly logger = new Logger(FaturamentoListener.name);

  constructor(private readonly cmvService: CmvService) {}

  @OnEvent('pedidos.faturamento_periodo_atualizado')
  async handleFaturamentoAtualizado(event: { tenantId: string; competencia: string; operacao: 'adicionar' | 'subtrair'; valorCentavos: string | number }) {
    this.logger.log(`Faturamento ajustado [${event.competencia}]: ${event.operacao} ${event.valorCentavos} centavos`);
    await this.cmvService.ajustarFaturamentoPedidos(event.tenantId, event.competencia, event.operacao, BigInt(event.valorCentavos));
  }
}
