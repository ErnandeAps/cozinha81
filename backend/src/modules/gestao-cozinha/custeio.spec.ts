import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { CusteioService } from './custeio.service';

jest.setTimeout(180_000);

describe('Método de Custeio (Story 3.1)', () => {
  let h: PgHarness;
  let service: CusteioService;
  let tenantA: string;
  let tenantB: string;

  beforeAll(async () => {
    h = await startPgHarness();
    service = new CusteioService(h.db);
    tenantA = await seedInquilino(h, 'A');
    tenantB = await seedInquilino(h, 'B');
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('AC-1: sem definição, obter retorna null (sem default silencioso)', async () => {
    expect(await service.obter(tenantA)).toBeNull();
    await expect(service.exigir(tenantA)).rejects.toThrow();
  });

  it('AC-2: definir persiste método com versão 1', async () => {
    expect(await service.definir(tenantA, 'ultimo_preco')).toEqual({ metodo: 'ultimo_preco', versao: 1 });
    expect(await service.obter(tenantA)).toEqual({ metodo: 'ultimo_preco', versao: 1 });
  });

  it('AC-4: trocar o método incrementa a versão', async () => {
    expect(await service.definir(tenantA, 'medio_ponderado')).toEqual({ metodo: 'medio_ponderado', versao: 2 });
    // re-selecionar o mesmo método não muda a versão
    expect(await service.definir(tenantA, 'medio_ponderado')).toEqual({ metodo: 'medio_ponderado', versao: 2 });
  });

  it('rejeita método inválido', async () => {
    await expect(service.definir(tenantA, 'invalido' as never)).rejects.toThrow();
  });

  it('isolamento: config de A não vaza para B', async () => {
    expect(await service.obter(tenantB)).toBeNull();
  });
});
