import { randomUUID } from 'crypto';
import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { InsumoService } from './insumo.service';
import { CusteioService } from './custeio.service';
import { FichaService } from './ficha.service';
import { ProducaoService, causeKeyBaixa } from './producao.service';
import { ReconciliacaoService, causeKeyPedidoItem } from './reconciliacao.service';
import { EstoqueListener } from './estoque.listener';

/**
 * Story 7.6 — cancelamento ⇒ estorno por invariante de ledger (AD-13).
 * Postgres 18 REAL. Cobre: AC#2 (líquido 0), AC#3 (baixa tardia compensada),
 * AC#4 (reentrega não duplica), independente da ordem de chegada.
 */
jest.setTimeout(180_000);

describe('Reconciliação de cancelamento (Story 7.6)', () => {
  let h: PgHarness;
  let insumoSvc: InsumoService;
  let fichaSvc: FichaService;
  let producaoSvc: ProducaoService;
  let reconciliacao: ReconciliacaoService;
  let listener: EstoqueListener;
  let tenantId: string;
  let causeSeq = 0;

  beforeAll(async () => {
    h = await startPgHarness();
    insumoSvc = new InsumoService(h.db);
    const custeio = new CusteioService(h.db);
    fichaSvc = new FichaService(h.db, custeio);
    producaoSvc = new ProducaoService(h.db, fichaSvc, insumoSvc);
    reconciliacao = new ReconciliacaoService(h.db, producaoSvc);
    listener = new EstoqueListener(producaoSvc, reconciliacao);
    tenantId = await seedInquilino(h, 'Cancelamento');
    await custeio.definir(tenantId, 'ultimo_preco');
  });

  afterAll(async () => {
    await h?.stop();
  });

  async function novoInsumoComEstoque(nome: string, base: number): Promise<string> {
    const ins = await insumoSvc.criar(tenantId, { nome, unidade_base: 'kg' });
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId: ins.id,
      quantidade: base,
      precoCentavos: 1000,
      causeKey: `019056d6-0000-7000-8000-${String(++causeSeq).padStart(12, '0')}`,
    });
    return ins.id;
  }

  async function saldo(insumoId: string): Promise<number> {
    return Number((await insumoSvc.obterPorId(tenantId, insumoId)).quantidade_atual);
  }

  it('AC#2/#4: baixa, depois cancelamento → líquido 0; reentrega não duplica', async () => {
    const insumoId = await novoInsumoComEstoque('Tomate', 10);
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Molho', itens: [{ insumoId, quantidade: 0.5 }] });
    const pedidoId = randomUUID();
    const itemId = randomUUID();

    // Despacho gera baixa (cause_key estável por pedido/item): 2 porções → 1.0 base.
    await producaoSvc.registrar(tenantId, {
      fichaId: ficha.id,
      quantidade: 2,
      causeKey: causeKeyPedidoItem(pedidoId, itemId),
    });
    expect(await saldo(insumoId)).toBe(9);

    // Cancelamento → estorno compensa: líquido 0.
    await reconciliacao.cancelarEEstornar(tenantId, pedidoId, [{ id: itemId, ficha_id: ficha.id, quantidade: 2 }]);
    expect(await saldo(insumoId)).toBe(10);

    // AC#4: reentrega do cancelamento não estorna de novo.
    await reconciliacao.cancelarEEstornar(tenantId, pedidoId, [{ id: itemId, ficha_id: ficha.id, quantidade: 2 }]);
    expect(await saldo(insumoId)).toBe(10);
  });

  it('AC#3: cancelar ANTES da baixa; baixa chega depois → compensada (sem baixa fantasma)', async () => {
    const insumoId = await novoInsumoComEstoque('Farinha', 10);
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Massa', itens: [{ insumoId, quantidade: 0.8 }] });
    const pedidoId = randomUUID();
    const itemId = randomUUID();

    // Cancela primeiro (nenhuma baixa ainda) → nada a estornar, saldo intacto.
    await reconciliacao.cancelarEEstornar(tenantId, pedidoId, [{ id: itemId, ficha_id: ficha.id, quantidade: 1 }]);
    expect(await saldo(insumoId)).toBe(10);

    // Baixa drena DEPOIS (despacho fora de ordem).
    // Passamos pedidoCancelado: true para simular a flag que o listener injetaria
    await producaoSvc.registrar(tenantId, {
      fichaId: ficha.id,
      quantidade: 1,
      causeKey: causeKeyPedidoItem(pedidoId, itemId),
      pedidoCancelado: true,
    });
    
    // É atomicamente compensada pela baixa tardia.
    expect(await saldo(insumoId)).toBe(10);
  });

  it('via listener: despacho→baixa e cancelamento→estorno resultam em líquido 0', async () => {
    const insumoId = await novoInsumoComEstoque('Cebola', 10);
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Refogado', itens: [{ insumoId, quantidade: 0.7 }] });
    const pedidoId = randomUUID();
    const itens = [{ id: 'x', nome: 'Refogado', ficha_id: ficha.id, quantidade: 1 }];

    await listener.handlePedidoDespachado({ tenantId, pedidoId, origem: 'ifood', itens, causeKey: 'ck' });
    expect(await saldo(insumoId)).toBe(9.3);

    await listener.handlePedidoCancelado({ tenantId, pedidoId, itens });
    expect(await saldo(insumoId)).toBe(10);
  });

  it('via listener (fora de ordem): cancelamento antes do despacho → baixa compensada', async () => {
    const insumoId = await novoInsumoComEstoque('Alho', 10);
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Tempero', itens: [{ insumoId, quantidade: 0.4 }] });
    const pedidoId = randomUUID();
    const itens = [{ id: 'x', nome: 'Tempero', ficha_id: ficha.id, quantidade: 1 }];

    await listener.handlePedidoCancelado({ tenantId, pedidoId, itens });
    expect(await saldo(insumoId)).toBe(10);

    // O despacho chega depois; handlePedidoDespachado baixa e já compensa.
    await listener.handlePedidoDespachado({ tenantId, pedidoId, origem: 'ifood', itens, causeKey: 'ck' });
    expect(await saldo(insumoId)).toBe(10);
  });
});
