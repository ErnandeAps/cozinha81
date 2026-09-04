import { Test, TestingModule } from '@nestjs/testing';
import { PedidosController } from './pedidos.controller';
import { PedidosService } from './pedidos.service';
import { ModuloGuard } from '../../core/gating/modulo.guard';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../core/auth/roles.guard';

describe('PedidosController', () => {
  let controller: PedidosController;
  let service: jest.Mocked<PedidosService>;

  beforeEach(async () => {
    service = {
      criarPedidoManual: jest.fn(),
      mudarStatus: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PedidosController],
      providers: [
        { provide: PedidosService, useValue: service },
      ],
    })
    .overrideGuard(ModuloGuard).useValue({ canActivate: () => true })
    .overrideGuard(AuthGuard('jwt')).useValue({ canActivate: () => true })
    .overrideGuard(RolesGuard).useValue({ canActivate: () => true })
    .compile();

    controller = module.get<PedidosController>(PedidosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should create manual order', async () => {
    const tenantId = 't1';
    const dto = { itens: [] };
    
    await controller.criarPedidoManual(tenantId, dto);
    
    expect(service.criarPedidoManual).toHaveBeenCalledWith('t1', dto);
  });

  it('should throw error if tenantId is missing', async () => {
    const tenantId = '';
    const dto = { itens: [] };
    
    await expect(controller.criarPedidoManual(tenantId, dto)).rejects.toThrow('Tenant context missing');
  });

  it('should call service for mudarStatus', async () => {
    const tenantId = 't1';
    const dto = { status: 'preparo', cause_key: 'uuid-1' };
    
    await controller.mudarStatus(tenantId, 'pedido-1', dto);
    
    expect(service.mudarStatus).toHaveBeenCalledWith('t1', 'pedido-1', dto);
  });
});
