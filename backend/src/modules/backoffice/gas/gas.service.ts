import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';

export interface LeituraGasRow {
  id: string;
  tenant_id: string;
  data_inicial: string;
  leitura_inicial: number | string;
  data_final: string;
  leitura_final: number | string;
  consumo_m3: number | string;
  observacao: string | null;
  criado_em: Date;
}

export interface DashboardLeituraGasRow {
  id: string;
  tenantId: string;
  nomeInquilino: string;
  dataLeitura: string;
  leituraInicial: number;
  leituraFinal: number;
  consumoKg: number;
}

export interface RegistrarLeituraGasDto {
  tenantId: string;
  dataInicial: string;
  leituraInicial: number;
  dataFinal: string;
  leituraFinal: number;
  observacao?: string;
}

@Injectable()
export class GasLeituraService {
  constructor(private readonly db: DatabaseService) {}

  async registrar(dto: RegistrarLeituraGasDto): Promise<LeituraGasRow> {
    if (!dto?.tenantId) {
      throw new BadRequestException('tenantId é obrigatório.');
    }
    if (!dto.dataInicial || !dto.dataFinal) {
      throw new BadRequestException('As datas inicial e final são obrigatórias.');
    }
    if (Number(dto.leituraInicial) < 0 || Number(dto.leituraFinal) < 0) {
      throw new BadRequestException('As leituras devem ser maiores ou iguais a zero.');
    }
    if (Number(dto.leituraFinal) < Number(dto.leituraInicial)) {
      throw new BadRequestException('A leitura final deve ser maior ou igual à leitura inicial.');
    }

    const tenantId = dto.tenantId;
    const consumo = Number((Number(dto.leituraFinal) - Number(dto.leituraInicial)).toFixed(2));

    await this.validarTenantExiste(tenantId);

    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<LeituraGasRow>(
        `
          INSERT INTO leitura_gas (
            tenant_id,
            data_inicial,
            leitura_inicial,
            data_final,
            leitura_final,
            consumo_m3,
            observacao
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `,
        [
          tenantId,
          dto.dataInicial,
          Number(dto.leituraInicial),
          dto.dataFinal,
          Number(dto.leituraFinal),
          consumo,
          dto.observacao?.trim() || null,
        ],
      );

      const row = rows[0];
      return {
        ...row,
        leitura_inicial: Number(row.leitura_inicial),
        leitura_final: Number(row.leitura_final),
        consumo_m3: Number(row.consumo_m3),
      };
    });
  }

  async listarPorTenant(tenantId: string): Promise<LeituraGasRow[]> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<LeituraGasRow>(
        `SELECT * FROM leitura_gas WHERE tenant_id = $1 ORDER BY data_final DESC, criado_em DESC`,
        [tenantId],
      );
      return rows.map((row) => ({
        ...row,
        leitura_inicial: Number(row.leitura_inicial),
        leitura_final: Number(row.leitura_final),
        consumo_m3: Number(row.consumo_m3),
      }));
    });
  }

  async listarTodos(): Promise<LeituraGasRow[]> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<LeituraGasRow>(
        `SELECT * FROM leitura_gas ORDER BY data_final DESC, criado_em DESC`,
      );
      return rows.map((row) => ({
        ...row,
        leitura_inicial: Number(row.leitura_inicial),
        leitura_final: Number(row.leitura_final),
        consumo_m3: Number(row.consumo_m3),
      }));
    });
  }

  async listarDashboard(tenantId?: string, dataInicio?: string, dataFim?: string): Promise<DashboardLeituraGasRow[]> {
    return this.db.withPlatform(async (c) => {
      const params: string[] = [];
      const clauses: string[] = [];

      if (tenantId) {
        clauses.push(`lg.tenant_id = $${params.length + 1}`);
        params.push(tenantId);
      }

      if (dataInicio) {
        clauses.push(`lg.data_final >= $${params.length + 1}`);
        params.push(dataInicio);
      }

      if (dataFim) {
        clauses.push(`lg.data_final <= $${params.length + 1}`);
        params.push(dataFim);
      }

      const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

      const { rows } = await c.query<{
        id: string;
        tenant_id: string;
        nome_inquilino: string;
        data_leitura: string;
        leitura_inicial: string;
        leitura_final: string;
        consumo_kg: string;
      }>(`
        SELECT
          lg.id,
          lg.tenant_id,
          i.nome AS nome_inquilino,
          to_char(lg.data_final, 'YYYY-MM-DD') AS data_leitura,
          lg.leitura_inicial,
          lg.leitura_final,
          ((lg.leitura_final - lg.leitura_inicial) * 0.75) AS consumo_kg
        FROM leitura_gas lg
        INNER JOIN inquilino i ON i.id = lg.tenant_id
        ${whereClause}
        ORDER BY lg.data_final DESC, lg.criado_em DESC
      `, params);

      return rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        nomeInquilino: row.nome_inquilino,
        dataLeitura: row.data_leitura,
        leituraInicial: Number(row.leitura_inicial),
        leituraFinal: Number(row.leitura_final),
        consumoKg: Number(row.consumo_kg),
      }));
    });
  }

  async remover(tenantId: string, id: string): Promise<void> {
    if (!tenantId) {
      throw new BadRequestException('tenantId é obrigatório.');
    }
    if (!id) {
      throw new BadRequestException('O id da leitura é obrigatório.');
    }

    await this.validarTenantExiste(tenantId);

    await this.db.withTenant(tenantId, async (c) => {
      const { rowCount } = await c.query(
        `DELETE FROM leitura_gas WHERE tenant_id = $1 AND id = $2`,
        [tenantId, id],
      );

      if (rowCount === 0) {
        throw new NotFoundException(`Leitura de gás não encontrada: ${id}`);
      }
    });
  }

  private async validarTenantExiste(tenantId: string): Promise<void> {
    const { rows } = await this.db.withPlatform(async (c) => {
      return c.query<{ id: string }>('SELECT id FROM inquilino WHERE id = $1', [tenantId]);
    });

    if (rows.length === 0) {
      throw new NotFoundException(`Inquilino não encontrado: ${tenantId}`);
    }
  }
}
