import { Test, TestingModule } from '@nestjs/testing';
import { PedidosService } from './pedidos.service';
import { DatabaseService } from '../../core/database/database.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KdsGateway } from './kds.gateway';
import { PoolClient } from 'pg';

describe('PedidosService', () => {
  let service: PedidosService;
  let db: jest.Mocked<DatabaseService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let kdsGateway: jest.Mocked<KdsGateway>;
  let mockClient: jest.Mocked<PoolClient>;

  beforeEach(async () => {
    mockClient = {
      query: jest.fn(),
    } as any;

    db = {
      withTenant: jest.fn().mockImplementation((tenantId, cb) => cb(mockClient)),
    } as any;

    eventEmitter = {
      emit: jest.fn(),
    } as any;

    kdsGateway = {
      server: {
        emit: jest.fn(),
      }
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PedidosService,
        { provide: DatabaseService, useValue: db },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: KdsGateway, useValue: kdsGateway },
      ],
    }).compile();

    service = module.get<PedidosService>(PedidosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create manual order and emit events', async () => {
    const tenantId = 'tenant-123';
    const dto = {
      itens: [{ id: '1', quantidade: 2, nome: 'Item 1' }]
    };

    const mockPedido = { id: 'order-123', numero: 1, criado_em: new Date() };
    (mockClient.query as jest.Mock).mockResolvedValueOnce({ rows: [mockPedido] }); // insert pedido
    (mockClient.query as jest.Mock).mockResolvedValueOnce({ rows: [] }); // insert status

    const result = await service.criarPedidoManual(tenantId, dto);

    expect(result).toEqual(mockPedido);
    expect(mockClient.query).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).toHaveBeenCalledWith('pedido.criado', expect.objectContaining({
      tenantId, pedidoId: 'order-123', origem: 'Manual'
    }));
    expect(kdsGateway.server.emit).toHaveBeenCalledWith('newOrder', expect.any(Object), expect.any(Function));
  });

  it('should change status and emit WS event', async () => {
    const tenantId = 't1';
    const dto = { status: 'preparo', cause_key: 'uuid-1' };
    const mockStatus = { id: 'st-1', status: 'preparo' };

    (mockClient.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [{ origem: 'Manual', origem_id: null, itens: [], criado_em: new Date('2026-06-15T12:00:00Z'), valor_centavos: 0n, previous_status: null }] }) // select pedido
      .mockResolvedValueOnce({ rows: [mockStatus] }); // insert status

    const result = await service.mudarStatus(tenantId, 'pedido-1', dto);
    
    expect(result).toEqual({ success: true, status: mockStatus });
    expect(kdsGateway.server.emit).toHaveBeenCalledWith('orderStatusChanged', {
      orderId: 'pedido-1', status: 'preparo', causeKey: 'uuid-1'
    });
    expect(eventEmitter.emit).not.toHaveBeenCalledWith('pedido.despachado', expect.any(Object));
  });

  it('should emit pedido.despachado when status is despachado', async () => {
    const tenantId = 't1';
    const dto = { status: 'despachado', cause_key: 'uuid-2' };
    const mockStatus = { id: 'st-2', status: 'despachado' };
    const mockPedido = { origem: 'Manual', itens: [{ id: '1', quantidade: 1 }], criado_em: new Date('2026-06-15T12:00:00Z'), valor_centavos: 0n, previous_status: 'preparo' };
    
    (mockClient.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockPedido] }) // select pedido
      .mockResolvedValueOnce({ rows: [mockStatus] }); // insert status
    
    const result = await service.mudarStatus(tenantId, 'pedido-1', dto);
    
    expect(result.success).toBe(true);
    expect(eventEmitter.emit).toHaveBeenCalledWith('pedido.despachado', {
      tenantId, pedidoId: 'pedido-1', origem: 'Manual', itens: mockPedido.itens, causeKey: 'uuid-2'
    });
  });

  it('should emit pedidos.faturamento_periodo_atualizado when status is concluido/entregue/cancelado', async () => {
    const tenantId = 't1';
    const dto = { status: 'concluido', cause_key: 'uuid-2' };
    const mockStatus = { id: 'st-2', status: 'concluido' };
    const mockPedido = { origem: 'ifood', origem_id: 'ext-123', itens: [], criado_em: new Date('2026-06-15T12:00:00Z'), valor_centavos: 15000n, previous_status: 'preparo' };
    
    (mockClient.query as jest.Mock)
      .mockResolvedValueOnce({ rows: [mockPedido] }) // select pedido
      .mockResolvedValueOnce({ rows: [mockStatus] }) // insert status
      .mockResolvedValueOnce({ rows: [] }); // insert outbox
    
    const result = await service.mudarStatus(tenantId, 'pedido-1', dto);
    
    expect(result.success).toBe(true);
    expect(eventEmitter.emit).toHaveBeenCalledWith('pedidos.faturamento_periodo_atualizado', {
      tenantId, competencia: '2026-06', operacao: 'adicionar', valorCentavos: 15000n
    });
  });

  it('should handle idempotent duplicated request', async () => {
    const tenantId = 't1';
    const dto = { status: 'preparo', cause_key: 'uuid-1' };
    
    (mockClient.query as jest.Mock).mockRejectedValueOnce({ code: '23505' });
    
    const result = await service.mudarStatus(tenantId, 'pedido-1', dto);
    
    expect(result).toEqual({ success: true, deduplicated: true });
    expect(kdsGateway.server.emit).not.toHaveBeenCalled();
  });
});
