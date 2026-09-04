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
    expect(cafeItem!.valor).toBe(20_000);
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
    expect(kdsItem!.valor).toBe(15_000); // R$ 150,00

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

  it('deve impedir fatura duplicada no mesmo período (idempotência)', async () => {
    await expect(
      billingSvc.gerarFatura(tenantId, '2026-10-01T00:00:00Z', '2026-11-01T00:00:00Z'),
    ).rejects.toBeInstanceOf(ConflictException);
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
