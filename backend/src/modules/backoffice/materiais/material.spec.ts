import { type PgHarness, startPgHarness, seedInquilino, seedStaff } from '../../../testing/pg-harness';
import { MaterialService } from './material.service';
import { NotFoundException } from '@nestjs/common';

jest.setTimeout(180_000);

describe('Controle de Materiais e Ledger (Story 9.3)', () => {
  let h: PgHarness;
  let service: MaterialService;
  let tenantId: string;
  let staffId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    service = new MaterialService(h.db);

    tenantId = await seedInquilino(h, 'Pizzaria Express');
    staffId = await seedStaff(h, 'staff@cozinha81.com', 'pwd');
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('permite cadastrar materiais e registrar movimentos no ledger append-only', async () => {
    // 1) Cadastra material
    const mat = await service.criar('Papel Toalha');
    expect(mat.id).toBeTruthy();
    expect(mat.nome).toBe('Papel Toalha');

    // 2) Registra Entrada (reabastecimento)
    const entrada = await service.registrarMovimento(mat.id, 'entrada', 100, 0, null, staffId);
    expect(entrada.id).toBeTruthy();
    expect(entrada.tipo).toBe('entrada');
    expect(entrada.quantidade).toBe(100);

    // 3) Verifica saldo (100)
    let saldo = await service.obterSaldo(mat.id);
    expect(saldo).toBe(100);

    // 4) Registra Consumo por Inquilino (25 unidades)
    const consumo = await service.registrarMovimento(mat.id, 'consumo', 25, 500, tenantId, staffId); // 500 centavos = R$ 5,00
    expect(consumo.id).toBeTruthy();
    expect(consumo.tipo).toBe('consumo');
    expect(consumo.tenant_id).toBe(tenantId);
    expect(consumo.valor_unitario).toBe(500);

    // 5) Verifica saldo atualizado (75)
    saldo = await service.obterSaldo(mat.id);
    expect(saldo).toBe(75);
  });

  it('valida que RLS isola listagem de consumos do inquilino', async () => {
    const mat = await service.criar('Touca Descartável');
    const outroTenantId = await seedInquilino(h, 'Outro Tenant');

    // Registra consumo para tenant 1
    await service.registrarMovimento(mat.id, 'consumo', 10, 200, tenantId, staffId);
    // Registra consumo para tenant 2
    await service.registrarMovimento(mat.id, 'consumo', 5, 200, outroTenantId, staffId);

    // Tenant 1 lista seus consumos
    const consumosTenant1 = await service.listarConsumosPorTenant(tenantId);
    expect(consumosTenant1.length).toBeGreaterThanOrEqual(1);
    expect(consumosTenant1.every(c => c.tenant_id === tenantId)).toBe(true);

    // Staff/Platform lista todos os consumos
    const todosConsumos = await service.listarTodosConsumos();
    expect(todosConsumos.some(c => c.tenant_id === tenantId)).toBe(true);
    expect(todosConsumos.some(c => c.tenant_id === outroTenantId)).toBe(true);
  });

  it('lança exceção ao registrar movimento para material inexistente', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    await expect(
      service.registrarMovimento(fakeId, 'entrada', 10, 0, null, staffId)
    ).rejects.toThrow(NotFoundException);
  });
});
