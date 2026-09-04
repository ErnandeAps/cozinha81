import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { InsumoService } from './insumo.service';
import { CusteioService } from './custeio.service';
import { FichaService } from './ficha.service';
import { ProducaoService } from './producao.service';
import { CmvService } from './cmv.service';

jest.setTimeout(180_000);

/** Story 5.2 — CMV em valor do período (FR-17): consumo (baixa+perda) valorado on-read. */
describe('CMV em valor do período (Story 5.2)', () => {
  let h: PgHarness;
  let insumoSvc: InsumoService;
  let custeio: CusteioService;
  let producaoSvc: ProducaoService;
  let cmvSvc: CmvService;
  let tenantId: string;
  let insumoId: string;
  const competencia = new Date().toISOString().slice(0, 7); // mês corrente (now() cai aqui)

  beforeAll(async () => {
    h = await startPgHarness();
    insumoSvc = new InsumoService(h.db);
    custeio = new CusteioService(h.db);
    const fichaSvc = new FichaService(h.db, custeio);
    producaoSvc = new ProducaoService(h.db, fichaSvc, insumoSvc);
    cmvSvc = new CmvService(h.db, fichaSvc, custeio);
    tenantId = await seedInquilino(h, 'Alfa');
    await custeio.definir(tenantId, 'ultimo_preco');

    const ins = await insumoSvc.criar(tenantId, { nome: 'Tomate', unidade_base: 'kg' });
    insumoId = ins.id;
    // entrada 5 @ 1000 → unитário ultimo = 1000/5 por base.
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId,
      quantidade: 5,
      precoCentavos: 1000,
      causeKey: '019056d6-0000-7000-8000-000000000521',
    });
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Molho', itens: [{ insumoId, quantidade: 0.5 }] });

    // baixa de produção: 2 porções → 1.0 base.
    await producaoSvc.registrar(tenantId, { fichaId: ficha.id, quantidade: 2, causeKey: '019056d6-0000-7000-8000-000000000522' });
    // perda: 0.3 base.
    await insumoSvc.registrarPerda(tenantId, insumoId, { quantidade: 0.3, motivo: 'queima', causeKey: '019056d6-0000-7000-8000-000000000523' });
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('AC-1: consolida baixa de produção + perda (não soma entradas)', async () => {
    const r = await cmvSvc.valorPeriodo(tenantId, competencia);
    // (1.0 baixa + 0.3 perda) * 1000 / 5 = 260
    expect(r.cmvValorCentavos).toBe('260');
    expect(r.metodo).toBe('ultimo_preco');
  });

  it('AC-2: o valor muda com o método de custeio (medio_ponderado)', async () => {
    // 2ª entrada 5 @ 2000 → medio = (1000+2000)/(5+5) por base.
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId,
      quantidade: 5,
      precoCentavos: 2000,
      causeKey: '019056d6-0000-7000-8000-000000000524',
    });
    await custeio.definir(tenantId, 'medio_ponderado');

    const r = await cmvSvc.valorPeriodo(tenantId, competencia);
    // 1.3 * 3000 / 10 = 390
    expect(r.cmvValorCentavos).toBe('390');
    expect(r.metodo).toBe('medio_ponderado');
    expect(r.versao).toBe(2);
  });

  it('AC-1: consumo de outro período não entra na competência', async () => {
    // baixa lançada no mês anterior (via admin, criado_em explícito) não conta.
    await h.adminPool.query(
      `INSERT INTO movimento_estoque (tenant_id, insumo_id, tipo, quantidade, cause_key, criado_em)
       VALUES ($1, $2, 'baixa', 9.999, $3, now() - interval '40 days')`,
      [tenantId, insumoId, '019056d6-0000-7000-8000-000000000525'],
    );
    const r = await cmvSvc.valorPeriodo(tenantId, competencia);
    expect(r.cmvValorCentavos).toBe('390'); // inalterado
  });

  it('rejeita competência inválida', async () => {
    await expect(cmvSvc.valorPeriodo(tenantId, '2026/06')).rejects.toThrow();
  });
});
