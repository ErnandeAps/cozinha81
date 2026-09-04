import { Injectable, BadRequestException } from '@nestjs/common';
import { DeliveryProviderPort } from './delivery-provider.port';
import { IfoodAdapter } from '../adapters/ifood.adapter';
import { NoveNoveFoodAdapter } from '../adapters/99food.adapter';
import { FakeDeliveryAdapter } from '../adapters/fake-delivery.adapter';

@Injectable()
export class DeliveryProviderFactory {
  constructor(
    private readonly ifoodAdapter: IfoodAdapter,
    private readonly noveNoveAdapter: NoveNoveFoodAdapter,
    private readonly fakeAdapter: FakeDeliveryAdapter
  ) {}

  getAdapter(providerName: string): DeliveryProviderPort {
    switch (providerName) {
      case 'ifood':
        return this.ifoodAdapter;
      case '99food':
        return this.noveNoveAdapter;
      case 'fake':
        return this.fakeAdapter;
      default:
        throw new BadRequestException(`Provedor de delivery desconhecido: ${providerName}`);
    }
  }
}
