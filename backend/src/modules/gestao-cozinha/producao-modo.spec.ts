import { BadRequestException } from '@nestjs/common';
import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { InsumoService } from './insumo.service';
import { CusteioService } from './custeio.service';
import { FichaService } from './ficha.service';
import { ProducaoService } from './producao.service';

jest.setTimeout(180_000);

/** Story 4.3 — Baixa manual configurável (FR-15 manual). */
describe('Modo de baixa configurável (Story 4.3)', () => {
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
  async function fichaComEstoque(nome: string, estoque: number, qtdPorPorcao: number): Promise<{ insumoId: string; fichaId: string }> {
    const ins = await insumoSvc.criar(tenantId, { nome: `${nome}-insumo`, unidade_base: 'kg' });
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId: ins.id,
      quantidade: estoque,
      precoCentavos: 1000,
      causeKey: `019056d6-0000-7000-8000-${String(++causeSeq).padStart(12, '0')}`,
    });
    const f = await fichaSvc.criar(tenantId, { nome, itens: [{ insumoId: ins.id, quantidade: qtdPorPorcao }] });
    return { insumoId: ins.id, fichaId: f.id };
  }

  it('AC-3: modo default é automatico', async () => {
    expect(await producaoSvc.obterModoBaixa(tenantId)).toBe('automatico');
  });

  it('AC-3: rejeita modo inválido', async () => {
    await expect(
      producaoSvc.definirModoBaixa(tenantId, 'xpto' as 'manual'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('AC-1: em modo manual, registrar NÃO altera o estoque (fica pendente)', async () => {
    const { insumoId, fichaId } = await fichaComEstoque('Manual', 10, 0.4);
    await producaoSvc.definirModoBaixa(tenantId, 'manual');

    const p = await producaoSvc.registrar(tenantId, { fichaId, quantidade: 2 });
    expect(p.status_baixa).toBe('pendente');
    const ins = await insumoSvc.obterPorId(tenantId, insumoId);
    expect(Number(ins.quantidade_atual)).toBe(10); // intacto
  });

  it('AC-2: baixa explícita movimenta o estoque e é idempotente', async () => {
    const { insumoId, fichaId } = await fichaComEstoque('Explicito', 10, 0.5);
    await producaoSvc.definirModoBaixa(tenantId, 'manual');
    const p = await producaoSvc.registrar(tenantId, { fichaId, quantidade: 2 }); // 1.0 quando baixar

    const b1 = await producaoSvc.baixarManual(tenantId, p.id);
    expect(b1.status_baixa).toBe('baixado');
    expect(Number((await insumoSvc.obterPorId(tenantId, insumoId)).quantidade_atual)).toBe(9);

    // reenvio da baixa não duplica
    await producaoSvc.baixarManual(tenantId, p.id);
    expect(Number((await insumoSvc.obterPorId(tenantId, insumoId)).quantidade_atual)).toBe(9);
  });

  it('AC-3: trocar o modo NÃO reprocessa produções passadas', async () => {
    const { insumoId, fichaId } = await fichaComEstoque('Historico', 10, 0.3);
    await producaoSvc.definirModoBaixa(tenantId, 'manual');
    const pendente = await producaoSvc.registrar(tenantId, { fichaId, quantidade: 1 }); // fica pendente

    // troca para automatico: vale para as PRÓXIMAS, não mexe na pendente
    await producaoSvc.definirModoBaixa(tenantId, 'automatico');
    const lista = await producaoSvc.listar(tenantId);
    const aindaPendente = lista.find((x) => x.id === pendente.id);
    expect(aindaPendente?.status_baixa).toBe('pendente');
    expect(Number((await insumoSvc.obterPorId(tenantId, insumoId)).quantidade_atual)).toBe(10);

    // próxima produção (modo auto agora) baixa normalmente
    const nova = await producaoSvc.registrar(tenantId, { fichaId, quantidade: 1 });
    expect(nova.status_baixa).toBe('baixado');
    expect(Number((await insumoSvc.obterPorId(tenantId, insumoId)).quantidade_atual)).toBe(9.7);
  });

  it('baixa manual de produção sem ficha é recusada', async () => {
    await producaoSvc.definirModoBaixa(tenantId, 'manual');
    const avulsa = await producaoSvc.registrar(tenantId, { quantidade: 1 });
    expect(avulsa.status_baixa).toBe('sem_ficha');
    await expect(producaoSvc.baixarManual(tenantId, avulsa.id)).rejects.toBeInstanceOf(BadRequestException);
  });
});
