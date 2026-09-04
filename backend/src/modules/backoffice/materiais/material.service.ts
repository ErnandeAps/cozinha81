import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';

export interface MaterialRow {
  id: string;
  nome: string;
  criado_em: Date;
}

export interface MovimentoRow {
  id: string;
  material_id: string;
  tenant_id: string | null;
  tipo: 'entrada' | 'consumo';
  quantidade: number;
  valor_unitario: number;
  criado_por: string | null;
  criado_em: Date;
}

@Injectable()
export class MaterialService {
  constructor(private readonly db: DatabaseService) {}

  async criar(nome: string): Promise<MaterialRow> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<MaterialRow>(
        'INSERT INTO material (nome) VALUES ($1) RETURNING *',
        [nome]
      );
      return rows[0];
    });
  }

  async registrarMovimento(
    materialId: string,
    tipo: 'entrada' | 'consumo',
    quantidade: number,
    valorUnitario: number,
    tenantId: string | null,
    criadoPor: string | null
  ): Promise<MovimentoRow> {
    if (quantidade <= 0) {
      throw new BadRequestException('Quantidade deve ser maior que zero.');
    }
    if (tipo !== 'entrada' && tipo !== 'consumo') {
      throw new BadRequestException('Tipo inválido. Deve ser "entrada" ou "consumo".');
    }

    // Valida se o material existe
    const material = await this.db.withPlatform(async (c) => {
      const { rows } = await c.query('SELECT 1 FROM material WHERE id = $1', [materialId]);
      return rows[0];
    });
    if (!material) {
      throw new NotFoundException(`Material não encontrado: ${materialId}`);
    }

    const query = `
      INSERT INTO material_movimento (material_id, tenant_id, tipo, quantidade, valor_unitario, criado_por)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const params = [materialId, tenantId, tipo, quantidade, valorUnitario, criadoPor];

    if (tenantId) {
      return this.db.withTenant(tenantId, async (c) => {
        const { rows } = await c.query<MovimentoRow>(query, params);
        return rows[0];
      });
    } else {
      return this.db.withPlatform(async (c) => {
        const { rows } = await c.query<MovimentoRow>(query, params);
        return rows[0];
      });
    }
  }

  async obterSaldo(materialId: string): Promise<number> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<{ saldo: string }>(
        `SELECT
           COALESCE(SUM(CASE WHEN tipo = 'entrada' THEN quantidade ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN tipo = 'consumo' THEN quantidade ELSE 0 END), 0) AS saldo
         FROM material_movimento
         WHERE material_id = $1`,
        [materialId]
      );
      return parseInt(rows[0].saldo, 10);
    });
  }

  async listarSaldos(): Promise<{ id: string; nome: string; saldo: number }[]> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<{ id: string; nome: string; saldo: string }>(
        `SELECT
           m.id,
           m.nome,
           COALESCE(SUM(CASE WHEN mv.tipo = 'entrada' THEN mv.quantidade ELSE 0 END), 0) -
           COALESCE(SUM(CASE WHEN mv.tipo = 'consumo' THEN mv.quantidade ELSE 0 END), 0) AS saldo
         FROM material m
         LEFT JOIN material_movimento mv ON m.id = mv.material_id
         GROUP BY m.id, m.nome
         ORDER BY m.nome`
      );
      return rows.map((r) => ({
        id: r.id,
        nome: r.nome,
        saldo: parseInt(r.saldo, 10),
      }));
    });
  }

  async listarConsumosPorTenant(tenantId: string): Promise<MovimentoRow[]> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<MovimentoRow>(
        `SELECT * FROM material_movimento
         WHERE tenant_id = $1 AND tipo = 'consumo'
         ORDER BY criado_em DESC`,
        [tenantId]
      );
      return rows;
    });
  }

  async listarTodosConsumos(): Promise<MovimentoRow[]> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<MovimentoRow>(
        `SELECT * FROM material_movimento
         WHERE tipo = 'consumo'
         ORDER BY criado_em DESC`
      );
      return rows;
    });
  }
}
