import { BadRequestException } from '@nestjs/common';
import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { InsumoService } from './insumo.service';
import { CusteioService } from './custeio.service';
import { FichaService } from './ficha.service';

jest.setTimeout(180_000);

describe('Sub-receitas até 3 níveis, sem ciclo (Story 3.3)', () => {
  let h: PgHarness;
  let insumoSvc: InsumoService;
  let fichaSvc: FichaService;
  let tenantId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    insumoSvc = new InsumoService(h.db);
    const custeio = new CusteioService(h.db);
    fichaSvc = new FichaService(h.db, custeio);
    tenantId = await seedInquilino(h, 'Alfa');
    await custeio.definir(tenantId, 'ultimo_preco');
  });

  afterAll(async () => {
    await h?.stop();
  });

  async function fichaComInsumo(nome: string, qtdBase: number): Promise<string> {
    const ins = await insumoSvc.criar(tenantId, { nome: `${nome}-insumo`, unidade_base: 'kg' });
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId: ins.id,
      quantidade: 1,
      precoCentavos: 1000, // R$10/kg → 1000 centavos por kg
      causeKey: `019056d6-0000-7000-8000-${Math.random().toString(16).slice(2, 14).padEnd(12, '0')}`,
    });
    const f = await fichaSvc.criar(tenantId, { nome, itens: [{ insumoId: ins.id, quantidade: qtdBase }] });
    return f.id;
  }

  it('AC-1: custo agrega a sub-ficha (on-read)', async () => {
    const base = await fichaComInsumo('Base', 0.5); // custo/porção = 1000 * 0.5 / 1 = 500
    const prato = await fichaSvc.criar(tenantId, { nome: 'Prato', itens: [{ subFichaId: base, quantidade: 2 }] }); // 2 porções
    const custo = await fichaSvc.calcularCusto(tenantId, prato.id);
    expect(custo.custoPorcaoCentavos).toBe('1000'); // 500 (porção da base) * 2 porções
  });

  it('AC-2: composição que excede 3 níveis é bloqueada', async () => {
    const a = await fichaComInsumo('A3', 0.1);
    const b = await fichaSvc.criar(tenantId, { nome: 'B3', itens: [{ subFichaId: a, quantidade: 1 }] }); // nível 2
    const c = await fichaSvc.criar(tenantId, { nome: 'C3', itens: [{ subFichaId: b.id, quantidade: 1 }] }); // nível 3
    // D referenciando C criaria nível 4
    await expect(
      fichaSvc.criar(tenantId, { nome: 'D3', itens: [{ subFichaId: c.id, quantidade: 1 }] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('AC-2: adicionar item que empurraria um ANCESTRAL ao 4º nível é bloqueado', async () => {
    const a = await fichaComInsumo('AA', 0.1);
    const b = await fichaSvc.criar(tenantId, { nome: 'BB', itens: [{ subFichaId: a, quantidade: 1 }] });
    // C → B → A já é nível 3
    await fichaSvc.criar(tenantId, { nome: 'CC', itens: [{ subFichaId: b.id, quantidade: 1 }] });
    const s = await fichaComInsumo('SS', 0.1);
    // adicionar S como sub de A faria C→B→A→S = nível 4
    await expect(
      fichaSvc.adicionarItem(tenantId, a, { subFichaId: s, quantidade: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('AC-3: referência circular é impedida', async () => {
    const x = await fichaComInsumo('X', 0.1);
    const y = await fichaSvc.criar(tenantId, { nome: 'Y', itens: [{ subFichaId: x, quantidade: 1 }] });
    // tentar fazer X usar Y como sub → X→Y→X = ciclo
    await expect(
      fichaSvc.adicionarItem(tenantId, x, { subFichaId: y.id, quantidade: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uma Ficha não pode referenciar a si mesma', async () => {
    const z = await fichaComInsumo('Z', 0.1);
    await expect(
      fichaSvc.adicionarItem(tenantId, z, { subFichaId: z, quantidade: 1 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
