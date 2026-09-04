import { type PgHarness, startPgHarness, seedInquilino } from '../../../testing/pg-harness';
import { PresencaService } from './presenca.service';
import { CozinhaService } from '../cozinhas/cozinha.service';
import { NotFoundException } from '@nestjs/common';

jest.setTimeout(180_000);

describe('Registro de Presenca e Checklist (Story 9.1 & 9.2)', () => {
  let h: PgHarness;
  let service: PresencaService;
  let cozinhaService: CozinhaService;
  let tenant1Id: string;
  let tenant2Id: string;
  let cozinhaId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    service = new PresencaService(h.db);
    cozinhaService = new CozinhaService(h.db);

    tenant1Id = await seedInquilino(h, 'Restaurante Alfa');
    tenant2Id = await seedInquilino(h, 'Pizzaria Beta');

    const cozinha = await cozinhaService.criar({ nome: 'Cozinha Central', equipada: true });
    cozinhaId = cozinha.id;
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('permite check-in e check-out com checklist anexado', async () => {
    const checklistIn = { limpeza: true, equipamento: true, observacoes: 'Tudo OK' };

    // Check-in
    const checkin = await service.registrar(cozinhaId, tenant1Id, 'in', checklistIn);
    expect(checkin.id).toBeTruthy();
    expect(checkin.cozinha_id).toBe(cozinhaId);
    expect(checkin.tenant_id).toBe(tenant1Id);
    expect(checkin.tipo).toBe('in');
    expect(checkin.checklist).toEqual(checklistIn);

    // Check-out
    const checkout = await service.registrar(cozinhaId, tenant1Id, 'out', { limpeza: true, equipamento: false, observacoes: 'Forno quebrado' });
    expect(checkout.id).toBeTruthy();
    expect(checkout.tipo).toBe('out');
    expect(checkout.checklist.equipamento).toBe(false);
  });

  it('valida que RLS isola listagem de presenças por tenant', async () => {
    // Registra presença para tenant 2
    await service.registrar(cozinhaId, tenant2Id, 'in', { limpeza: true, equipamento: true });

    // Inquilino 1 lista histórico
    const listaTenant1 = await service.listarPorCozinha(cozinhaId, tenant1Id);
    expect(listaTenant1.every(r => r.tenant_id === tenant1Id)).toBe(true);

    // Inquilino 2 lista histórico
    const listaTenant2 = await service.listarPorCozinha(cozinhaId, tenant2Id);
    expect(listaTenant2.some(r => r.tenant_id === tenant2Id)).toBe(true);
    expect(listaTenant2.every(r => r.tenant_id !== tenant1Id)).toBe(true);

    // Staff/Platform lista histórico (vê tudo)
    const listaPlatform = await service.listarPorCozinha(cozinhaId);
    expect(listaPlatform.some(r => r.tenant_id === tenant1Id)).toBe(true);
    expect(listaPlatform.some(r => r.tenant_id === tenant2Id)).toBe(true);
  });

  it('lança exceção ao registrar presença em cozinha inexistente', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(service.registrar(fakeId, tenant1Id, 'in')).rejects.toThrow(NotFoundException);
  });
});
