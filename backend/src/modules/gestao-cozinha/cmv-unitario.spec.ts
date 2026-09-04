import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { InsumoService } from './insumo.service';
import { CusteioService } from './custeio.service';
import { FichaService } from './ficha.service';
import { CmvService } from './cmv.service';

jest.setTimeout(180_000);

/** Story 5.1 — CMV unitário = custo da porção on-read (AD-10, FR-16). */
describe('CMV unitário (Story 5.1)', () => {
  let h: PgHarness;
  let insumoSvc: InsumoService;
  let fichaSvc: FichaService;
  let cmvSvc: CmvService;
  let tenantId: string;
  let fichaId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    insumoSvc = new InsumoService(h.db);
    const custeio = new CusteioService(h.db);
    fichaSvc = new FichaService(h.db, custeio);
    cmvSvc = new CmvService(h.db, fichaSvc, custeio);
    tenantId = await seedInquilino(h, 'Alfa');
    await custeio.definir(tenantId, 'ultimo_preco');

    const ins = await insumoSvc.criar(tenantId, { nome: 'Tomate', unidade_base: 'kg' });
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId: ins.id,
      quantidade: 1,
      precoCentavos: 1550,
      causeKey: '019056d6-0000-7000-8000-000000000511',
    });
    const f = await fichaSvc.criar(tenantId, { nome: 'Molho', itens: [{ insumoId: ins.id, quantidade: 0.5 }] });
    fichaId = f.id;
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('AC-3: CMV unitário bate com o custo/porção da Ficha para o mesmo as_of', async () => {
    const asOf = new Date().toISOString();
    const custo = await fichaSvc.calcularCusto(tenantId, fichaId, asOf);
    const cmv = await cmvSvc.unitario(tenantId, fichaId, asOf);
    expect(cmv.cmvUnitarioCentavos).toBe(custo.custoPorcaoCentavos);
  });

  it('AC-1: deriva on-read carregando método e versão de custeio', async () => {
    const cmv = await cmvSvc.unitario(tenantId, fichaId);
    expect(cmv.metodo).toBe('ultimo_preco');
    expect(cmv.versao).toBe(1);
    // 1550 * 0.5 / 1 = 775
    expect(cmv.cmvUnitarioCentavos).toBe('775');
  });
});
