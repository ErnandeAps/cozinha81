import { BadRequestException, NotFoundException } from '@nestjs/common';
import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import { InsumoService } from './insumo.service';

jest.setTimeout(180_000);

describe('Insumo (Story 2.1)', () => {
  let h: PgHarness;
  let service: InsumoService;
  let tenantIdA: string;
  let tenantIdB: string;

  beforeAll(async () => {
    h = await startPgHarness();
    service = new InsumoService(h.db);
    tenantIdA = await seedInquilino(h, 'Restaurante A');
    tenantIdB = await seedInquilino(h, 'Restaurante B');
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('deve cadastrar um insumo com sucesso e retornar saldo zerado', async () => {
    const insumo = await service.criar(tenantIdA, {
      nome: 'Frango desfiado',
      unidade_base: 'kg',
      estoque_minimo: 5, // 5kg
      lote_validade: true,
    });

    expect(insumo.id).toBeTruthy();
    expect(insumo.nome).toBe('Frango desfiado');
    expect(insumo.unidade_base).toBe('kg');
    expect(insumo.estoque_minimo).toBe('5');
    expect(insumo.lote_validade).toBe(true);
    expect(Number(insumo.quantidade_atual)).toBe(0);
  });

  it('deve falhar ao cadastrar insumo sem nome ou sem unidade_base', async () => {
    await expect(
      service.criar(tenantIdA, {
        nome: '',
        unidade_base: 'kg',
      })
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.criar(tenantIdA, {
        nome: 'Tomate',
        unidade_base: '',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deve listar apenas insumos pertencentes ao inquilino (RLS)', async () => {
    // Cria insumo no tenant A
    await service.criar(tenantIdA, {
      nome: 'Alface americana',
      unidade_base: 'un',
    });

    // Cria insumo no tenant B
    await service.criar(tenantIdB, {
      nome: 'Cebola roxa',
      unidade_base: 'kg',
    });

    // Listando como tenant A
    const listA = await service.listar(tenantIdA);
    const nomesA = listA.map((i) => i.nome);
    expect(nomesA).toContain('Frango desfiado');
    expect(nomesA).toContain('Alface americana');
    expect(nomesA).not.toContain('Cebola roxa');

    // Listando como tenant B
    const listB = await service.listar(tenantIdB);
    const nomesB = listB.map((i) => i.nome);
    expect(nomesB).toContain('Cebola roxa');
    expect(nomesB).not.toContain('Frango desfiado');
    expect(nomesB).not.toContain('Alface americana');
  });

  it('deve obter por id e falhar se pertencer a outro inquilino', async () => {
    const insumo = await service.criar(tenantIdA, {
      nome: 'Carne moída',
      unidade_base: 'kg',
    });

    const obtido = await service.obterPorId(tenantIdA, insumo.id);
    expect(obtido.nome).toBe('Carne moída');

    // Tenant B tentando obter
    await expect(service.obterPorId(tenantIdB, insumo.id)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  it('deve atualizar com sucesso e falhar em outro inquilino', async () => {
    const insumo = await service.criar(tenantIdA, {
      nome: 'Azeite de oliva',
      unidade_base: 'L',
      estoque_minimo: 1,
    });

    const atualizado = await service.atualizar(tenantIdA, insumo.id, {
      nome: 'Azeite virgem extra',
      estoque_minimo: 2,
    });

    expect(atualizado.nome).toBe('Azeite virgem extra');
    expect(atualizado.estoque_minimo).toBe('2');

    // Tenant B tentando atualizar
    await expect(
      service.atualizar(tenantIdB, insumo.id, { nome: 'Invasor' })
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deve remover com sucesso e falhar em outro inquilino', async () => {
    const insumo = await service.criar(tenantIdA, {
      nome: 'Sal marinho',
      unidade_base: 'kg',
    });

    // Tenant B tentando remover
    await expect(service.remover(tenantIdB, insumo.id)).rejects.toBeInstanceOf(
      NotFoundException
    );

    // Tenant A removendo com sucesso
    await service.remover(tenantIdA, insumo.id);

    await expect(service.obterPorId(tenantIdA, insumo.id)).rejects.toBeInstanceOf(
      NotFoundException
    );
  });

  describe('Ledger de Movimentos (Story 2.2)', () => {
    it('deve registrar entradas, acumular o saldo derivado e deduzir por cause_key', async () => {
      const insumo = await service.criar(tenantIdA, {
        nome: 'Tomate Italiano',
        unidade_base: 'kg',
        lote_validade: true,
      });

      const causeKeyA = '019056d6-f28a-7d22-bd55-a2283ea4e22a';
      const causeKeyB = '019056d6-f28a-7d22-bd55-a2283ea4e22b';

      // 1) Registro da primeira entrada (2.5 kg)
      const entrada1 = await service.registrarEntrada(tenantIdA, {
        insumoId: insumo.id,
        quantidade: 2.5,
        precoCentavos: 1550, // R$ 15,50
        causeKey: causeKeyA,
        lote: 'L123',
        validade: new Date(Date.now() + 86400000 * 5).toISOString(),
      });

      expect(entrada1.id).toBeTruthy();
      expect(entrada1.quantidade).toBe('2.5');

      // Verifica saldo
      const insumoCarregado1 = await service.obterPorId(tenantIdA, insumo.id);
      expect(Number(insumoCarregado1.quantidade_atual)).toBe(2.5);

      // 2) Registro da segunda entrada (1.5 kg)
      await service.registrarEntrada(tenantIdA, {
        insumoId: insumo.id,
        quantidade: 1.5,
        precoCentavos: 900, // R$ 9,00
        causeKey: causeKeyB,
        lote: 'L124',
        validade: new Date(Date.now() + 86400000 * 5).toISOString(),
      });

      // Verifica saldo acumulado
      const insumoCarregado2 = await service.obterPorId(tenantIdA, insumo.id);
      expect(Number(insumoCarregado2.quantidade_atual)).toBe(4);

      // 3) Idempotência: reenvia entrada 1 (causeKeyA)
      const resIdempotente = await service.registrarEntrada(tenantIdA, {
        insumoId: insumo.id,
        quantidade: 2.5,
        precoCentavos: 1550,
        causeKey: causeKeyA,
        lote: 'L123',
        validade: new Date(Date.now() + 86400000 * 5).toISOString(),
      });

      expect(resIdempotente.id).toBe(entrada1.id);

      // Saldo não deve ter mudado
      const insumoCarregado3 = await service.obterPorId(tenantIdA, insumo.id);
      expect(Number(insumoCarregado3.quantidade_atual)).toBe(4);

      // 4) Histórico de preços
      const historico = await service.obterHistoricoPrecos(tenantIdA, insumo.id);
      expect(historico.length).toBe(2);
      expect(historico[0].preco_centavos).toBe('900'); // Ordem decrescente
      expect(historico[1].preco_centavos).toBe('1550');
    });

    it('deve exigir lote e validade quando lote_validade for ativado no insumo', async () => {
      const insumo = await service.criar(tenantIdA, {
        nome: 'Leite Condensado',
        unidade_base: 'un',
        lote_validade: true,
      });

      await expect(
        service.registrarEntrada(tenantIdA, {
          insumoId: insumo.id,
          quantidade: 10,
          precoCentavos: 500,
          causeKey: '019056d6-f28a-7d22-bd55-a2283ea4e22c',
          lote: '',
          validade: '',
        })
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('Registro de Perda (Story 2.3)', () => {
    it('deve registrar perda e diminuir o saldo', async () => {
      const insumo = await service.criar(tenantIdA, {
        nome: 'Couve Flor',
        unidade_base: 'kg',
      });

      // Entrada de 10 kg
      await service.registrarEntrada(tenantIdA, {
        insumoId: insumo.id,
        quantidade: 10,
        precoCentavos: 5000,
        causeKey: '019056d6-0000-7000-8000-000000000401',
      });

      // Perda de 3 kg
      const perda = await service.registrarPerda(tenantIdA, insumo.id, {
        quantidade: 3,
        motivo: 'vencimento',
        causeKey: '019056d6-0000-7000-8000-000000000402',
      });

      expect(perda.id).toBeTruthy();
      expect(perda.tipo).toBe('perda');
      expect(perda.quantidade).toBe('3');
      expect(perda.motivo).toBe('vencimento');

      // Verifica saldo
      const insumoCarregado = await service.obterPorId(tenantIdA, insumo.id);
      expect(Number(insumoCarregado.quantidade_atual)).toBe(7); // 10 - 3 = 7
    });
  });

  describe('Alerta de Estoque Mínimo (Story 2.4)', () => {
    it('deve gerar alerta quando saldo atingir o estoque minimo e limpar ao repor', async () => {
      const insumo = await service.criar(tenantIdA, {
        nome: 'Queijo Muçarela',
        unidade_base: 'kg',
        estoque_minimo: 0.5, // 500g
      });

      // Entrada de 1 kg
      await service.registrarEntrada(tenantIdA, {
        insumoId: insumo.id,
        quantidade: 1,
        precoCentavos: 3500,
        causeKey: '019056d6-0000-7000-8000-000000000501',
      });

      // Sem alertas ativos inicialmente
      let alertas = await service.obterAlertasAtivos(tenantIdA);
      expect(alertas.some((a) => a.insumo_id === insumo.id)).toBe(false);

      // Perda de 600g -> saldo restante = 400g (abaixo do minimo 500g)
      await service.registrarPerda(tenantIdA, insumo.id, {
        quantidade: 0.6,
        motivo: 'deterioracao',
        causeKey: '019056d6-0000-7000-8000-000000000502',
      });

      // Deve gerar alerta
      alertas = await service.obterAlertasAtivos(tenantIdA);
      const alertaInsumo = alertas.find((a) => a.insumo_id === insumo.id);
      expect(alertaInsumo).toBeTruthy();
      expect(Number(alertaInsumo.quantidade_atual)).toBe(0.4);

      // Reposição de 200g -> saldo restante = 600g (acima do minimo 500g)
      await service.registrarEntrada(tenantIdA, {
        insumoId: insumo.id,
        quantidade: 0.2,
        precoCentavos: 700,
        causeKey: '019056d6-0000-7000-8000-000000000503',
      });

      // Alerta deve sumir
      alertas = await service.obterAlertasAtivos(tenantIdA);
      expect(alertas.some((a) => a.insumo_id === insumo.id)).toBe(false);
    });
  });

  describe('Conversão de Unidade compra->uso (Story 2.5)', () => {
    it('deve realizar conversões determinísticas com arredondamento', () => {
      // 1 kg = 1000 g
      // 180 g -> expect 0.18
      const baseScaled1 = service.converterUsoParaBase(180, 1000);
      expect(baseScaled1).toBe(0.18);

      // 180.5 g -> expect 0.1805
      const baseScaled2 = service.converterUsoParaBase(180.5, 1000);
      expect(baseScaled2).toBe(0.1805);

      // Preço base = 1000 centavos, uso = 180, fator = 1000 -> custo = 180 centavos
      const custo1 = service.calcularCustoUso(1000, 180, 1000);
      expect(custo1).toBe(180);

      // Preço base = 1550 centavos (R$ 15,50), uso = 180 -> custo = 279 (R$ 2,79)
      const custo2 = service.calcularCustoUso(1550, 180, 1000);
      expect(custo2).toBe(279);
    });
  });
});
