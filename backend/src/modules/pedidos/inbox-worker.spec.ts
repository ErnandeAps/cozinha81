import { Test, TestingModule } from '@nestjs/testing';
import { InboxWorkerService } from './inbox-worker.service';
import { DatabaseService } from '../../core/database/database.service';
import { PedidosService } from './pedidos.service';
import { DeliveryProviderFactory } from './ports/delivery-provider.factory';
import { IntegracoesService } from './integracoes.service';

type QueryCall = { sql: string; params?: any[] };

describe('InboxWorkerService', () => {
  let service: InboxWorkerService;
  let queries: QueryCall[];
  let pedidosService: any;
  let integracoesService: any;
  let adapter: any;

  /** db mock: o client registra todas as queries; SELECT do inbox devolve 1 PENDING. */
  function buildDb() {
    queries = [];
    return {
      withPlatform: jest.fn().mockImplementation(async (cb) => {
        const client = {
          query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
            queries.push({ sql, params });
            if (sql.includes('FOR UPDATE SKIP LOCKED')) {
              return Promise.resolve({
                rows: [
                  { id: '123', tenant_id: 'tenant-1', provider: 'ifood', payload: { code: 'PLC' }, attempts: 0 },
                ],
              });
            }
            return Promise.resolve({ rows: [] });
          }),
        };
        return cb(client);
      }),
    };
  }

  async function buildService(): Promise<void> {
    const db = buildDb();
    pedidosService = { processarPedidoDelivery: jest.fn(), mudarStatus: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InboxWorkerService,
        { provide: DatabaseService, useValue: db },
        { provide: PedidosService, useValue: pedidosService },
        {
          provide: DeliveryProviderFactory,
          useValue: { getAdapter: jest.fn().mockReturnValue(adapter) },
        },
        { provide: IntegracoesService, useValue: integracoesService },
      ],
    }).compile();

    service = module.get<InboxWorkerService>(InboxWorkerService);
  }

  it('com conexão ativa: processa o inbox e invoca o PedidosService', async () => {
    adapter = {
      parseWebhook: jest.fn().mockReturnValue({ type: 'order_placed', orderId: 'ifood-order-1' }),
      fetchOrder: jest.fn().mockResolvedValue({ id: 'ifood-order-1', status: 'pendente', provider: 'ifood', itens: [] }),
    };
    integracoesService = { isProviderConnected: jest.fn().mockResolvedValue(true) };
    await buildService();

    await service.processInbox();

    expect(integracoesService.isProviderConnected).toHaveBeenCalledWith('tenant-1', 'ifood');
    expect(pedidosService.processarPedidoDelivery).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ id: 'ifood-order-1', provider: 'ifood' })
    );
    expect(queries.some((q) => q.sql.includes("status = 'PROCESSED'"))).toBe(true);
  });

  it('AC#2 (7.2): sem conexão ativa, NÃO ingere o pedido', async () => {
    adapter = {
      parseWebhook: jest.fn().mockReturnValue({ type: 'order_placed', orderId: 'ifood-order-1' }),
      fetchOrder: jest.fn(),
    };
    integracoesService = { isProviderConnected: jest.fn().mockResolvedValue(false) };
    await buildService();

    await service.processInbox();

    expect(pedidosService.processarPedidoDelivery).not.toHaveBeenCalled();
  });

  it('AC#3 (7.3): falha no processamento mantém PENDING para retry com teto de tentativas', async () => {
    adapter = {
      parseWebhook: jest.fn().mockReturnValue({ type: 'order_placed', orderId: 'ifood-order-1' }),
      fetchOrder: jest.fn().mockRejectedValue(new Error('provedor indisponível')),
    };
    integracoesService = { isProviderConnected: jest.fn().mockResolvedValue(true) };
    await buildService();

    await service.processInbox();

    // Não marcou PROCESSED; emitiu o UPDATE de retry com attempts e o teto MAX_ATTEMPTS.
    expect(queries.some((q) => q.sql.includes("status = 'PROCESSED'"))).toBe(false);
    const retry = queries.find((q) => q.sql.includes('attempts = attempts + 1'));
    expect(retry).toBeDefined();
    expect(retry!.sql).toContain("CASE WHEN attempts + 1 >= $1 THEN 'FAILED' ELSE 'PENDING' END");
    expect(retry!.params?.[0]).toBe(InboxWorkerService.MAX_ATTEMPTS);
  });
});
