import { DatabaseService } from '../../core/database/database.service';
import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { GestaoCentralGlpService } from './gestao-central-glp.service';

jest.setTimeout(180_000);

describe('GestaoCentralGlpService', () => {
  let harness: PgHarness;
  let service: GestaoCentralGlpService;
  let tenantId: string;
  let outroTenantId: string;

  beforeAll(async () => {
    harness = await startPgHarness();
    service = new GestaoCentralGlpService(new DatabaseService(harness.appPool));
    tenantId = await seedInquilino(harness, 'Restaurante GLP');
    outroTenantId = await seedInquilino(harness, 'Restaurante Isolado');
  });

  afterAll(async () => {
    await harness?.appPool.end();
    await harness?.adminPool.end();
    await harness?.container.stop();
  });

  it('mantém o estoque em zero quando não há abastecimento nem consumo', async () => {
    await service.configurarCentral(tenantId, {
      capacidadeTotalKg: 500, capacidadeCilindrosKg: 5, estoqueAtualKg: 150,
      estoqueMinimoKg: 80, estoqueCriticoKg: 30, fatorConversao: 1,
    });

    const dashboard = await service.dashboard(tenantId);
    expect(dashboard.estoqueAtualKg).toBe(0);
    expect(dashboard.consumoTotalKg).toBe(0);
    expect(dashboard.totalAbastecimentosKg).toBe(0);
  });

  it('usa o valor unitário do inquilino para faturar o consumo no dashboard', async () => {
    await service.configurarCentral(tenantId, {
      capacidadeTotalKg: 500,
      capacidadeCilindrosKg: 5,
      estoqueAtualKg: 150,
      estoqueMinimoKg: 80,
      estoqueCriticoKg: 30,
      fatorConversao: 1,
      valorUnitarioKgFornecedor: 6.5,
      valorUnitarioKgInquilino: 9.9,
    });

    await service.registrarAbastecimento(tenantId, {
      data: '2026-08-01',
      fornecedor: 'Fornecedor Central',
      quantidadeKg: 100,
      quantidadeCilindros: 1,
      valorTotal: 650,
    });

    await service.registrarLeitura(tenantId, {
      cozinhaId: 'cozinha-tenant',
      data: '2026-08-02',
      leituraAnterior: 10,
      leituraAtual: 20,
      fatorConversao: 1,
    });

    const dashboard = await service.dashboard(tenantId);

    expect(dashboard.custoMedioKg).toBe(9.9);
    expect(dashboard.valorFaturado).toBeCloseTo(9.9 * 10, 2);
  });

  it('persiste os preços por kg pagos ao fornecedor e cobrados ao inquilino', async () => {
    const config = await service.configurarCentral(tenantId, {
      capacidadeTotalKg: 500,
      capacidadeCilindrosKg: 5,
      estoqueAtualKg: 150,
      estoqueMinimoKg: 80,
      estoqueCriticoKg: 30,
      fatorConversao: 1,
      valorUnitarioKgFornecedor: 6.5,
      valorUnitarioKgInquilino: 9.9,
    });

    expect(config.valorUnitarioKgFornecedor).toBe(6.5);
    expect(config.valorUnitarioKgInquilino).toBe(9.9);

    const persistida = await service.obterCentral(tenantId);
    expect(persistida?.valorUnitarioKgFornecedor).toBe(6.5);
    expect(persistida?.valorUnitarioKgInquilino).toBe(9.9);
  });

  it('calcula o estoque compartilhado com o consumo de todas as cozinhas', async () => {
    await service.registrarAbastecimento(tenantId, {
      data: '2026-08-01', fornecedor: 'Fornecedor Central', quantidadeKg: 100, quantidadeCilindros: 1, valorTotal: 700,
    });
    const tenantCozinha = await seedInquilino(harness, 'Cozinha do Estoque Compartilhado');
    await service.registrarLeitura(tenantCozinha, {
      cozinhaId: tenantCozinha, data: '2026-08-02', leituraAnterior: 10, leituraAtual: 20,
    });

    const dashboard = await service.dashboardCompartilhado();

    expect(dashboard.consumoTotalKg).toBeCloseTo(10, 1);
    expect(dashboard.estoqueAtualKg).toBeCloseTo(90, 1);
  });

  it('usa o saldo real dos movimentos e não o estoque inicial configurado', async () => {
    const tenantIsolado = await seedInquilino(harness, 'Tenant GLP Isolado');

    await service.configurarCentral(tenantIsolado, {
      capacidadeTotalKg: 500, capacidadeCilindrosKg: 5, estoqueAtualKg: 500,
      estoqueMinimoKg: 80, estoqueCriticoKg: 30, fatorConversao: 1,
    });

    await service.registrarAbastecimento(tenantIsolado, {
      data: '2026-09-02', fornecedor: 'Fornecedor C', quantidadeKg: 380, quantidadeCilindros: 4, valorTotal: 2660,
    });

    const dashboard = await service.dashboard(tenantIsolado);
    expect(dashboard.estoqueAtualKg).toBe(380);
    expect(dashboard.totalAbastecimentosKg).toBe(380);
  });

  it('registra a leitura da cozinha usando a central compartilhada', async () => {
    const tenantCentral = await seedInquilino(harness, 'Tenant Central Compartilhada');
    const tenantCozinha = await seedInquilino(harness, 'Tenant Cozinha Compartilhada');
    await service.configurarCentral(tenantCentral, {
      capacidadeTotalKg: 500, capacidadeCilindrosKg: 5, estoqueAtualKg: 0,
      estoqueMinimoKg: 80, estoqueCriticoKg: 30, fatorConversao: 1.2,
    });

    const leitura = await service.registrarLeitura(tenantCozinha, {
      cozinhaId: tenantCozinha, data: '2026-09-03', leituraAnterior: 10, leituraAtual: 20,
    });

    expect(leitura.consumoKg).toBeCloseTo(12, 1);
    expect((await service.listarLeituras(tenantCozinha)).map((item) => item.id)).toContain(leitura.id);
  });

  it('lista no dashboard as leituras salvas pela Central de GLP', async () => {
    const tenantCozinha = await seedInquilino(harness, 'Tenant Dashboard GLP');
    const leitura = await service.registrarLeitura(tenantCozinha, {
      cozinhaId: tenantCozinha, data: '2026-09-04', leituraAnterior: 30, leituraAtual: 40,
    });

    const dashboard = await service.listarLeiturasDashboard(tenantCozinha, '2026-09-01', '2026-09-30');

    expect(dashboard).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: leitura.id, tenantId: tenantCozinha, leituraInicial: 30, leituraFinal: 40 }),
    ]));
  });

  it('lista todos os fechamentos sem tenant quando a chamada é global', async () => {
    const tenantA = await seedInquilino(harness, 'Tenant Fechamento Global A');
    const tenantB = await seedInquilino(harness, 'Tenant Fechamento Global B');

    await service.configurarCentral(tenantA, {
      capacidadeTotalKg: 500, capacidadeCilindrosKg: 5, estoqueAtualKg: 100,
      estoqueMinimoKg: 80, estoqueCriticoKg: 30, fatorConversao: 1,
    });
    await service.configurarCentral(tenantB, {
      capacidadeTotalKg: 600, capacidadeCilindrosKg: 6, estoqueAtualKg: 100,
      estoqueMinimoKg: 80, estoqueCriticoKg: 30, fatorConversao: 1,
    });

    await service.fecharMes(tenantA, { mes: '2026-09', custoPorKg: 7, valorFaturado: 70 });
    await service.fecharMes(tenantB, { mes: '2026-08', custoPorKg: 8, valorFaturado: 80 });

    const fechamentos = await service.listarFechamentos();

    expect(fechamentos.length).toBeGreaterThanOrEqual(2);
    expect(fechamentos.map((item) => item.mes)).toEqual(expect.arrayContaining(['2026-09', '2026-08']));
    expect(fechamentos.every((item) => !!item.tenantId)).toBe(true);
  });

  it('remove um abastecimento por tenant e id', async () => {
    await service.configurarCentral(tenantId, {
      capacidadeTotalKg: 500, capacidadeCilindrosKg: 5, estoqueAtualKg: 50,
      estoqueMinimoKg: 80, estoqueCriticoKg: 30, fatorConversao: 1,
    });

    const abastecimento = await service.registrarAbastecimento(tenantId, {
      data: '2026-09-01', fornecedor: 'Fornecedor B', quantidadeKg: 100, quantidadeCilindros: 1, valorTotal: 700,
    });

    await service.removerAbastecimento(tenantId, abastecimento.id);

    const lista = await service.listarAbastecimentos(tenantId);
    expect(lista.some((item) => item.id === abastecimento.id)).toBe(false);
  });

  it('persiste movimentos por tenant e calcula estoque e fechamento', async () => {
    await service.configurarCentral(tenantId, {
      capacidadeTotalKg: 1200, capacidadeCilindrosKg: 12, estoqueAtualKg: 100,
      estoqueMinimoKg: 200, estoqueCriticoKg: 100, fatorConversao: 1.2,
    });
    await service.registrarAbastecimento(tenantId, {
      data: '2026-08-01', fornecedor: 'Fornecedor A', quantidadeKg: 200, quantidadeCilindros: 2, valorTotal: 1400,
    });
    await service.registrarLeitura(tenantId, {
      cozinhaId: 'cozinha-01', data: '2026-08-02', leituraAnterior: 10, leituraAtual: 20, fatorConversao: 1.2,
    });
    await service.registrarPerda(tenantId, {
      tipo: 'perda', quantidadeKg: 15, motivo: 'Vazamento na linha', data: '2026-08-03',
    });

    const dashboard = await service.dashboard(tenantId);
    expect(dashboard.estoqueAtualKg).toBeCloseTo(173, 1);
    expect(dashboard.consumoTotalKg).toBeCloseTo(12, 1);
    expect(dashboard.totalAbastecimentosKg).toBe(200);
    expect(dashboard.movimentos).toHaveLength(3);

    const fechamento = await service.fecharMes(tenantId, { mes: '2026-08', custoPorKg: 7, valorFaturado: 84 });
    expect(fechamento.saldoFinalKg).toBeCloseTo(173, 1);
    expect(await service.obterCentral(outroTenantId)).toBeNull();
  });
});
