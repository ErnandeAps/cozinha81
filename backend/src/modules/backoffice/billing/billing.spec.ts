import { type PgHarness, startPgHarness, seedInquilino, seedStaff } from '../../../testing/pg-harness';
import { CozinhaService } from '../cozinhas/cozinha.service';
import { ReservaService } from '../reservas/reserva.service';
import { ModuloFlagService } from '../modulos/modulo-flag.service';
import { MaterialService } from '../materiais/material.service';
import { BillingService } from './billing.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

jest.setTimeout(180_000);

describe('Billing — Faturamento Consolidado (Epic 10)', () => {
  let h: PgHarness;
  let cozinhaSvc: CozinhaService;
  let reservaSvc: ReservaService;
  let moduloSvc: ModuloFlagService;
  let materialSvc: MaterialService;
  let billingSvc: BillingService;
  let tenantId: string;
  let cozinhaId: string;
  let staffId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    cozinhaSvc = new CozinhaService(h.db);
    reservaSvc = new ReservaService(h.db);
    moduloSvc = new ModuloFlagService(h.db);
    materialSvc = new MaterialService(h.db);
    billingSvc = new BillingService(h.db);

    staffId = await seedStaff(h, 'billing-staff@cozinha81.com', 'x');
    tenantId = await seedInquilino(h, 'Tenant Billing');
    const coz = await cozinhaSvc.criar({ nome: 'Cozinha Billing', equipada: true });
    cozinhaId = coz.id;
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('deve carregar preços do banco para aluguel e módulos', async () => {
    const precos = await billingSvc.listarPrecos();

    expect(precos.aluguel.turno).toBe(15_000);
    expect(precos.aluguel.dia).toBe(50_000);
    expect(precos.modulo.gestao_cozinha).toBe(20_000);
    expect(precos.modulo.pedidos_kds).toBe(10_000);
  });

  it('deve listar lançamentos de caixa por período e aceitar tenant opcional', async () => {
    const lancamento = await billingSvc.registrarLancamentoCaixa({
      tipo: 'entrada',
      descricao: 'Pagamento teste do caixa global',
      valor: 7_500,
      dataLancamento: '2026-10-01T10:30:00Z',
    });

    const noPeriodo = await billingSvc.listarLancamentosCaixa(undefined, '2026-10-01', '2026-10-02');
    const foraPeriodo = await billingSvc.listarLancamentosCaixa(undefined, '2026-10-03', '2026-10-04');

    expect(noPeriodo.some((item) => item.id === lancamento.id)).toBe(true);
    expect(foraPeriodo.some((item) => item.id === lancamento.id)).toBe(false);
  });

  // --- Story 10.1: Cobrança de aluguel por Modalidade ---

  it('deve gerar fatura com item de aluguel a partir de reserva (10.1 AC-1)', async () => {
    // Criar uma reserva de turno
    await reservaSvc.criar(cozinhaId, {
      inicio: '2026-08-01T08:00:00Z',
      fim: '2026-08-01T12:00:00Z',
      modalidade: 'turno',
      tenantId,
    });

    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2026-08-01T00:00:00Z',
      '2026-09-01T00:00:00Z',
    );

    expect(fatura.id).toBeTruthy();
    expect(fatura.tenant_id).toBe(tenantId);
    expect(fatura.status).toBe('aberta');

    const itensAluguel = fatura.itens.filter((i) => i.tipo === 'aluguel');
    expect(itensAluguel.length).toBeGreaterThanOrEqual(1);

    // Valor do turno = 15.000 centavos
    const turnoItem = itensAluguel.find((i) => i.descricao.includes('turno'));
    expect(turnoItem).toBeDefined();
    expect(turnoItem!.valor).toBe(15_000);
    expect(turnoItem!.origem_id).toBeTruthy(); // Rastreabilidade à reserva
  });

  it('deve cobrar reserva de cafe com preço configurado', async () => {
    const faturasAbertas = await billingSvc.listarPorTenant(tenantId);
    for (const f of faturasAbertas) {
      if (f.status === 'aberta') {
        await billingSvc.cancelarFatura(f.id);
      }
    }

    await reservaSvc.criar(cozinhaId, {
      inicio: '2026-08-12T06:00:00Z',
      fim: '2026-08-12T10:00:00Z',
      modalidade: 'cafe',
      tenantId,
    });

    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2026-08-10T00:00:00Z',
      '2026-08-20T00:00:00Z',
    );

    const cafeItem = fatura.itens.find((i) => i.tipo === 'aluguel' && i.descricao.includes('cafe'));
    expect(cafeItem).toBeDefined();
    expect(cafeItem!.valor).toBe(12_000); // café da manhã = 60% do valor do aluguel
  });

  it('deve calcular aluguel pelo centro de custo usando a permanência real do período', async () => {
    const faturasAbertas = await billingSvc.listarPorTenant(tenantId);
    for (const f of faturasAbertas) {
      if (f.status === 'aberta') {
        await billingSvc.cancelarFatura(f.id);
      }
    }

    await h.db.withPlatform(async (c) => {
      await c.query(
        `INSERT INTO centro_custo (cozinha_id, nome_cozinha, aluguel_mensal)
         VALUES ($1, 'Cozinha Billing', 44200)
         ON CONFLICT (cozinha_id) DO UPDATE SET aluguel_mensal = EXCLUDED.aluguel_mensal`,
        [cozinhaId],
      );
    });

    await reservaSvc.criar(cozinhaId, {
      inicio: '2026-08-20T08:00:00Z',
      fim: '2026-08-20T16:00:00Z',
      modalidade: 'turno',
      tenantId,
    });

    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2026-08-20T00:00:00Z',
      '2026-08-21T00:00:00Z',
    );

    const aluguelItem = fatura.itens.find((i) => i.tipo === 'aluguel');
    expect(aluguelItem).toBeDefined();
    expect(aluguelItem!.valor).toBe(800); // 442,00 / 442 × 8h = R$ 8,00

    await billingSvc.cancelarFatura(fatura.id);
  });

  it('deve calcular aluguel mensal proporcional à permanência real em horas do mês', async () => {
    const faturasAbertas = await billingSvc.listarPorTenant(tenantId);
    for (const f of faturasAbertas) {
      if (f.status === 'aberta') {
        await billingSvc.cancelarFatura(f.id);
      }
    }

    await h.db.withPlatform(async (c) => {
      await c.query(
        `INSERT INTO centro_custo (cozinha_id, nome_cozinha, aluguel_mensal)
         VALUES ($1, 'Cozinha Billing', 196788)
         ON CONFLICT (cozinha_id) DO UPDATE SET aluguel_mensal = EXCLUDED.aluguel_mensal`,
        [cozinhaId],
      );
    });

    await reservaSvc.criar(cozinhaId, {
      inicio: '2026-08-01T06:00:00Z',
      fim: '2026-08-31T09:00:00Z',
      modalidade: 'personalizado',
      tenantId,
    });

    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2026-08-01T00:00:00Z',
      '2026-08-31T23:59:59Z',
    );

    const aluguelItem = fatura.itens.find((i) => i.tipo === 'aluguel');
    expect(aluguelItem).toBeDefined();
    expect(aluguelItem!.valor).toBe(41_406); // 1.967,88 / 442 × 93h = 414,06

    await billingSvc.cancelarFatura(fatura.id);
  });

  it('deve calcular o aluguel proporcional sem truncar a fração da hora', async () => {
    const faturasAbertas = await billingSvc.listarPorTenant(tenantId);
    for (const f of faturasAbertas) {
      if (f.status === 'aberta') {
        await billingSvc.cancelarFatura(f.id);
      }
    }

    await h.db.withPlatform(async (c) => {
      await c.query(
        `INSERT INTO centro_custo (cozinha_id, nome_cozinha, aluguel_mensal)
         VALUES ($1, 'Cozinha Billing', 100000)
         ON CONFLICT (cozinha_id) DO UPDATE SET aluguel_mensal = EXCLUDED.aluguel_mensal`,
        [cozinhaId],
      );
    });

    await reservaSvc.criar(cozinhaId, {
      inicio: '2026-09-01T08:00:00Z',
      fim: '2026-09-01T16:00:00Z',
      modalidade: 'turno',
      tenantId,
    });

    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2026-09-01T00:00:00Z',
      '2026-09-02T00:00:00Z',
    );

    const aluguelItem = fatura.itens.find((i) => i.tipo === 'aluguel');
    expect(aluguelItem).toBeDefined();
    expect(aluguelItem!.valor).toBe(1_810); // R$ 18,10 em vez de R$ 18,08 por truncamento da hora

    await billingSvc.cancelarFatura(fatura.id);
  });

  it('deve ignorar o cálculo de gás por leitura quando o fechamento mensal não existe', async () => {
    const faturasAbertas = await billingSvc.listarPorTenant(tenantId);
    for (const f of faturasAbertas) {
      if (f.status === 'aberta') {
        await billingSvc.cancelarFatura(f.id);
      }
    }

    await h.db.withPlatform(async (c) => {
      await c.query(
        `INSERT INTO central_glp_config (
           tenant_id, nome_central, capacidade_total_kg, capacidade_cilindros_kg,
           capacidade_por_cilindro_kg, estoque_inicial_kg, estoque_minimo_kg, estoque_critico_kg,
           unidade_compra, unidade_medicao, fator_conversao, status_central,
           valor_unitario_kg_inquilino
         ) VALUES (
           $1, 'Central de GLP', 1000, 10, 100, 0, 0, 0, 'kg', 'm3', 1, 'ativa', 3.00
         )
         ON CONFLICT (tenant_id) DO UPDATE SET
           valor_unitario_kg_inquilino = EXCLUDED.valor_unitario_kg_inquilino,
           atualizado_em = now()`,
        [tenantId],
      );

      await c.query(
        `INSERT INTO leitura_gas (tenant_id, data_inicial, leitura_inicial, data_final, leitura_final, consumo_m3, observacao)
         VALUES ($1, '2026-08-01', 100, '2026-08-30', 160, 60, 'Leitura do mês')`,
        [tenantId],
      );
    });

    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2026-08-01T00:00:00Z',
      '2026-08-30T23:59:59Z',
    );

    const itemGas = fatura.itens.find((i) => i.tipo === 'gas');
    expect(itemGas).toBeUndefined();
  });

  it('deve usar o valor faturado do fechamento mensal do GLP para o item de gás', async () => {
    const faturasAbertas = await billingSvc.listarPorTenant(tenantId);
    for (const f of faturasAbertas) {
      if (f.status === 'aberta') {
        await billingSvc.cancelarFatura(f.id);
      }
    }

    await h.db.withPlatform(async (c) => {
      await c.query(
        `INSERT INTO central_glp_fechamento (
           tenant_id, mes, consumo_total_kg, custo_periodo, valor_faturado, perdas_kg, saldo_final_kg
         ) VALUES (
           $1, '2026-08', 60, 45.00, 40.50, 0, 10
         )
         ON CONFLICT (tenant_id, mes) DO UPDATE SET
           valor_faturado = EXCLUDED.valor_faturado,
           custo_periodo = EXCLUDED.custo_periodo,
           consumo_total_kg = EXCLUDED.consumo_total_kg,
           perdas_kg = EXCLUDED.perdas_kg,
           saldo_final_kg = EXCLUDED.saldo_final_kg,
           criado_em = now()`,
        [tenantId],
      );
    });

    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2026-08-01T00:00:00Z',
      '2026-08-31T23:59:59Z',
    );

    const itemGas = fatura.itens.find((i) => i.tipo === 'gas');
    expect(itemGas).toBeDefined();
    expect(itemGas!.valor).toBe(4_050);
  });

  it('deve rejeitar fatura quando o centro de custo da cozinha tem aluguel mensal zerado', async () => {
    const cozinhaSemAluguel = (await cozinhaSvc.criar({ nome: 'Cozinha sem aluguel', equipada: true })).id;

    await h.db.withPlatform(async (c) => {
      await c.query(
        `INSERT INTO centro_custo (cozinha_id, nome_cozinha, aluguel_mensal)
         VALUES ($1, 'Cozinha sem aluguel', 0)
         ON CONFLICT (cozinha_id) DO UPDATE SET aluguel_mensal = EXCLUDED.aluguel_mensal`,
        [cozinhaSemAluguel],
      );
    });

    await reservaSvc.criar(cozinhaSemAluguel, {
      inicio: '2026-09-01T08:00:00Z',
      fim: '2026-09-01T12:00:00Z',
      modalidade: 'turno',
      tenantId,
    });

    try {
      await expect(
        billingSvc.gerarFatura(
          tenantId,
          '2026-09-01T00:00:00Z',
          '2026-09-02T00:00:00Z',
        ),
      ).rejects.toThrow(/aluguel_mensal|centro de custo/i);
    } finally {
      await h.db.withPlatform(async (c) => {
        await c.query('DELETE FROM reserva WHERE cozinha_id = $1 AND tenant_id = $2', [cozinhaSemAluguel, tenantId]);
        await c.query('DELETE FROM centro_custo WHERE cozinha_id = $1', [cozinhaSemAluguel]);
      });
    }
  });

  it('deve usar centavos sem float (10.1 AC-3)', async () => {
    const faturas = await billingSvc.listarPorTenant(tenantId);
    expect(faturas.length).toBeGreaterThanOrEqual(1);
    const f = faturas[0];
    expect(Number.isInteger(Number(f.valor_total))).toBe(true);
  });

  // --- Story 10.2: Cobrança recorrente de Módulos ---

  it('deve incluir assinatura de módulo habilitado na fatura (10.2 AC-1)', async () => {
    // Habilitar módulo pedidos_kds (nome canônico de core/gating/modulos.ts)
    await moduloSvc.definir(tenantId, 'pedidos_kds', true, staffId);

    // Cancelar a fatura anterior para permitir nova geração no mesmo período
    const faturas = await billingSvc.listarPorTenant(tenantId);
    for (const f of faturas) {
      if (f.status === 'aberta') {
        await billingSvc.cancelarFatura(f.id);
      }
    }

    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2026-08-01T00:00:00Z',
      '2026-09-01T00:00:00Z',
    );

    const itensModulo = fatura.itens.filter((i) => i.tipo === 'modulo');
    expect(itensModulo.length).toBeGreaterThanOrEqual(1);

    const kdsItem = itensModulo.find((i) => i.descricao.includes('pedidos_kds'));
    expect(kdsItem).toBeDefined();
    expect(kdsItem!.valor).toBe(10_000); // R$ 100,00/mês

    // Módulo não habilitado não deve gerar cobrança
    const outroItem = itensModulo.find((i) => i.descricao.includes('gestao_cozinha'));
    expect(outroItem).toBeUndefined();
  });

  // --- Story 10.3: Cobrança de consumo e extras ---

  it('deve incluir consumo de materiais como item extra na fatura (10.3 AC-1)', async () => {
    // Criar material e registrar consumo
    const mat = await materialSvc.criar('Papel Toalha');
    await materialSvc.registrarMovimento(
      mat.id, 'entrada', 100, 0, null, null,
    );
    await materialSvc.registrarMovimento(
      mat.id, 'consumo', 5, 200, tenantId, null, // 5 unidades a R$ 2,00 cada
    );

    // Cancelar faturas abertas
    const faturas = await billingSvc.listarPorTenant(tenantId);
    for (const f of faturas) {
      if (f.status === 'aberta') {
        await billingSvc.cancelarFatura(f.id);
      }
    }

    // Usar período que cobre "agora" (momento da criação do consumo)
    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2020-01-01T00:00:00Z',
      '2030-01-01T00:00:00Z',
    );

    const itensConsumo = fatura.itens.filter((i) => i.tipo === 'consumo_material');
    expect(itensConsumo.length).toBeGreaterThanOrEqual(1);

    const papelItem = itensConsumo.find((i) => i.descricao.includes('Papel Toalha'));
    expect(papelItem).toBeDefined();
    expect(papelItem!.valor).toBe(5 * 200); // 1.000 centavos
    expect(papelItem!.origem_id).toBeTruthy(); // Rastreabilidade ao material_movimento
  });

  it('deve consolidar aluguel + módulo + extras no total da fatura (10.3 AC-1 consolidação)', async () => {
    // A última fatura gerada (período 2020–2030) deve conter os 3 tipos
    const faturas = await billingSvc.listarPorTenant(tenantId);
    // Buscar a fatura aberta mais recente
    const aberta = faturas.find((f) => f.status === 'aberta');
    expect(aberta).toBeDefined();

    const fatura = await billingSvc.obterFatura(aberta!.id);

    // O total deve ser a soma aritmética dos itens
    const somaItens = fatura.itens.reduce((acc, i) => acc + Number(i.valor), 0);
    expect(Number(fatura.valor_total)).toBe(somaItens);

    // Deve conter itens dos 3 tipos
    const tipos = new Set(fatura.itens.map((i) => i.tipo));
    expect(tipos.has('aluguel')).toBe(true);
    expect(tipos.has('modulo')).toBe(true);
    expect(tipos.has('consumo_material')).toBe(true);
  });

  // --- Fluxo de pagamento e cancelamento ---

  it('deve registrar pagamento de fatura aberta', async () => {
    // Gerar fatura nova em período sem conflito
    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2026-10-01T00:00:00Z',
      '2026-11-01T00:00:00Z',
    );
    expect(fatura.status).toBe('aberta');

    const paga = await billingSvc.pagarFatura(fatura.id);
    expect(paga.status).toBe('paga');

    // Tentar pagar novamente deve falhar
    await expect(billingSvc.pagarFatura(fatura.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve excluir uma fatura aberta', async () => {
    const fatura = await billingSvc.gerarFatura(
      tenantId,
      '2026-11-01T00:00:00Z',
      '2026-12-01T00:00:00Z',
    );

    const excluida = await billingSvc.excluirFatura(fatura.id);
    expect(excluida.status).toBe('cancelada');
    await expect(billingSvc.excluirFatura(fatura.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deve impedir fatura duplicada no mesmo período (idempotência)', async () => {
    await expect(
      billingSvc.gerarFatura(tenantId, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('deve rejeitar tipo de item de fatura não suportado', () => {
    expect(() => (billingSvc as any).normalizarTipoFaturaItem('pedido')).toThrow(
      'Tipo de item de fatura não suportado: pedido',
    );
  });

  it('deve falhar ao gerar fatura para inquilino inexistente', async () => {
    await expect(
      billingSvc.gerarFatura(
        '00000000-0000-0000-0000-000000000000',
        '2026-08-01T00:00:00Z',
        '2026-09-01T00:00:00Z',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
