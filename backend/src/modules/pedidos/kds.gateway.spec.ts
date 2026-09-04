import { Test, TestingModule } from '@nestjs/testing';
import { KdsGateway } from './kds.gateway';

describe('KdsGateway', () => {
  let gateway: KdsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KdsGateway],
    }).compile();

    gateway = module.get<KdsGateway>(KdsGateway);
    gateway.server = { emit: jest.fn() } as any;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  it('should store pending messages when sending an order without ack', () => {
    gateway.sendOrderToKds({ orderId: '1', origin: 'ifood', number: '123', items: 2, time: new Date().toISOString() });
    expect(gateway.getPendingOrders().length).toBe(1);
  });
});
