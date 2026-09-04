import { BadRequestException } from '@nestjs/common';
import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { InsumoService } from './insumo.service';
import { CusteioService } from './custeio.service';
import { FichaService } from './ficha.service';

jest.setTimeout(180_000);

describe('Ficha + custo on-read (Story 3.2)', () => {
  let h: PgHarness;
  let insumoSvc: InsumoService;
  let custeioSvc: CusteioService;
  let fichaSvc: FichaService;
  let tenantId: string;
  let insumoId: string;
  let fichaId: string;
  let asOf: string;

  beforeAll(async () => {
    h = await startPgHarness();
    insumoSvc = new InsumoService(h.db);
    custeioSvc = new CusteioService(h.db);
    fichaSvc = new FichaService(h.db, custeioSvc);
    tenantId = await seedInquilino(h, 'Alfa');

    const insumo = await insumoSvc.criar(tenantId, { nome: 'Tomate', unidade_base: 'kg' });
    insumoId = insumo.id;
    // Duas entradas: 1kg a R$15,50 e depois 1kg a R$9,00.
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId, quantidade: 1, precoCentavos: 1550, causeKey: '019056d6-0000-7000-8000-0000000000f1',
    });
    await insumoSvc.registrarEntrada(tenantId, {
      insumoId, quantidade: 1, precoCentavos: 900, causeKey: '019056d6-0000-7000-8000-0000000000f2',
    });

    // Ficha usa 0.18 (base = 0,180 kg) do insumo.
    const ficha = await fichaSvc.criar(tenantId, { nome: 'Molho', itens: [{ insumoId, quantidade: 0.18 }] });
    fichaId = ficha.id;
    asOf = new Date().toISOString();
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('AC: sem método definido, o cálculo é recusado (sem default)', async () => {
    await expect(fichaSvc.calcularCusto(tenantId, fichaId, asOf)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('AC-2/AC-3: custo por último preço é determinístico', async () => {
    await custeioSvc.definir(tenantId, 'ultimo_preco');
    const a = await fichaSvc.calcularCusto(tenantId, fichaId, asOf);
    const b = await fichaSvc.calcularCusto(tenantId, fichaId, asOf);
    expect(a.custoPorcaoCentavos).toBe('162'); // 900 * 0.18 / 1
    expect(a.metodo).toBe('ultimo_preco');
    expect(b.custoPorcaoCentavos).toBe(a.custoPorcaoCentavos); // mesmo as_of → mesmo número
  });

  it('AC-4: trocar para médio ponderado muda a leitura de forma consistente', async () => {
    const trocado = await custeioSvc.definir(tenantId, 'medio_ponderado');
    expect(trocado.versao).toBe(2);
    const custo = await fichaSvc.calcularCusto(tenantId, fichaId, asOf);
    expect(custo.custoPorcaoCentavos).toBe('221'); // 2450 * 0.18 / 2 = 220,5 → 221
    expect(custo.metodo).toBe('medio_ponderado');
    expect(custo.versao).toBe(2);
  });
});
