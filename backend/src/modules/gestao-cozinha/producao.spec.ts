import { BadRequestException, NotFoundException } from '@nestjs/common';
import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { InsumoService } from './insumo.service';
import { CusteioService } from './custeio.service';
import { FichaService } from './ficha.service';
import { ProducaoService } from './producao.service';

jest.setTimeout(180_000);

/** Story 4.1 — Registro de Produção (FR-14): data + quantidade por Ficha, sem baixar estoque. */
describe('Registro de Produção (Story 4.1)', () => {
  let h: PgHarness;
  let insumoSvc: InsumoService;
  let fichaSvc: FichaService;
  let producaoSvc: ProducaoService;
  let tenantId: string;
  let fichaId: string;
  let insumoId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    insumoSvc = new InsumoService(h.db);
    const custeio = new CusteioService(h.db);
    fichaSvc = new FichaService(h.db, custeio);
    producaoSvc = new ProducaoService(h.db, fichaSvc, insumoSvc);
    tenantId = await seedInquilino(h, 'Alfa');
    await custeio.definir(tenantId, 'ultimo_preco');

    const ins = await insumoSvc.criar(tenantId, { nome: 'Tomate', unidade_base: 'kg' });
    insumoId = ins.id;
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId,
      quantidade: 5,
      precoCentavos: 1000,
      causeKey: '019056d6-0000-7000-8000-000000000401',
    });
    const f = await fichaSvc.criar(tenantId, { nome: 'Molho', itens: [{ insumoId, quantidade: 0.5 }] });
    fichaId = f.id;
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('AC-1/AC-2: registra produção por Ficha com data e quantidade', async () => {
    const p = await producaoSvc.registrar(tenantId, { fichaId, quantidade: 3 });
    expect(p.ficha_id).toBe(fichaId);
    expect(p.quantidade).toBe('3');
    expect(p.criado_em).toBeInstanceOf(Date);
  });

  it('registra com status de baixa (auto-baixa detalhada em 4.2)', async () => {
    const p = await producaoSvc.registrar(tenantId, { fichaId, quantidade: 1 });
    expect(p.status_baixa).toBe('baixado');
  });

  it('rejeita quantidade não positiva', async () => {
    await expect(producaoSvc.registrar(tenantId, { fichaId, quantidade: 0 })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejeita Ficha inexistente', async () => {
    await expect(
      producaoSvc.registrar(tenantId, { fichaId: '019056d6-0000-7000-8000-0000000000ff', quantidade: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('produção avulsa sem Ficha é marcada "sem_ficha" e não baixa (4.2 AC#3)', async () => {
    const p = await producaoSvc.registrar(tenantId, { quantidade: 2 });
    expect(p.ficha_id).toBeNull();
    expect(p.status_baixa).toBe('sem_ficha');
  });

  it('listar retorna as produções do tenant em ordem decrescente', async () => {
    const lista = await producaoSvc.listar(tenantId);
    expect(lista.length).toBeGreaterThanOrEqual(3);
    const tempos = lista.map((p) => new Date(p.criado_em).getTime());
    expect([...tempos].sort((a, b) => b - a)).toEqual(tempos);
  });
});
