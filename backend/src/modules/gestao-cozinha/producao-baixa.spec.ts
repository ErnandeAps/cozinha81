import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { InsumoService } from './insumo.service';
import { CusteioService } from './custeio.service';
import { FichaService } from './ficha.service';
import { ProducaoService, causeKeyBaixa } from './producao.service';

jest.setTimeout(180_000);

/** Story 4.2 — Baixa automática de estoque via Ficha (FR-15 auto, AD-9/AD-6). */
describe('Baixa automática via Ficha (Story 4.2)', () => {
  let h: PgHarness;
  let insumoSvc: InsumoService;
  let fichaSvc: FichaService;
  let producaoSvc: ProducaoService;
  let tenantId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    insumoSvc = new InsumoService(h.db);
    const custeio = new CusteioService(h.db);
    fichaSvc = new FichaService(h.db, custeio);
    producaoSvc = new ProducaoService(h.db, fichaSvc, insumoSvc);
    tenantId = await seedInquilino(h, 'Alfa');
    await custeio.definir(tenantId, 'ultimo_preco');
  });

  afterAll(async () => {
    await h?.stop();
  });

  let causeSeq = 0;
  async function novoInsumoComEstoque(nome: string, estoqueBase: number): Promise<string> {
    const ins = await insumoSvc.criar(tenantId, { nome, unidade_base: 'kg' });
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId: ins.id,
      quantidade: estoqueBase,
      precoCentavos: 1000,
      causeKey: `019056d6-0000-7000-8000-${String(++causeSeq).padStart(12, '0')}`,
    });
    return ins.id;
  }

  it('AC-1: produção em modo auto debita o Insumo conforme a Ficha', async () => {
    const insumoId = await novoInsumoComEstoque('Tomate', 10);
    // Ficha: 0.5 base/porção, rendimento 1.
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Molho', itens: [{ insumoId, quantidade: 0.5 }] });

    await producaoSvc.registrar(tenantId, { fichaId: ficha.id, quantidade: 3 }); // 3 porções → 1.5

    const ins = await insumoSvc.obterPorId(tenantId, insumoId);
    expect(Number(ins.quantidade_atual)).toBe(8.5); // 10 - 1.5
  });

  it('AC-1: rendimento >1 escala o consumo (half-up determinístico)', async () => {
    const insumoId = await novoInsumoComEstoque('Farinha', 10);
    // 1 base rendem 4 porções → 0.25/porção.
    const ficha = await fichaSvc.criar(tenantId, {
      nome: 'Massa',
      rendimentoPorcoes: 4,
      itens: [{ insumoId, quantidade: 1 }],
    });
    await producaoSvc.registrar(tenantId, { fichaId: ficha.id, quantidade: 2 }); // 1 * 2 / 4 = 0.5
    const ins = await insumoSvc.obterPorId(tenantId, insumoId);
    expect(Number(ins.quantidade_atual)).toBe(9.5);
  });

  it('AC-2: reenvio com o mesmo cause_key NÃO duplica a baixa', async () => {
    const insumoId = await novoInsumoComEstoque('Cebola', 10);
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Refogado', itens: [{ insumoId, quantidade: 0.6 }] });
    const causeKey = '019056d6-0000-7000-8000-0000000aa001';

    const p1 = await producaoSvc.registrar(tenantId, { fichaId: ficha.id, quantidade: 1, causeKey });
    const p2 = await producaoSvc.registrar(tenantId, { fichaId: ficha.id, quantidade: 1, causeKey });

    expect(p2.id).toBe(p1.id); // mesma produção
    const ins = await insumoSvc.obterPorId(tenantId, insumoId);
    expect(Number(ins.quantidade_atual)).toBe(9.4); // baixou 0.6 UMA vez, não 1.2
  });

  it('AC-3: produção sem Ficha não baixa, é marcada "sem_ficha" e fica sinalizada', async () => {
    const p = await producaoSvc.registrar(tenantId, { quantidade: 5 });
    expect(p.status_baixa).toBe('sem_ficha');
    const sinalizadas = await producaoSvc.listarSemFicha(tenantId);
    expect(sinalizadas.some((x) => x.id === p.id)).toBe(true);
  });

  it('AC-1: sub-receita achata o consumo até os Insumos', async () => {
    const base = await novoInsumoComEstoque('Caldo-insumo', 100);
    // sub-ficha: 1 base/porção, rende 1 porção.
    const sub = await fichaSvc.criar(tenantId, { nome: 'Caldo', itens: [{ insumoId: base, quantidade: 1 }] });
    // prato usa 2 porções da sub (2 porções), rende 1 porção.
    const prato = await fichaSvc.criar(tenantId, {
      nome: 'Sopa',
      itens: [{ subFichaId: sub.id, quantidade: 2 }],
    });
    await producaoSvc.registrar(tenantId, { fichaId: prato.id, quantidade: 1 }); // 2 porções da sub → 2 * 1

    const ins = await insumoSvc.obterPorId(tenantId, base);
    expect(Number(ins.quantidade_atual)).toBe(98); // 100 - 2
  });

  it('AC-4: as baixas são movimentos compensáveis com cause_key estável', async () => {
    const insumoId = await novoInsumoComEstoque('Alho', 10);
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Tempero', itens: [{ insumoId, quantidade: 0.3 }] });
    const causeKey = '019056d6-0000-7000-8000-0000000bb001';
    const p = await producaoSvc.registrar(tenantId, { fichaId: ficha.id, quantidade: 1, causeKey });

    const esperado = causeKeyBaixa(p.id, insumoId);
    const { rows } = await h.adminPool.query(
      `SELECT cause_key, tipo, quantidade::text FROM movimento_estoque WHERE insumo_id = $1 AND tipo = 'baixa'`,
      [insumoId],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].cause_key).toBe(esperado);
    expect(Number(rows[0].quantidade)).toBe(0.3);
  });

  it('baixa que cruza o mínimo dispara alerta de estoque', async () => {
    const ins = await insumoSvc.criar(tenantId, {
      nome: 'Sal',
      unidade_base: 'kg',
      estoque_minimo: 5,
    });
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId: ins.id,
      quantidade: 6,
      precoCentavos: 500,
      causeKey: `019056d6-0000-7000-8000-${String(++causeSeq).padStart(12, '0')}`,
    });
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Salgado', itens: [{ insumoId: ins.id, quantidade: 2 }] });
    await producaoSvc.registrar(tenantId, { fichaId: ficha.id, quantidade: 1 }); // 6 - 2 = 4 ≤ 5

    const alertas = await insumoSvc.obterAlertasAtivos(tenantId);
    expect(alertas.some((a) => a.insumo_id === ins.id)).toBe(true);
  });
});
