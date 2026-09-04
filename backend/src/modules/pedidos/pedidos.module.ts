import { Module } from '@nestjs/common';
import { KdsGateway } from './kds.gateway';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { IntegracoesController } from './integracoes.controller';
import { IntegracoesService } from './integracoes.service';
import { DeliveryWebhookController } from './delivery-webhook.controller';
import { InboxWorkerService } from './inbox-worker.service';
import { OutboxWorkerService } from './outbox-worker.service';
import { RecebimentoController } from './recebimento.controller';
import { RecebimentoService } from './recebimento.service';
import { CoreModule } from '../../core/core.module';
import { DeliveryProviderPort } from './ports/delivery-provider.port';
import { FakeDeliveryAdapter } from './adapters/fake-delivery.adapter';
import { IfoodAdapter } from './adapters/ifood.adapter';
import { NoveNoveFoodAdapter } from './adapters/99food.adapter';
import { DeliveryProviderFactory } from './ports/delivery-provider.factory';

@Module({
  imports: [CoreModule],
  controllers: [PedidosController, IntegracoesController, DeliveryWebhookController, RecebimentoController],
  providers: [
    KdsGateway, 
    PedidosService,
    IntegracoesService,
    InboxWorkerService,
    OutboxWorkerService,
    RecebimentoService,
    IfoodAdapter,
    NoveNoveFoodAdapter,
    FakeDeliveryAdapter,
    DeliveryProviderFactory,
    {
      provide: DeliveryProviderPort,
      useExisting: DeliveryProviderFactory // fallback para quem ainda injeta o port diretamente, embora agora deva injetar via factory
    }
  ],
  exports: [KdsGateway],
})
export class PedidosModule {}
