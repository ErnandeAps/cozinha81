import { type PgHarness, startPgHarness, seedInquilino } from '../../../testing/pg-harness';
import { CozinhaService } from '../cozinhas/cozinha.service';
import { ReservaService } from './reserva.service';
import { ConflictException } from '@nestjs/common';

jest.setTimeout(180_000);

describe('Reservas e Contratos de Período (Story 8.2 & 8.3)', () => {
  let h: PgHarness;
  let cozinhaSvc: CozinhaService;
  let service: ReservaService;
  let tenant1Id: string;
  let tenant2Id: string;
  let cozinhaAId: string;
  let cozinhaBId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    cozinhaSvc = new CozinhaService(h.db);
    service = new ReservaService(h.db);

    tenant1Id = await seedInquilino(h, 'Tenant 1');
    tenant2Id = await seedInquilino(h, 'Tenant 2');

    const cozA = await cozinhaSvc.criar({ nome: 'Cozinha A', equipada: true });
    cozinhaAId = cozA.id;
    const cozB = await cozinhaSvc.criar({ nome: 'Cozinha B', equipada: false });
    cozinhaBId = cozB.id;
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('deve criar uma reserva de slot com sucesso (Story 8.2 AC-1)', async () => {
    const res = await service.criar(cozinhaAId, {
      inicio: '2026-07-01T08:00:00Z',
      fim: '2026-07-01T12:00:00Z',
      modalidade: 'turno',
      tenantId: tenant1Id,
    });

    expect(res.id).toBeTruthy();
    expect(res.cozinha_id).toBe(cozinhaAId);
    expect(res.tenant_id).toBe(tenant1Id);
    expect(res.modalidade).toBe('turno');
    expect(new Date(res.inicio).toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(new Date(res.fim).toISOString()).toBe('2026-07-01T12:00:00.000Z');
  });

  it('deve impedir reserva conflitante na mesma cozinha via banco (Story 8.2 AC-2)', async () => {
    // Mesma cozinha, exatamente o mesmo horário, tenant diferente
    await expect(
      service.criar(cozinhaAId, {
        inicio: '2026-07-01T08:00:00Z',
        fim: '2026-07-01T12:00:00Z',
        modalidade: 'turno',
        tenantId: tenant2Id,
      })
    ).rejects.toBeInstanceOf(ConflictException);

    // Parcialmente sobreposto: 10:00 às 14:00 (sobrepõe 10:00 às 12:00)
    await expect(
      service.criar(cozinhaAId, {
        inicio: '2026-07-01T10:00:00Z',
        fim: '2026-07-01T14:00:00Z',
        modalidade: 'turno',
        tenantId: tenant2Id,
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve permitir reservas sobrepostas em cozinhas diferentes', async () => {
    const res = await service.criar(cozinhaBId, {
      inicio: '2026-07-01T08:00:00Z',
      fim: '2026-07-01T12:00:00Z',
      modalidade: 'turno',
      tenantId: tenant2Id,
    });
    expect(res.id).toBeTruthy();
    expect(res.cozinha_id).toBe(cozinhaBId);
  });

  it('deve atualizar uma reserva existente com sucesso', async () => {
    const criada = await service.criar(cozinhaAId, {
      inicio: '2026-07-20T08:00:00Z',
      fim: '2026-07-20T12:00:00Z',
      modalidade: 'turno',
      tenantId: tenant1Id,
    });

    const atualizada = await service.atualizar(criada.id, {
      cozinhaId: cozinhaAId,
      tenantId: tenant1Id,
      inicio: '2026-07-20T13:00:00Z',
      fim: '2026-07-20T17:00:00Z',
      modalidade: 'turno',
    });

    expect(atualizada.id).toBe(criada.id);
    expect(atualizada.modalidade).toBe('turno');
    expect(new Date(atualizada.inicio).toISOString()).toBe('2026-07-20T13:00:00.000Z');
    expect(new Date(atualizada.fim).toISOString()).toBe('2026-07-20T17:00:00.000Z');
  });

  it('deve aceitar uma reserva no período de almoço com horários pré-definidos', async () => {
    const res = await service.criar(cozinhaAId, {
      inicio: '2026-07-15T10:00:00Z',
      fim: '2026-07-15T15:00:00Z',
      modalidade: 'almoco',
      tenantId: tenant1Id,
    });

    expect(res.id).toBeTruthy();
    expect(res.modalidade).toBe('almoco');
    expect(new Date(res.inicio).toISOString()).toBe('2026-07-15T10:00:00.000Z');
    expect(new Date(res.fim).toISOString()).toBe('2026-07-15T15:00:00.000Z');
  });

  it('deve aceitar duas reservas na mesma cozinha quando os horários não se sobrepõem', async () => {
    const reserva1 = await service.criar(cozinhaAId, {
      inicio: '2026-07-16T10:00:00Z',
      fim: '2026-07-16T15:00:00Z',
      modalidade: 'almoco',
      tenantId: tenant1Id,
    });

    const reserva2 = await service.criar(cozinhaAId, {
      inicio: '2026-07-16T16:00:00Z',
      fim: '2026-07-16T23:00:00Z',
      modalidade: 'jantar',
      tenantId: tenant2Id,
    });

    expect(reserva1.id).toBeTruthy();
    expect(reserva2.id).toBeTruthy();
    expect(reserva2.cozinha_id).toBe(cozinhaAId);
  });
});
