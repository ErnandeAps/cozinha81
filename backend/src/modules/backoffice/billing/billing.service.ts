import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../../core/database/database.service';
import {
  MODALIDADE_PERCENTE_ALUGUEL,
  PRECO_ALUGUEL_CENTAVOS,
  PRECO_GAS_CENTAVOS,
  PRECO_MODULO_CENTAVOS,
} from './billing.constants';

export const FATURA_ITEM_TIPOS = ['aluguel', 'modulo', 'consumo_material', 'hora_extra', 'multa', 'gas'] as const;
export type FaturaItemTipo = (typeof FATURA_ITEM_TIPOS)[number];

const HORAS_NOMINAIS_POR_DIA_POR_MODALIDADE: Record<string, number> = {
  turno: 4,
  cafe: 4,
  almoco: 4,
  jantar: 4,
  personalizado: 4,
  dia: 8,
  semana: 40,
  mes: 176,
};

export interface FaturaRow {
  id: string;
  tenant_id: string;
  periodo_inicio: Date;
  periodo_fim: Date;
  status: 'aberta' | 'paga' | 'vencida' | 'cancelada';
  valor_total: number;
  criado_em: Date;
}

export interface FaturaItemRow {
  id: string;
  fatura_id: string;
  tipo: FaturaItemTipo;
  descricao: string;
  valor: number;
  origem_id: string | null;
  criado_em: Date;
}

export interface FluxoCaixaLancamentoRow {
  id: string;
  tenant_id: string;
  tipo: 'entrada' | 'saida';
  descricao: string;
  valor: number;
  data_lancamento: Date;
  origem: 'manual' | 'fatura';
  fatura_id: string | null;
  criado_em: Date;
}

@Injectable()
export class BillingService {
  constructor(private readonly db: DatabaseService) {}

  normalizarTipoFaturaItem(tipo: string): FaturaItemTipo {
    if ((FATURA_ITEM_TIPOS as readonly string[]).includes(tipo)) {
      return tipo as FaturaItemTipo;
    }

    throw new Error(`Tipo de item de fatura não suportado: ${tipo}`);
  }

  private async listarPrecosNoTransaction(
    tenantId: string | undefined,
    c: PoolClient,
  ): Promise<{
    aluguel: Record<string, number>;
    modulo: Record<string, number>;
    gas: Record<string, number>;
  }> {
    const precosPadrao = {
      aluguel: { ...PRECO_ALUGUEL_CENTAVOS },
      modulo: { ...PRECO_MODULO_CENTAVOS },
      gas: { ...PRECO_GAS_CENTAVOS },
    };

    const { rows } = await c.query<{
      categoria: 'aluguel' | 'modulo' | 'gas';
      chave: string;
      valor_centavos: number;
      tenant_id: string | null;
    }>(
      `SELECT categoria, chave, valor_centavos, tenant_id
       FROM billing_preco_config
       WHERE ativo = true
         AND (tenant_id IS NULL OR tenant_id = $1)
       ORDER BY tenant_id NULLS LAST, chave`,
      [tenantId ?? null],
    );

    const precos = {
      aluguel: { ...precosPadrao.aluguel },
      modulo: { ...precosPadrao.modulo },
      gas: { ...precosPadrao.gas },
    };

    for (const row of rows) {
      if (row.categoria === 'aluguel') {
        precos.aluguel[row.chave] = row.valor_centavos;
      }
      if (row.categoria === 'modulo') {
        precos.modulo[row.chave] = row.valor_centavos;
      }
      if (row.categoria === 'gas') {
        precos.gas[row.chave] = row.valor_centavos;
      }
    }

    return precos;
  }

  async listarPrecos(tenantId?: string): Promise<{
    aluguel: Record<string, number>;
    modulo: Record<string, number>;
    gas: Record<string, number>;
  }> {
    return this.db.withPlatform(async (c) => this.listarPrecosNoTransaction(tenantId, c));
  }

  /**
   * Gera uma fatura consolidada para um inquilino no período informado.
   *
   * Fluxo transacional (tudo-ou-nada):
   * 1. Coleta reservas do período → itens de aluguel (FR-38 / Story 10.1)
   * 2. Coleta módulos habilitados → itens de assinatura (FR-39 / Story 10.2)
   * 3. Coleta consumos de materiais no período → itens de extras (FR-40 / Story 10.3)
   * 4. Insere fatura + itens em transação atômica
   */
  async gerarFatura(
    tenantId: string,
    inicio: string,
    fim: string,
  ): Promise<FaturaRow & { itens: FaturaItemRow[] }> {
    return this.db.withPlatform(async (c) => {
      // Verificar se o inquilino existe
      const { rows: tenantRows } = await c.query(
        'SELECT 1 FROM inquilino WHERE id = $1',
        [tenantId],
      );
      if (tenantRows.length === 0) {
        throw new NotFoundException(`Inquilino não encontrado: ${tenantId}`);
      }

      // Verificar duplicidade de fatura para o mesmo tenant+período
      const { rows: existentes } = await c.query(
        `SELECT 1 FROM fatura
         WHERE tenant_id = $1 AND periodo_inicio = $2 AND periodo_fim = $3
         AND status != 'cancelada'`,
        [tenantId, inicio, fim],
      );
      if (existentes.length > 0) {
        throw new ConflictException(
          'Já existe uma fatura para este inquilino neste período.',
        );
      }

      // --- 1. Reservas do período → itens de aluguel ---
      const { rows: reservas } = await c.query<{
        id: string;
        cozinha_id: string;
        modalidade: string;
        inicio: Date;
        fim: Date;
      }>(
        `SELECT id, cozinha_id, modalidade, lower(periodo) as inicio, upper(periodo) as fim
         FROM reserva
         WHERE tenant_id = $1
           AND lower(periodo) < $3::timestamptz
           AND upper(periodo) > $2::timestamptz
         ORDER BY lower(periodo)`,
        [tenantId, inicio, fim],
      );

      const cozinhasReservadas = [...new Set(reservas.map((r) => r.cozinha_id))];
      const centroCustos = cozinhasReservadas.length > 0
        ? await c.query<{ cozinha_id: string; aluguel_mensal: number }>(
            `SELECT cozinha_id, aluguel_mensal
             FROM centro_custo
             WHERE cozinha_id = ANY($1)`,
            [cozinhasReservadas],
          )
        : { rows: [] as Array<{ cozinha_id: string; aluguel_mensal: number }> };
      const aluguelMensalPorCozinha = new Map<string, number>(
        centroCustos.rows.map((row) => [row.cozinha_id, Number(row.aluguel_mensal || 0) / 100]),
      );
      const cozinhasComCentroCustoSemAluguel = new Set(
        centroCustos.rows
          .filter((row) => Number(row.aluguel_mensal || 0) <= 0)
          .map((row) => row.cozinha_id),
      );

      // --- 2. Módulos habilitados → assinaturas ---
      const { rows: modulos } = await c.query<{
        modulo: string;
        habilitado: boolean;
      }>(
        `SELECT modulo, habilitado FROM modulo_flag
         WHERE tenant_id = $1 AND habilitado = true`,
        [tenantId],
      );

      // --- 3. Consumo de materiais no período → extras ---
      const { rows: consumos } = await c.query<{
        id: string;
        material_id: string;
        quantidade: number;
        valor_unitario: number;
        nome: string;
      }>(
        `SELECT mm.id, mm.material_id, mm.quantidade, mm.valor_unitario, m.nome
         FROM material_movimento mm
         JOIN material m ON m.id = mm.material_id
         WHERE mm.tenant_id = $1
           AND mm.tipo = 'consumo'
           AND mm.criado_em >= $2::timestamptz
           AND mm.criado_em < $3::timestamptz
         ORDER BY mm.criado_em`,
        [tenantId, inicio, fim],
      );

      const precos = await this.listarPrecosNoTransaction(tenantId, c);

      const mesesCobertos = new Set<string>();
      const inicioMes = new Date(inicio);
      const fimMes = new Date(fim);
      for (let cursor = new Date(Date.UTC(inicioMes.getUTCFullYear(), inicioMes.getUTCMonth(), 1)); cursor <= fimMes; cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1))) {
        mesesCobertos.add(cursor.toISOString().slice(0, 7));
      }

      const mesesCobertosLista = [...mesesCobertos].sort();
      const { rows: fechamentosGas } = mesesCobertosLista.length > 0
        ? await c.query<{ mes: string; valor_faturado: number }>(
            `SELECT mes, valor_faturado
             FROM central_glp_fechamento
             WHERE tenant_id = $1
               AND mes = ANY($2)
             ORDER BY mes`,
            [tenantId, mesesCobertosLista],
          )
        : { rows: [] as Array<{ mes: string; valor_faturado: number }> };

      // --- Montar itens ---
      const itens: Array<{
        tipo: FaturaItemTipo;
        descricao: string;
        valor: number;
        origem_id: string | null;
      }> = [];

      for (const r of reservas) {
        const centroCustoExiste = centroCustos.rows.some((row) => row.cozinha_id === r.cozinha_id);
        if (centroCustoExiste && cozinhasComCentroCustoSemAluguel.has(r.cozinha_id)) {
          throw new Error(
            `Centro de custo da cozinha ${r.cozinha_id} está com aluguel_mensal vazio ou zero. Preencha o valor para gerar a fatura.`,
          );
        }

        const inicioReserva = new Date(r.inicio);
        const fimReserva = new Date(r.fim);

        const horasPorDia = Math.max(
          0,
          (fimReserva.getUTCHours() + fimReserva.getUTCMinutes() / 60 + fimReserva.getUTCSeconds() / 3600)
          - (inicioReserva.getUTCHours() + inicioReserva.getUTCMinutes() / 60 + inicioReserva.getUTCSeconds() / 3600)
        );

        const inicioData = new Date(Date.UTC(
          inicioReserva.getUTCFullYear(),
          inicioReserva.getUTCMonth(),
          inicioReserva.getUTCDate(),
        ));
        const fimData = new Date(Date.UTC(
          fimReserva.getUTCFullYear(),
          fimReserva.getUTCMonth(),
          fimReserva.getUTCDate(),
        ));
        const diferencaDias = Math.max(0, Math.round((fimData.getTime() - inicioData.getTime()) / (24 * 60 * 60 * 1000)));
        const diasCobertos = diferencaDias + 1;
        const horasPermanenciaNominal = horasPorDia * diasCobertos;
        const aluguelMensal = aluguelMensalPorCozinha.get(r.cozinha_id) ?? 0;
        const totalHorasDisponiveisMes = 442;

        let valor = 0;

        if (aluguelMensal > 0 && horasPermanenciaNominal > 0) {
          // Regra de negócio: o aluguel mensal é proporcional à permanência real do inquilino.
          // A fração da hora deve ser preservada até o cálculo final para não truncar o valor.
          const aluguelMensalCentavos = Math.round(aluguelMensal * 100);
          const valorHoraCentavos = aluguelMensalCentavos / totalHorasDisponiveisMes;
          const valorEmCentavos = Math.round(horasPermanenciaNominal * valorHoraCentavos);
          valor = valorEmCentavos;
        } else {
          const precoBase = precos.aluguel[r.modalidade];
          if (precoBase === undefined) {
            throw new Error(`Preço não configurado para a modalidade de reserva: ${r.modalidade}`);
          }

          const percentual = MODALIDADE_PERCENTE_ALUGUEL[r.modalidade] ?? 1;
          valor = Math.round(precoBase * percentual);
        }

        itens.push({
          tipo: 'aluguel',
          descricao: `Aluguel ${r.modalidade}: ${inicioReserva.toISOString().slice(0, 10)} a ${fimReserva.toISOString().slice(0, 10)}`,
          valor,
          origem_id: r.id,
        });
      }

      for (const m of modulos) {
        const preco = precos.modulo[m.modulo];
        if (preco === undefined) {
          throw new Error(`Preço não configurado para o módulo: ${m.modulo}`);
        }
        itens.push({
          tipo: 'modulo',
          descricao: `Assinatura módulo ${m.modulo}`,
          valor: preco,
          origem_id: null,
        });
      }

      for (const consumo of consumos) {
        const valorItem = consumo.quantidade * consumo.valor_unitario;
        itens.push({
          tipo: 'consumo_material',
          descricao: `Consumo de ${consumo.nome} (${consumo.quantidade} un)`,
          valor: valorItem,
          origem_id: consumo.id,
        });
      }

      for (const fechamento of fechamentosGas) {
        const valorFaturado = Number(fechamento.valor_faturado ?? 0);
        const valorItem = Math.round(valorFaturado * 100);

        itens.push({
          tipo: 'gas',
          descricao: `Consumo de gás (${fechamento.mes})`,
          valor: valorItem,
          origem_id: null,
        });
      }

      // --- Calcular total ---
      const valorTotal = itens.reduce((acc, i) => acc + i.valor, 0);

      // --- Inserir fatura ---
      const { rows: faturaRows } = await c.query<FaturaRow>(
        `INSERT INTO fatura (tenant_id, periodo_inicio, periodo_fim, status, valor_total)
         VALUES ($1, $2, $3, 'aberta', $4)
         RETURNING *`,
        [tenantId, inicio, fim, valorTotal],
      );
      const fatura = faturaRows[0];

      // --- Inserir itens ---
      const itensInseridos: FaturaItemRow[] = [];
      for (const item of itens) {
        const tipo = this.normalizarTipoFaturaItem(item.tipo);
       

        const { rows } = await c.query<FaturaItemRow>(
          `INSERT INTO fatura_item (fatura_id, tipo, descricao, valor, origem_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [fatura.id, tipo, item.descricao, item.valor, item.origem_id],
        );
        itensInseridos.push(rows[0]);
      }

      return { ...fatura, itens: itensInseridos };
    });
  }

  async pagarFatura(faturaId: string): Promise<FaturaRow> {
    return this.db.withPlatform(async (c) => {
      const { rows: faturaRows, rowCount } = await c.query<FaturaRow>(
        `UPDATE fatura SET status = 'paga' WHERE id = $1 AND status = 'aberta' RETURNING *`,
        [faturaId],
      );
      if (rowCount === 0) {
        throw new NotFoundException(
          `Fatura não encontrada ou não está aberta: ${faturaId}`,
        );
      }

      const fatura = faturaRows[0];
      await c.query(
        `INSERT INTO fluxo_caixa_lancamento (tenant_id, tipo, descricao, valor, data_lancamento, origem, fatura_id)
         VALUES ($1, 'entrada', $2, $3, now(), 'fatura', $4)`,
        [fatura.tenant_id, `Recebimento da fatura ${faturaId.slice(0, 8)}`, Number(fatura.valor_total || 0), faturaId],
      );

      return fatura;
    });
  }

  async cancelarFatura(faturaId: string): Promise<FaturaRow> {
    return this.db.withPlatform(async (c) => {
      const { rows, rowCount } = await c.query<FaturaRow>(
        `UPDATE fatura SET status = 'cancelada' WHERE id = $1 AND status = 'aberta' RETURNING *`,
        [faturaId],
      );
      if (rowCount === 0) {
        throw new NotFoundException(
          `Fatura não encontrada ou não está aberta: ${faturaId}`,
        );
      }
      return rows[0];
    });
  }

  async excluirFatura(faturaId: string): Promise<FaturaRow> {
    return this.cancelarFatura(faturaId);
  }

  async obterFatura(faturaId: string): Promise<FaturaRow & { itens: FaturaItemRow[] }> {
    return this.db.withPlatform(async (c) => {
      const { rows: faturaRows } = await c.query<FaturaRow>(
        'SELECT * FROM fatura WHERE id = $1',
        [faturaId],
      );
      if (faturaRows.length === 0) {
        throw new NotFoundException(`Fatura não encontrada: ${faturaId}`);
      }
      const { rows: itensRows } = await c.query<FaturaItemRow>(
        'SELECT * FROM fatura_item WHERE fatura_id = $1 ORDER BY criado_em',
        [faturaId],
      );
      return { ...faturaRows[0], itens: itensRows };
    });
  }

  async listarPorTenant(tenantId: string): Promise<FaturaRow[]> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<FaturaRow>(
        'SELECT * FROM fatura WHERE tenant_id = $1 ORDER BY criado_em DESC',
        [tenantId],
      );
      return rows;
    });
  }

  async listarTodas(): Promise<FaturaRow[]> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<FaturaRow>(
        'SELECT * FROM fatura ORDER BY criado_em DESC',
      );
      return rows;
    });
  }

  async listarLancamentosCaixa(
    tenantId?: string,
    inicio?: string,
    fim?: string,
  ): Promise<FluxoCaixaLancamentoRow[]> {
    return this.db.withPlatform(async (c) => {
      const params: unknown[] = [];
      const filtros: string[] = [];

      if (tenantId) {
        params.push(tenantId);
        filtros.push(`tenant_id = $${params.length}`);
      }

      if (inicio) {
        params.push(new Date(inicio).toISOString());
        filtros.push(`data_lancamento >= $${params.length}`);
      }

      if (fim) {
        params.push(new Date(fim).toISOString());
        filtros.push(`data_lancamento < $${params.length}`);
      }

      const whereClause = filtros.length > 0 ? ` WHERE ${filtros.join(' AND ')}` : '';
      const query = `SELECT * FROM fluxo_caixa_lancamento${whereClause} ORDER BY data_lancamento DESC, criado_em DESC`;

      const { rows } = await c.query<FluxoCaixaLancamentoRow>(query, params);
      return rows;
    });
  }

  async registrarLancamentoCaixa(payload: {
    tenantId?: string;
    tipo: 'entrada' | 'saida';
    descricao: string;
    valor: number;
    dataLancamento?: string;
    origem?: 'manual' | 'fatura';
    faturaId?: string | null;
  }): Promise<FluxoCaixaLancamentoRow> {
    const valor = Number(payload.valor ?? 0);
    if (!payload.descricao?.trim()) {
      throw new NotFoundException('Descrição é obrigatória.');
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new NotFoundException('Valor do lançamento deve ser maior que zero.');
    }

    return this.db.withPlatform(async (c) => {
      const tenantId = payload.tenantId || await this.obterTenantPadrao(c);

      const { rows } = await c.query<FluxoCaixaLancamentoRow>(
        `INSERT INTO fluxo_caixa_lancamento (tenant_id, tipo, descricao, valor, data_lancamento, origem, fatura_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          tenantId,
          payload.tipo,
          payload.descricao.trim(),
          Math.round(valor),
          payload.dataLancamento ? new Date(payload.dataLancamento).toISOString() : new Date().toISOString(),
          payload.origem ?? 'manual',
          payload.faturaId ?? null,
        ],
      );

      return rows[0];
    });
  }

  private async obterTenantPadrao(c: import('pg').PoolClient): Promise<string> {
    const { rows } = await c.query<{ id: string }>(
      'SELECT id FROM inquilino ORDER BY criado_em DESC LIMIT 1',
    );

    if (!rows[0]?.id) {
      throw new NotFoundException('Nenhum inquilino cadastrado para registrar o lançamento de caixa.');
    }

    return rows[0].id;
  }
}
