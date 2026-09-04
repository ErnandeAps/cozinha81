import { BadRequestException, Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../core/database/database.service';

export type TipoMovimentoGlp = 'abastecimento' | 'consumo' | 'perda' | 'ajuste';

export interface CentralGlpConfig {
  id: string;
  nomeCentral: string;
  capacidadeTotalKg: number;
  capacidadeCilindrosKg: number;
  capacidadePorCilindroKg: number;
  estoqueAtualKg: number;
  estoqueMinimoKg: number;
  estoqueCriticoKg: number;
  valorUnitarioKgFornecedor: number;
  valorUnitarioKgInquilino: number;
  unidadeCompra: 'kg';
  unidadeMedicao: 'm3';
  fatorConversao: number;
  statusCentral: 'ativa' | 'manutencao' | 'inativa';
  atualizadoEm: string;
}

export interface AbastecimentoGlp {
  id: string;
  data: string;
  fornecedor: string;
  notaFiscal?: string;
  quantidadeKg: number;
  quantidadeCilindros: number;
  valorTotal: number;
  custoPorKg: number;
  criadoEm: string;
}

export interface LeituraMedidorGlp {
  id: string;
  cozinhaId: string;
  data: string;
  leituraAnterior: number;
  leituraAtual: number;
  consumoM3: number;
  unidade: string;
  fatorConversao: number;
  consumoKg: number;
  criadoEm: string;
}

export interface DashboardLeituraCentralGlp {
  id: string;
  tenantId: string;
  nomeInquilino: string;
  dataLeitura: string;
  leituraInicial: number;
  leituraFinal: number;
  consumoKg: number;
}

export interface ConsumoPorCozinhaGlp {
  id: string;
  cozinhaId: string;
  periodo: string;
  consumoKg: number;
  valorCobrar: number;
  criadoEm: string;
}

export interface PerdaAjusteGlp {
  id: string;
  tipo: 'perda' | 'vazamento' | 'erro_medicao' | 'ajuste';
  quantidadeKg: number;
  motivo: string;
  data: string;
  criadoEm: string;
}

export interface FechamentoMensalGlp {
  id: string;
  tenantId: string;
  mes: string;
  consumoTotalKg: number;
  custoPeriodo: number;
  valorFaturado: number;
  perdasKg: number;
  saldoFinalKg: number;
  criadoEm: string;
}

export interface DashboardGlpResumo {
  estoqueAtualKg: number;
  percentualCapacidade: number;
  consumoTotalKg: number;
  totalAbastecimentosKg: number;
  custoMedioKg: number;
  valorFaturado: number;
  previsaoAutonomiaDias: number;
  alertaEstoque: 'normal' | 'baixo' | 'critico';
  movimentos: Array<
    | (AbastecimentoGlp & { tipo: 'abastecimento' })
    | (LeituraMedidorGlp & { tipo: 'consumo' })
    | (PerdaAjusteGlp & { tipo: 'perda' | 'vazamento' | 'erro_medicao' | 'ajuste' })
    | (ConsumoPorCozinhaGlp & { tipo: 'consumo' })
  >;
}

export interface ConfigurarCentralGlpDto {
  nomeCentral?: string;
  capacidadeTotalKg: number;
  capacidadeCilindrosKg: number;
  capacidadePorCilindroKg?: number;
  estoqueAtualKg: number;
  estoqueMinimoKg: number;
  estoqueCriticoKg: number;
  valorUnitarioKgFornecedor?: number;
  valorUnitarioKgInquilino?: number;
  unidadeCompra?: 'kg';
  unidadeMedicao?: 'm3';
  fatorConversao: number;
  statusCentral?: 'ativa' | 'manutencao' | 'inativa';
}

export interface RegistrarAbastecimentoGlpDto {
  data: string;
  fornecedor: string;
  notaFiscal?: string;
  quantidadeKg: number;
  quantidadeCilindros: number;
  valorTotal: number;
}

export interface RegistrarLeituraMedidorGlpDto {
  cozinhaId: string;
  data: string;
  leituraAnterior: number;
  leituraAtual: number;
  unidade?: string;
  fatorConversao?: number;
}

export interface RegistrarPerdaAjusteGlpDto {
  tipo: 'perda' | 'vazamento' | 'erro_medicao' | 'ajuste';
  quantidadeKg: number;
  motivo: string;
  data: string;
}

export interface FecharMesGlpDto {
  mes: string;
  custoPorKg?: number;
  valorFaturado?: number;
}

@Injectable()
export class GestaoCentralGlpService {
  constructor(private readonly db: DatabaseService) {}

  async configurarCentral(tenantId: string, dto: ConfigurarCentralGlpDto): Promise<CentralGlpConfig> {
    const nomeCentral = (dto.nomeCentral ?? 'Central de GLP').trim();
    if (!nomeCentral) {
      throw new BadRequestException('O nome da central é obrigatório.');
    }
    if (!dto.capacidadeTotalKg || dto.capacidadeTotalKg <= 0) {
      throw new BadRequestException('A capacidade total da central deve ser maior que zero.');
    }
    if (!dto.capacidadeCilindrosKg || dto.capacidadeCilindrosKg <= 0) {
      throw new BadRequestException('A quantidade de cilindros deve ser maior que zero.');
    }
    if (!dto.fatorConversao || dto.fatorConversao <= 0) {
      throw new BadRequestException('O fator de conversão deve ser maior que zero.');
    }

    const valorUnitarioKgFornecedor = Number(dto.valorUnitarioKgFornecedor ?? 0);
    const valorUnitarioKgInquilino = Number(dto.valorUnitarioKgInquilino ?? 0);
    if (!Number.isFinite(valorUnitarioKgFornecedor) || valorUnitarioKgFornecedor < 0) {
      throw new BadRequestException('O valor pago ao fornecedor por kg deve ser válido.');
    }
    if (!Number.isFinite(valorUnitarioKgInquilino) || valorUnitarioKgInquilino < 0) {
      throw new BadRequestException('O valor cobrado ao inquilino por kg deve ser válido.');
    }

    return this.db.withTenant(tenantId, async (client) => {
      await client.query(
        `DELETE FROM central_glp_config
         WHERE tenant_id = $1
           AND id <> COALESCE((SELECT id FROM central_glp_config WHERE tenant_id = $1 ORDER BY atualizado_em DESC LIMIT 1), '00000000-0000-0000-0000-000000000000'::uuid)`,
        [tenantId],
      );

      await client.query(
        `INSERT INTO central_glp_config (
           tenant_id, nome_central, capacidade_total_kg, capacidade_cilindros_kg, capacidade_por_cilindro_kg,
           estoque_inicial_kg, estoque_minimo_kg, estoque_critico_kg, valor_unitario_kg_fornecedor, valor_unitario_kg_inquilino,
           fator_conversao, unidade_compra, unidade_medicao, status_central
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (tenant_id) DO UPDATE SET
           nome_central = EXCLUDED.nome_central,
           capacidade_total_kg = EXCLUDED.capacidade_total_kg,
           capacidade_cilindros_kg = EXCLUDED.capacidade_cilindros_kg,
           capacidade_por_cilindro_kg = EXCLUDED.capacidade_por_cilindro_kg,
           estoque_inicial_kg = EXCLUDED.estoque_inicial_kg,
           estoque_minimo_kg = EXCLUDED.estoque_minimo_kg,
           estoque_critico_kg = EXCLUDED.estoque_critico_kg,
           valor_unitario_kg_fornecedor = EXCLUDED.valor_unitario_kg_fornecedor,
           valor_unitario_kg_inquilino = EXCLUDED.valor_unitario_kg_inquilino,
           fator_conversao = EXCLUDED.fator_conversao,
           unidade_compra = EXCLUDED.unidade_compra,
           unidade_medicao = EXCLUDED.unidade_medicao,
           status_central = EXCLUDED.status_central,
           atualizado_em = now()`,
        [
          tenantId,
          nomeCentral,
          dto.capacidadeTotalKg,
          dto.capacidadeCilindrosKg,
          dto.capacidadePorCilindroKg ?? (dto.capacidadeTotalKg / dto.capacidadeCilindrosKg),
          dto.estoqueAtualKg ?? 0,
          dto.estoqueMinimoKg ?? 0,
          dto.estoqueCriticoKg ?? 0,
          valorUnitarioKgFornecedor,
          valorUnitarioKgInquilino,
          dto.fatorConversao,
          dto.unidadeCompra ?? 'kg',
          dto.unidadeMedicao ?? 'm3',
          dto.statusCentral ?? 'ativa',
        ],
      );
      return this.obterCentralComCliente(client);
    });
  }

  async obterCentral(tenantId: string): Promise<CentralGlpConfig | null> {
    return this.db.withTenant(tenantId, (client) => this.obterCentralComCliente(client, false));
  }

  async registrarAbastecimento(tenantId: string, dto: RegistrarAbastecimentoGlpDto): Promise<AbastecimentoGlp> {
    if (!dto.data) {
      throw new BadRequestException('A data do abastecimento é obrigatória.');
    }
    if (!dto.fornecedor?.trim()) {
      throw new BadRequestException('O fornecedor é obrigatório.');
    }

    const quantidadeKg = Number(dto.quantidadeKg);
    const quantidadeCilindros = Number(dto.quantidadeCilindros);
    const valorTotal = Number(dto.valorTotal);

    if (!Number.isFinite(quantidadeKg) || quantidadeKg <= 0) {
      throw new BadRequestException('A quantidade abastecida em kg deve ser maior que zero.');
    }
    if (!Number.isFinite(quantidadeCilindros) || quantidadeCilindros <= 0) {
      throw new BadRequestException('A quantidade de cilindros deve ser maior que zero.');
    }
    if (!Number.isFinite(valorTotal) || valorTotal < 0) {
      throw new BadRequestException('O valor total do abastecimento deve ser válido.');
    }

    return this.db.withTenant(tenantId, async (client) => {
      await this.exigirCentral(client, 'Cadastre a central de GLP antes de registrar o abastecimento.');
      const { rows } = await client.query<AbastecimentoRow>(
        `INSERT INTO central_glp_abastecimento (tenant_id, data, fornecedor, nota_fiscal, quantidade_kg, quantidade_cilindros, valor_total)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [tenantId, dto.data, dto.fornecedor.trim(), dto.notaFiscal?.trim() || null, quantidadeKg, quantidadeCilindros, valorTotal],
      );
      return this.mapAbastecimento(rows[0]);
    });
  }

  async listarAbastecimentos(tenantId: string): Promise<AbastecimentoGlp[]> {
    return this.db.withTenant(tenantId, async (client) => {
      const { rows } = await client.query<AbastecimentoRow>('SELECT * FROM central_glp_abastecimento ORDER BY data DESC, criado_em DESC');
      return rows.map((row) => this.mapAbastecimento(row));
    });
  }

  async removerAbastecimento(tenantId: string, id: string): Promise<void> {
    if (!tenantId) {
      throw new BadRequestException('tenantId é obrigatório.');
    }
    if (!id) {
      throw new BadRequestException('O id do abastecimento é obrigatório.');
    }

    await this.db.withTenant(tenantId, async (client) => {
      const { rowCount } = await client.query(
        `DELETE FROM central_glp_abastecimento WHERE tenant_id = $1 AND id = $2`,
        [tenantId, id],
      );

      if (rowCount === 0) {
        throw new BadRequestException(`Abastecimento não encontrado: ${id}`);
      }
    });
  }

  async registrarLeitura(tenantId: string, dto: RegistrarLeituraMedidorGlpDto): Promise<LeituraMedidorGlp> {
    if (!dto.cozinhaId?.trim()) {
      throw new BadRequestException('A cozinha do medidor é obrigatória.');
    }
    if (!dto.data) {
      throw new BadRequestException('A data da leitura é obrigatória.');
    }

    const leituraAnterior = Number(dto.leituraAnterior);
    const leituraAtual = Number(dto.leituraAtual);
    if (!Number.isFinite(leituraAnterior) || !Number.isFinite(leituraAtual)) {
      throw new BadRequestException('As leituras devem ser numéricas.');
    }
    if (leituraAtual < leituraAnterior) {
      throw new BadRequestException('A leitura atual não pode ser menor que a anterior.');
    }

    const consumoM3 = leituraAtual - leituraAnterior;
    const central = await this.exigirCentralCompartilhada('Cadastre a central de GLP antes de registrar leituras.');
    return this.db.withTenant(tenantId, async (client) => {
      const fator = Number(dto.fatorConversao ?? central.fatorConversao);
      const { rows } = await client.query<LeituraRow>(
        `INSERT INTO central_glp_leitura (tenant_id, cozinha_id, data, leitura_anterior, leitura_atual, unidade, fator_conversao)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [tenantId, dto.cozinhaId.trim(), dto.data, leituraAnterior, leituraAtual, dto.unidade ?? 'm3', fator],
      );
      return this.mapLeitura(rows[0]);
    });
  }

  async listarLeituras(tenantId: string): Promise<LeituraMedidorGlp[]> {
    return this.db.withTenant(tenantId, async (client) => {
      const { rows } = await client.query<LeituraRow>('SELECT * FROM central_glp_leitura ORDER BY data DESC, criado_em DESC');
      return rows.map((row) => this.mapLeitura(row));
    });
  }

  async listarLeiturasDashboard(tenantId?: string, dataInicio?: string, dataFim?: string): Promise<DashboardLeituraCentralGlp[]> {
    return this.db.withPlatform(async (client) => {
      const params: string[] = [];
      const clauses: string[] = [];

      if (tenantId) {
        clauses.push(`l.tenant_id = $${params.length + 1}`);
        params.push(tenantId);
      }
      if (dataInicio) {
        clauses.push(`l.data >= $${params.length + 1}`);
        params.push(dataInicio);
      }
      if (dataFim) {
        clauses.push(`l.data <= $${params.length + 1}`);
        params.push(dataFim);
      }

      const whereClause = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
      const { rows } = await client.query<DashboardLeituraCentralRow>(`
        SELECT l.id, l.tenant_id, i.nome AS nome_inquilino,
          to_char(l.data, 'YYYY-MM-DD') AS data_leitura,
          l.leitura_anterior, l.leitura_atual,
          ((l.leitura_atual - l.leitura_anterior) * l.fator_conversao) AS consumo_kg
        FROM central_glp_leitura l
        INNER JOIN inquilino i ON i.id = l.tenant_id
        ${whereClause}
        ORDER BY l.data DESC, l.criado_em DESC
      `, params);

      return rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        nomeInquilino: row.nome_inquilino,
        dataLeitura: row.data_leitura,
        leituraInicial: Number(row.leitura_anterior),
        leituraFinal: Number(row.leitura_atual),
        consumoKg: Number(row.consumo_kg),
      }));
    });
  }

  async removerLeitura(tenantId: string, id: string): Promise<void> {
    await this.db.withTenant(tenantId, async (client) => {
      const { rowCount } = await client.query(
        'DELETE FROM central_glp_leitura WHERE tenant_id = $1 AND id = $2',
        [tenantId, id],
      );
      if (rowCount === 0) throw new BadRequestException(`Leitura não encontrada: ${id}`);
    });
  }

  async registrarPerda(tenantId: string, dto: RegistrarPerdaAjusteGlpDto): Promise<PerdaAjusteGlp> {
    if (!dto.motivo?.trim()) {
      throw new BadRequestException('O motivo da perda ou ajuste é obrigatório.');
    }

    const quantidadeKg = Number(dto.quantidadeKg);
    if (!Number.isFinite(quantidadeKg) || quantidadeKg <= 0) {
      throw new BadRequestException('A quantidade de GLP em kg deve ser maior que zero.');
    }

    return this.db.withTenant(tenantId, async (client) => {
      await this.exigirCentral(client, 'Cadastre a central de GLP antes de registrar perdas.');
      const { rows } = await client.query<PerdaRow>(
        `INSERT INTO central_glp_perda_ajuste (tenant_id, tipo, quantidade_kg, motivo, data)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [tenantId, dto.tipo, quantidadeKg, dto.motivo.trim(), dto.data],
      );
      return this.mapPerda(rows[0]);
    });
  }

  async listarPerdas(tenantId: string): Promise<PerdaAjusteGlp[]> {
    return this.db.withTenant(tenantId, async (client) => {
      const { rows } = await client.query<PerdaRow>('SELECT * FROM central_glp_perda_ajuste ORDER BY data DESC, criado_em DESC');
      return rows.map((row) => this.mapPerda(row));
    });
  }

  async fecharMes(tenantId: string, dto: FecharMesGlpDto): Promise<FechamentoMensalGlp> {
    if (!/^\d{4}-\d{2}$/.test(dto.mes)) throw new BadRequestException('O mês deve estar no formato AAAA-MM.');
    return this.db.withTenant(tenantId, async (client) => {
      const central = await this.exigirCentral(client, 'Cadastre a central de GLP antes do fechamento mensal.');
      const resumo = await this.obterResumo(client, central);
      const custoPeriodo = resumo.consumoTotalKg * Number(dto.custoPorKg ?? resumo.custoMedioKg);
      const { rows } = await client.query<FechamentoRow>(
        `INSERT INTO central_glp_fechamento (tenant_id, mes, consumo_total_kg, custo_periodo, valor_faturado, perdas_kg, saldo_final_kg)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, mes) DO UPDATE SET consumo_total_kg = EXCLUDED.consumo_total_kg, custo_periodo = EXCLUDED.custo_periodo, valor_faturado = EXCLUDED.valor_faturado, perdas_kg = EXCLUDED.perdas_kg, saldo_final_kg = EXCLUDED.saldo_final_kg, criado_em = now()
         RETURNING *`,
        [tenantId, dto.mes, resumo.consumoTotalKg, custoPeriodo, dto.valorFaturado ?? custoPeriodo, resumo.perdasKg, resumo.estoqueAtualKg],
      );

      await this.associarLeiturasAoFechamento(client, tenantId, rows[0].id, dto.mes);
      return this.mapFechamento(rows[0]);
    });
  }

  async listarLeiturasDoFechamento(tenantId: string, fechamentoId: string): Promise<LeituraMedidorGlp[]> {
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório.');
    if (!fechamentoId) throw new BadRequestException('O id do fechamento é obrigatório.');

    return this.db.withTenant(tenantId, async (client) => {
      const { rows } = await client.query<LeituraRow>(`
        SELECT l.*
        FROM central_glp_fechamento_leitura f
        INNER JOIN central_glp_leitura l ON l.id = f.leitura_id
        WHERE f.tenant_id = $1 AND f.fechamento_id = $2
        ORDER BY l.data DESC, l.criado_em DESC
      `, [tenantId, fechamentoId]);

      return rows.map((row) => this.mapLeitura(row));
    });
  }

  async listarFechamentos(tenantId?: string): Promise<FechamentoMensalGlp[]> {
    if (!tenantId) {
      return this.db.withPlatform(async (client) => {
        const { rows } = await client.query<FechamentoRow>('SELECT * FROM central_glp_fechamento ORDER BY mes DESC, criado_em DESC');
        return rows.map((row) => this.mapFechamento(row));
      });
    }

    return this.db.withTenant(tenantId, async (client) => {
      const { rows } = await client.query<FechamentoRow>('SELECT * FROM central_glp_fechamento ORDER BY mes DESC, criado_em DESC');
      return rows.map((row) => this.mapFechamento(row));
    });
  }

  async removerFechamento(tenantId: string, id: string): Promise<void> {
    if (!tenantId) {
      throw new BadRequestException('tenantId é obrigatório.');
    }
    if (!id) {
      throw new BadRequestException('O id do fechamento é obrigatório.');
    }

    await this.db.withTenant(tenantId, async (client) => {
      const { rowCount } = await client.query(
        'DELETE FROM central_glp_fechamento WHERE tenant_id = $1 AND id = $2',
        [tenantId, id],
      );

      if (rowCount === 0) {
        throw new BadRequestException(`Fechamento não encontrado: ${id}`);
      }
    });
  }

  async dashboard(tenantId: string): Promise<DashboardGlpResumo> {
    return this.db.withTenant(tenantId, async (client) => {
      const central = await this.exigirCentral(client, 'A central de GLP ainda não foi cadastrada.');
      return this.montarDashboard(client, central);
    });
  }

  async dashboardCompartilhado(): Promise<DashboardGlpResumo> {
    return this.db.withPlatform(async (client) => {
      const central = await this.exigirCentralCompartilhada('A central de GLP ainda não foi cadastrada.');
      return this.montarDashboard(client, central);
    });
  }

  private async exigirCentral(client: PoolClient, message: string): Promise<CentralGlpConfig> {
    const central = await this.obterCentralComCliente(client, false);
    if (!central) throw new BadRequestException(message);
    return central;
  }

  private async exigirCentralCompartilhada(message: string): Promise<CentralGlpConfig> {
    const central = await this.obterCentralCompartilhada();
    if (!central) throw new BadRequestException(message);
    return central;
  }

  private async obterCentralCompartilhada(): Promise<CentralGlpConfig | null> {
    return this.db.withPlatform(async (client) => {
      const { rows } = await client.query<CentralRow>(`SELECT c.*, (
        COALESCE((SELECT SUM(a.quantidade_kg) FROM central_glp_abastecimento a WHERE a.tenant_id = c.tenant_id), 0)
        - COALESCE((SELECT SUM((l.leitura_atual - l.leitura_anterior) * l.fator_conversao) FROM central_glp_leitura l WHERE l.tenant_id = c.tenant_id), 0)
        - COALESCE((SELECT SUM(p.quantidade_kg) FROM central_glp_perda_ajuste p WHERE p.tenant_id = c.tenant_id), 0)
      )::text AS estoque_atual_kg FROM central_glp_config c ORDER BY c.atualizado_em DESC LIMIT 1`);

      return rows[0] ? this.mapCentral(rows[0]) : null;
    });
  }

  private async obterCentralComCliente(client: PoolClient, required = true, tenantId?: string): Promise<CentralGlpConfig | null> {
    const tenantFilter = tenantId
      ? 'WHERE c.tenant_id = $1'
      : `WHERE current_setting('app.scope', true) = 'platform' OR c.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid`;
    const params = tenantId ? [tenantId] : [];

    const { rows } = await client.query<CentralRow>(`SELECT c.*, (
      COALESCE((SELECT SUM(a.quantidade_kg) FROM central_glp_abastecimento a WHERE a.tenant_id = c.tenant_id), 0)
      - COALESCE((SELECT SUM((l.leitura_atual - l.leitura_anterior) * l.fator_conversao) FROM central_glp_leitura l WHERE l.tenant_id = c.tenant_id), 0)
      - COALESCE((SELECT SUM(p.quantidade_kg) FROM central_glp_perda_ajuste p WHERE p.tenant_id = c.tenant_id), 0)
    )::text AS estoque_atual_kg FROM central_glp_config c ${tenantFilter} ORDER BY c.atualizado_em DESC LIMIT 1`, params);
    if (!rows[0] && required) throw new BadRequestException('A central de GLP ainda não foi cadastrada.');
    return rows[0] ? this.mapCentral(rows[0]) : null;
  }

  private async associarLeiturasAoFechamento(client: PoolClient, tenantId: string, fechamentoId: string, mes: string): Promise<void> {
    const mesInicio = `${mes}-01`;
    const ultimoDia = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)), 0).getDate();
    const mesFim = `${mes}-${String(ultimoDia).padStart(2, '0')}`;

    const { rows } = await client.query<{ id: string }>(`
      SELECT id
      FROM central_glp_leitura
      WHERE tenant_id = $1 AND data >= $2 AND data <= $3
      ORDER BY data DESC, criado_em DESC
    `, [tenantId, mesInicio, mesFim]);

    await client.query(
      `DELETE FROM central_glp_fechamento_leitura WHERE tenant_id = $1 AND fechamento_id = $2`,
      [tenantId, fechamentoId],
    );

    if (rows.length === 0) return;

    const placeholders = rows.map((_, index) => `($1, $2, $${index + 3})`).join(', ');
    const params: unknown[] = [tenantId, fechamentoId, ...rows.map((row) => row.id)];

    await client.query(
      `INSERT INTO central_glp_fechamento_leitura (tenant_id, fechamento_id, leitura_id) VALUES ${placeholders}`,
      params,
    );
  }

  private async obterResumo(client: PoolClient, central: CentralGlpConfig): Promise<ResumoGlp> {
    const { rows } = await client.query<ResumoRow>(`SELECT COALESCE((SELECT SUM((leitura_atual - leitura_anterior) * fator_conversao) FROM central_glp_leitura), 0)::text AS consumo_total_kg, COALESCE((SELECT SUM(quantidade_kg) FROM central_glp_abastecimento), 0)::text AS total_abastecimentos_kg, COALESCE((SELECT SUM(valor_total) FROM central_glp_abastecimento), 0)::text AS valor_total_abastecimentos, COALESCE((SELECT SUM(quantidade_kg) FROM central_glp_perda_ajuste), 0)::text AS perdas_kg`);
    const row = rows[0];
    const consumoTotalKg = Number(row.consumo_total_kg);
    const totalAbastecimentosKg = Number(row.total_abastecimentos_kg);
    const custoMedioKg = Number(central.valorUnitarioKgInquilino ?? 0);
    const estoqueAtualKg = totalAbastecimentosKg - consumoTotalKg - Number(row.perdas_kg);
    return { estoqueAtualKg, consumoTotalKg, totalAbastecimentosKg, custoMedioKg, valorFaturado: consumoTotalKg * custoMedioKg, perdasKg: Number(row.perdas_kg) };
  }

  private async montarDashboard(client: PoolClient, central: CentralGlpConfig): Promise<DashboardGlpResumo> {
    const resumo = await this.obterResumo(client, central);
    const percentualCapacidade = (resumo.estoqueAtualKg / central.capacidadeTotalKg) * 100;
    const previsaoAutonomiaDias = percentualCapacidade > 0 ? Math.max(1, Math.round((resumo.estoqueAtualKg / Math.max(resumo.consumoTotalKg, 1)) * 30)) : 0;

    let alertaEstoque: 'normal' | 'baixo' | 'critico' = 'normal';
    if (resumo.estoqueAtualKg <= central.estoqueCriticoKg) alertaEstoque = 'critico';
    else if (resumo.estoqueAtualKg <= central.estoqueMinimoKg) alertaEstoque = 'baixo';

    const abastecimentos = await this.listarAbastecimentosComCliente(client);
    const leituras = await this.listarLeiturasComCliente(client);
    const perdas = await this.listarPerdasComCliente(client);
    const movimentos: DashboardGlpResumo['movimentos'] = [
      ...abastecimentos.map((item) => ({ ...item, tipo: 'abastecimento' as const })),
      ...leituras.map((item) => ({ ...item, tipo: 'consumo' as const })),
      ...perdas.map((item) => ({ ...item, tipo: item.tipo })),
    ];

    return { ...resumo, percentualCapacidade, previsaoAutonomiaDias, alertaEstoque, movimentos: movimentos.sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()) };
  }

  private async listarAbastecimentosComCliente(client: PoolClient): Promise<AbastecimentoGlp[]> { const { rows } = await client.query<AbastecimentoRow>('SELECT * FROM central_glp_abastecimento'); return rows.map((row) => this.mapAbastecimento(row)); }
  private async listarLeiturasComCliente(client: PoolClient): Promise<LeituraMedidorGlp[]> { const { rows } = await client.query<LeituraRow>('SELECT * FROM central_glp_leitura'); return rows.map((row) => this.mapLeitura(row)); }
  private async listarPerdasComCliente(client: PoolClient): Promise<PerdaAjusteGlp[]> { const { rows } = await client.query<PerdaRow>('SELECT * FROM central_glp_perda_ajuste'); return rows.map((row) => this.mapPerda(row)); }

  private mapCentral(row: CentralRow): CentralGlpConfig { return { id: row.id, nomeCentral: row.nome_central ?? 'Central de GLP', capacidadeTotalKg: Number(row.capacidade_total_kg), capacidadeCilindrosKg: Number(row.capacidade_cilindros_kg), capacidadePorCilindroKg: Number(row.capacidade_por_cilindro_kg ?? (Number(row.capacidade_total_kg) / Number(row.capacidade_cilindros_kg || 1))), estoqueAtualKg: Number(row.estoque_atual_kg), estoqueMinimoKg: Number(row.estoque_minimo_kg), estoqueCriticoKg: Number(row.estoque_critico_kg), valorUnitarioKgFornecedor: Number(row.valor_unitario_kg_fornecedor ?? 0), valorUnitarioKgInquilino: Number(row.valor_unitario_kg_inquilino ?? 0), unidadeCompra: 'kg', unidadeMedicao: 'm3', fatorConversao: Number(row.fator_conversao), statusCentral: (row.status_central as 'ativa' | 'manutencao' | 'inativa') ?? 'ativa', atualizadoEm: iso(row.atualizado_em) }; }
  private mapAbastecimento(row: AbastecimentoRow): AbastecimentoGlp { const quantidadeKg = Number(row.quantidade_kg); const valorTotal = Number(row.valor_total); return { id: row.id, data: iso(row.data), fornecedor: row.fornecedor, notaFiscal: row.nota_fiscal ?? undefined, quantidadeKg, quantidadeCilindros: Number(row.quantidade_cilindros), valorTotal, custoPorKg: valorTotal / quantidadeKg, criadoEm: iso(row.criado_em) }; }
  private mapLeitura(row: LeituraRow): LeituraMedidorGlp { const leituraAnterior = Number(row.leitura_anterior); const leituraAtual = Number(row.leitura_atual); const fatorConversao = Number(row.fator_conversao); return { id: row.id, cozinhaId: row.cozinha_id, data: iso(row.data), leituraAnterior, leituraAtual, consumoM3: leituraAtual - leituraAnterior, unidade: row.unidade, fatorConversao, consumoKg: (leituraAtual - leituraAnterior) * fatorConversao, criadoEm: iso(row.criado_em) }; }
  private mapPerda(row: PerdaRow): PerdaAjusteGlp { return { id: row.id, tipo: row.tipo, quantidadeKg: Number(row.quantidade_kg), motivo: row.motivo, data: iso(row.data), criadoEm: iso(row.criado_em) }; }
  private mapFechamento(row: FechamentoRow): FechamentoMensalGlp { return { id: row.id, tenantId: row.tenant_id, mes: row.mes, consumoTotalKg: Number(row.consumo_total_kg), custoPeriodo: Number(row.custo_periodo), valorFaturado: Number(row.valor_faturado), perdasKg: Number(row.perdas_kg), saldoFinalKg: Number(row.saldo_final_kg), criadoEm: iso(row.criado_em) }; }
}

interface CentralRow {
  id: string;
  nome_central?: string;
  capacidade_total_kg: string;
  capacidade_cilindros_kg: string;
  capacidade_por_cilindro_kg?: string | null;
  estoque_atual_kg: string;
  estoque_minimo_kg: string;
  estoque_critico_kg: string;
  valor_unitario_kg_fornecedor?: string | null;
  valor_unitario_kg_inquilino?: string | null;
  fator_conversao: string;
  status_central?: string | null;
  atualizado_em: Date;
}
interface AbastecimentoRow { id: string; data: Date | string; fornecedor: string; nota_fiscal: string | null; quantidade_kg: string; quantidade_cilindros: string; valor_total: string; criado_em: Date; }
interface LeituraRow { id: string; cozinha_id: string; data: Date | string; leitura_anterior: string; leitura_atual: string; unidade: string; fator_conversao: string; criado_em: Date; }
interface DashboardLeituraCentralRow { id: string; tenant_id: string; nome_inquilino: string; data_leitura: string; leitura_anterior: string; leitura_atual: string; consumo_kg: string; }
interface PerdaRow { id: string; tipo: PerdaAjusteGlp['tipo']; quantidade_kg: string; motivo: string; data: Date | string; criado_em: Date; }
interface FechamentoRow { id: string; tenant_id: string; mes: string; consumo_total_kg: string; custo_periodo: string; valor_faturado: string; perdas_kg: string; saldo_final_kg: string; criado_em: Date; }
interface ResumoRow { consumo_total_kg: string; total_abastecimentos_kg: string; valor_total_abastecimentos: string; perdas_kg: string; }
interface ResumoGlp { estoqueAtualKg: number; consumoTotalKg: number; totalAbastecimentosKg: number; custoMedioKg: number; valorFaturado: number; perdasKg: number; }

function iso(value: Date | string): string { return value instanceof Date ? value.toISOString() : value; }
