import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';

export interface PresencaChecklist {
  limpeza: boolean;
  equipamento: boolean;
  observacoes?: string;
}

export interface PresencaRow {
  id: string;
  cozinha_id: string;
  tenant_id: string | null;
  data: Date | string;
  tipo: 'in' | 'out';
  checklist: PresencaChecklist | null;
  criado_em: Date;
}

@Injectable()
export class PresencaService {
  constructor(private readonly db: DatabaseService) {}

  async registrar(
    cozinhaId: string,
    tenantId: string | null,
    tipo: 'in' | 'out',
    checklist?: PresencaChecklist,
    data?: string
  ): Promise<PresencaRow> {
    if (tipo !== 'in' && tipo !== 'out') {
      throw new BadRequestException('Tipo inválido. Deve ser "in" ou "out".');
    }

    if (!data) {
      throw new BadRequestException('Informe a data do registro de presença.');
    }

    const match = /^\d{4}-\d{2}-\d{2}$/.test(data);
    if (!match) {
      throw new BadRequestException('Data inválida para o registro de presença.');
    }

    const [year, month, day] = data.split('-').map(Number);
    const dataRegistro = new Date(Date.UTC(year, month - 1, day, 12));
    if (Number.isNaN(dataRegistro.getTime())) {
      throw new BadRequestException('Data inválida para o registro de presença.');
    }

    // Valida se a cozinha existe
    const cozinha = await this.db.withPlatform(async (c) => {
      const { rows } = await c.query('SELECT 1 FROM cozinha WHERE id = $1', [cozinhaId]);
      return rows[0];
    });
    if (!cozinha) {
      throw new NotFoundException(`Cozinha não encontrada: ${cozinhaId}`);
    }

    const query = `
      INSERT INTO presenca (cozinha_id, tenant_id, data, tipo, checklist, criado_em)
      VALUES ($1, $2, $3::date, $4, $5, $6)
      RETURNING *
    `;
    const params = [
      cozinhaId,
      tenantId,
      dataRegistro.toISOString().slice(0, 10),
      tipo,
      checklist ? JSON.stringify(checklist) : null,
      dataRegistro.toISOString(),
    ];

    if (tenantId) {
      return this.db.withTenant(tenantId, async (c) => {
        const { rows } = await c.query<PresencaRow>(query, params);
        return rows[0];
      });
    } else {
      return this.db.withPlatform(async (c) => {
        const { rows } = await c.query<PresencaRow>(query, params);
        return rows[0];
      });
    }
  }

  async listarPorCozinha(cozinhaId: string, tenantId?: string): Promise<PresencaRow[]> {
    if (tenantId) {
      return this.db.withTenant(tenantId, async (c) => {
        const { rows } = await c.query<PresencaRow>(
          `SELECT * FROM presenca
           WHERE cozinha_id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)
           ORDER BY criado_em DESC`,
          [cozinhaId, tenantId]
        );
        return rows;
      });
    } else {
      return this.db.withPlatform(async (c) => {
        const { rows } = await c.query<PresencaRow>(
          'SELECT * FROM presenca WHERE cozinha_id = $1 ORDER BY criado_em DESC',
          [cozinhaId]
        );
        return rows;
      });
    }
  }
}
