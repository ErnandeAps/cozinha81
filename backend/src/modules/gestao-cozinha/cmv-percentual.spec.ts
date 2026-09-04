import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { InsumoService } from './insumo.service';
import { CusteioService } from './custeio.service';
import { FichaService } from './ficha.service';
import { ProducaoService } from './producao.service';
import { CmvService } from './cmv.service';

jest.setTimeout(180_000);

/** Story 5.3 — CMV% com faturamento manual bruto (FR-18). */
describe('CMV% com faturamento manual (Story 5.3)', () => {
  let h: PgHarness;
  let cmvSvc: CmvService;
  let tenantId: string;
  const competencia = new Date().toISOString().slice(0, 7);

  beforeAll(async () => {
    h = await startPgHarness();
    const insumoSvc = new InsumoService(h.db);
    const custeio = new CusteioService(h.db);
    const fichaSvc = new FichaService(h.db, custeio);
    const producaoSvc = new ProducaoService(h.db, fichaSvc, insumoSvc);
    cmvSvc = new CmvService(h.db, fichaSvc, custeio);
    tenantId = await seedInquilino(h, 'Alfa');
    await custeio.definir(tenantId, 'ultimo_preco');

    const ins = await insumoSvc.criar(tenantId, { nome: 'Tomate', unidade_base: 'kg' });
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId: ins.id,
      quantidade: 5,
      precoCentavos: 1000,
      causeKey: '019056d6-0000-7000-8000-000000000531',
    });
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Molho', itens: [{ insumoId: ins.id, quantidade: 0.5 }] });
    // baixa 1.0 base → CMV valor = 1.0 * 1000 / 5 = 200 centavos.
    await producaoSvc.registrar(tenantId, { fichaId: ficha.id, quantidade: 2, causeKey: '019056d6-0000-7000-8000-000000000532' });
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('sem faturamento informado, CMV% é null', async () => {
    const r = await cmvSvc.valorPeriodo(tenantId, competencia);
    expect(r.cmvValorCentavos).toBe('200');
    expect(r.cmvPercentual).toBeNull();
  });

  it('AC-1: CMV% = CMV valor ÷ faturamento (bruto)', async () => {
    await cmvSvc.definirFaturamentoManual(tenantId, competencia, 1000); // R$10,00
    const r = await cmvSvc.valorPeriodo(tenantId, competencia);
    // 200 / 1000 = 20.00%
    expect(r.cmvPercentual).toBe('20.00');
    expect(r.faturamentoCentavos).toBe('1000');
    expect(r.faturamentoOrigem).toBe('manual');
  });

  it('AC-2: comissão NÃO reduz a base (faturamento é bruto)', async () => {
    // O valor informado é o bruto; o sistema não desconta comissão.
    await cmvSvc.definirFaturamentoManual(tenantId, competencia, 800); // re-informa
    const r = await cmvSvc.valorPeriodo(tenantId, competencia);
    // 200 / 800 = 25.00% (base = bruto informado, sem dedução)
    expect(r.cmvPercentual).toBe('25.00');
  });

  it('AC-4: faturamento de Pedidos tem precedência sobre o manual (nunca somados)', async () => {
    await cmvSvc.definirFaturamentoManual(tenantId, competencia, 800);
    // simula o automático do Épico 7 (origem='pedidos')
    await h.adminPool.query(
      `INSERT INTO faturamento_periodo (tenant_id, competencia, origem, valor_centavos)
       VALUES ($1, $2, 'pedidos', 2000)`,
      [tenantId, competencia],
    );
    const r = await cmvSvc.valorPeriodo(tenantId, competencia);
    expect(r.faturamentoOrigem).toBe('pedidos'); // precedência
    expect(r.faturamentoCentavos).toBe('2000'); // não somou 800 + 2000
    // 200 / 2000 = 10.00%
    expect(r.cmvPercentual).toBe('10.00');
  });

  it('rejeita faturamento negativo', async () => {
    await expect(cmvSvc.definirFaturamentoManual(tenantId, competencia, -1)).rejects.toThrow();
  });

  it('rejeita competência inválida', async () => {
    await expect(cmvSvc.definirFaturamentoManual(tenantId, '2026-13', 100)).rejects.toThrow();
  });
});
