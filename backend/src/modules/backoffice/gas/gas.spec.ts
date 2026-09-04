import { type PgHarness, startPgHarness, seedInquilino } from '../../../testing/pg-harness';
import { GasLeituraService } from './gas.service';

jest.setTimeout(180_000);

describe('GasLeituraService', () => {
  let h: PgHarness;
  let service: GasLeituraService;
  let tenantId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    service = new GasLeituraService(h.db);
    tenantId = await seedInquilino(h, 'Tenant Gas');
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('salva uma leitura de gás por inquilino e lista as leituras do inquilino', async () => {
    const registro = await service.registrar({
      tenantId,
      dataInicial: '2026-08-01',
      leituraInicial: 100,
      dataFinal: '2026-08-10',
      leituraFinal: 160,
      observacao: 'Medição do mês',
    });

    expect(registro.id).toBeTruthy();
    expect(registro.tenant_id).toBe(tenantId);
    expect(Number(registro.consumo_m3)).toBe(60);

    const lista = await service.listarPorTenant(tenantId);
    expect(lista.some((item) => item.id === registro.id)).toBe(true);
  });

  it('remove uma leitura de gás do inquilino', async () => {
    const registro = await service.registrar({
      tenantId,
      dataInicial: '2026-08-11',
      leituraInicial: 160,
      dataFinal: '2026-08-20',
      leituraFinal: 220,
      observacao: 'Remoção do lançamento de teste',
    });

    await service.remover(tenantId, registro.id);

    const lista = await service.listarPorTenant(tenantId);
    expect(lista.some((item) => item.id === registro.id)).toBe(false);
  });

  it('expõe um dashboard por inquilino com nome, data, leitura e consumo em kg', async () => {
    const registro = await service.registrar({
      tenantId,
      dataInicial: '2026-08-21',
      leituraInicial: 220,
      dataFinal: '2026-08-30',
      leituraFinal: 280,
      observacao: 'Dashboard de consumo',
    });

    const dashboard = await service.listarDashboard();
    const item = dashboard.find((entry) => entry.id === registro.id);

    expect(item).toBeTruthy();
    expect(item?.nomeInquilino).toBeTruthy();
    expect(item?.dataLeitura).toBe('2026-08-30');
    expect(item?.leituraInicial).toBe(220);
    expect(item?.leituraFinal).toBe(280);
    expect(item?.consumoKg).toBeCloseTo(45, 2);
  });

  it('filtra o dashboard por inquilino quando informado', async () => {
    const registro = await service.registrar({
      tenantId,
      dataInicial: '2026-09-01',
      leituraInicial: 280,
      dataFinal: '2026-09-10',
      leituraFinal: 320,
      observacao: 'Filtro por inquilino',
    });

    const dashboard = await service.listarDashboard(tenantId);
    expect(dashboard.every((entry) => entry.tenantId === tenantId)).toBe(true);
    expect(dashboard.some((entry) => entry.id === registro.id)).toBe(true);
  });

  it('filtra o dashboard por inquilino e intervalo de datas', async () => {
    const registro = await service.registrar({
      tenantId,
      dataInicial: '2026-10-01',
      leituraInicial: 320,
      dataFinal: '2026-10-15',
      leituraFinal: 360,
      observacao: 'Filtro por período',
    });

    const dashboard = await service.listarDashboard(tenantId, '2026-10-05', '2026-10-31');
    expect(dashboard.some((entry) => entry.id === registro.id)).toBe(true);
    expect(dashboard.every((entry) => entry.tenantId === tenantId)).toBe(true);
    expect(dashboard.every((entry) => entry.dataLeitura >= '2026-10-05' && entry.dataLeitura <= '2026-10-31')).toBe(true);
  });
});
