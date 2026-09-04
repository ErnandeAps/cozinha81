import { type PgHarness, startPgHarness, seedStaff, seedInquilino } from '../../../testing/pg-harness';
import { CozinhaService } from './cozinha.service';
import { NotFoundException } from '@nestjs/common';

jest.setTimeout(180_000);

describe('Cadastro de Cozinha (Story 8.1)', () => {
  let h: PgHarness;
  let service: CozinhaService;
  let staffId: string;
  let tenantId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    service = new CozinhaService(h.db);
    staffId = await seedStaff(h, 'staff@cozinha81.com', 'senha-forte');
    tenantId = await seedInquilino(h, 'Restaurante Alfa');
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('permite que staff cadastre e liste cozinhas equipadas/não equipadas (AC-1)', async () => {
    // 1) Cadastra cozinha equipada
    const coz1 = await service.criar({ nome: 'Cozinha Principal A', equipada: true });
    expect(coz1.id).toBeTruthy();
    expect(coz1.nome).toBe('Cozinha Principal A');
    expect(coz1.equipada).toBe(true);

    // 2) Cadastra cozinha não equipada
    const coz2 = await service.criar({ nome: 'Cozinha Secundária B', equipada: false });
    expect(coz2.id).toBeTruthy();
    expect(coz2.nome).toBe('Cozinha Secundária B');
    expect(coz2.equipada).toBe(false);

    // 3) Listagem de cozinhas
    const lista = await service.listar();
    expect(lista.length).toBeGreaterThanOrEqual(2);
    expect(lista.some((c) => c.nome === 'Cozinha Principal A')).toBe(true);
    expect(lista.some((c) => c.nome === 'Cozinha Secundária B')).toBe(true);
  });

  it('inclui o nome do inquilino associado na listagem da cozinha', async () => {
    const coz = await service.criar({ nome: 'Cozinha com Inquilino', equipada: true });
    await h.db.withTenant(tenantId, async (c) => {
      await c.query('UPDATE inquilino SET cozinha_id = $1 WHERE id = $2', [coz.id, tenantId]);
    });

    const lista = await service.listar();
    const cozinha = lista.find((item) => item.id === coz.id);

    expect(cozinha).toBeTruthy();
    expect(cozinha?.inquilino_nome).toBe('Restaurante Alfa');
  });

  it('permite associar um inquilino ao cadastrar ou atualizar uma cozinha', async () => {
    const outroTenantId = await seedInquilino(h, 'Restaurante Beta');

    const criada = await service.criar({ nome: 'Cozinha com Seleção', equipada: true, inquilinoId: outroTenantId });
    const inquilinoCraido = await h.db.withTenant(outroTenantId, async (c) =>
      c.query<{ cozinha_id: string | null }>('SELECT cozinha_id FROM inquilino WHERE id = $1', [outroTenantId])
    );

    expect(criada.inquilino_id).toBe(outroTenantId);
    expect(inquilinoCraido.rows[0].cozinha_id).toBe(criada.id);

    const novaCozinha = await service.criar({ nome: 'Cozinha para Reassociar', equipada: false });
    const atualizada = await service.atualizar(novaCozinha.id, { inquilinoId: tenantId });
    const inquilinoAtualizado = await h.db.withTenant(tenantId, async (c) =>
      c.query<{ cozinha_id: string | null }>('SELECT cozinha_id FROM inquilino WHERE id = $1', [tenantId])
    );

    expect(atualizada.inquilino_id).toBe(tenantId);
    expect(inquilinoAtualizado.rows[0].cozinha_id).toBe(novaCozinha.id);
  });

  it('permite obter, atualizar e remover cozinhas', async () => {
    const coz = await service.criar({ nome: 'Cozinha Temp', equipada: false });
    
    // Obter
    const obtida = await service.obter(coz.id);
    expect(obtida.nome).toBe('Cozinha Temp');

    // Atualizar
    const atualizada = await service.atualizar(coz.id, { nome: 'Cozinha Atualizada', equipada: true });
    expect(atualizada.nome).toBe('Cozinha Atualizada');
    expect(atualizada.equipada).toBe(true);

    // Remover
    await service.remover(coz.id);
    await expect(service.obter(coz.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
