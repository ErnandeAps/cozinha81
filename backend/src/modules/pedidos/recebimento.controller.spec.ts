import { BadRequestException } from '@nestjs/common';
import { RecebimentoController } from './recebimento.controller';

/**
 * Story 7.5 — AC#3: pausar é ação destrutiva e exige confirmação explícita.
 */
describe('RecebimentoController — confirmação destrutiva (Story 7.5)', () => {
  const service = { pausar: jest.fn(), reativar: jest.fn(), estado: jest.fn() } as any;
  const controller = new RecebimentoController(service);

  beforeEach(() => jest.clearAllMocks());

  it('rejeita pausar sem confirmar=true e não toca o serviço', async () => {
    await expect(controller.pausar('t1', {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.pausar('t1', { confirmar: false })).rejects.toBeInstanceOf(BadRequestException);
    expect(service.pausar).not.toHaveBeenCalled();
  });

  it('pausa quando confirmar=true', async () => {
    const r = await controller.pausar('t1', { confirmar: true });
    expect(r).toEqual({ success: true });
    expect(service.pausar).toHaveBeenCalledWith('t1');
  });

  it('reativar não exige confirmação', async () => {
    const r = await controller.reativar('t1');
    expect(r).toEqual({ success: true });
    expect(service.reativar).toHaveBeenCalledWith('t1');
  });
});
