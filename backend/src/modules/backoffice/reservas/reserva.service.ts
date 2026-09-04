import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';

export type ModalidadeReserva = 'turno' | 'cafe' | 'almoco' | 'jantar' | 'personalizado' | 'dia';

export interface ReservaRow {
  id: string;
  tenant_id: string;
  cozinha_id: string;
  inicio: Date;
  fim: Date;
  modalidade: ModalidadeReserva;
  criado_em: Date;
}

@Injectable()
export class ReservaService {
  constructor(private readonly db: DatabaseService) {}

  async criar(
    cozinhaId: string,
    dto: { inicio: string; fim: string; modalidade: ModalidadeReserva; tenantId: string }
  ): Promise<ReservaRow> {
    // Verificar se cozinha existe
    const cozinha = await this.db.withPlatform(async (c) => {
      const { rows } = await c.query('SELECT 1 FROM cozinha WHERE id = $1', [cozinhaId]);
      return rows[0];
    });
    if (!cozinha) {
      throw new NotFoundException(`Cozinha não encontrada: ${cozinhaId}`);
    }

    try {
      // Toda inserção de reserva é tenant-scoped. Precisamos rodar sob o contexto do tenant dono.
      return await this.db.withTenant(dto.tenantId, async (c) => {
        const { rows } = await c.query<ReservaRow>(
          `INSERT INTO reserva (tenant_id, cozinha_id, periodo, modalidade)
           VALUES ($1, $2, tstzrange($3, $4, '[)'), $5)
           RETURNING id, tenant_id, cozinha_id, lower(periodo) as inicio, upper(periodo) as fim, modalidade, criado_em`,
          [dto.tenantId, cozinhaId, dto.inicio, dto.fim, dto.modalidade]
        );
        return rows[0];
      });
    } catch (err: any) {
      // 23P01 é o código Postgres para violação de restrição de exclusão (exclusion violation)
      if (err.code === '23P01') {
        throw new ConflictException(
          `Conflito de agenda: a Cozinha já está ocupada ou reservada neste período.`
        );
      }
      throw err;
    }
  }

  async listarTodos(scope: 'platform' | 'tenant', tenantId?: string): Promise<ReservaRow[]> {
    if (scope === 'platform') {
      return this.db.withPlatform(async (c) => {
        const { rows } = await c.query<ReservaRow>(
          `SELECT id, tenant_id, cozinha_id, lower(periodo) as inicio, upper(periodo) as fim, modalidade, criado_em
           FROM reserva ORDER BY lower(periodo)`
        );
        return rows;
      });
    }

    if (!tenantId) throw new Error('tenantId requerido para escopo de inquilino');
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<ReservaRow>(
        `SELECT id, tenant_id, cozinha_id, lower(periodo) as inicio, upper(periodo) as fim, modalidade, criado_em
         FROM reserva ORDER BY lower(periodo)`
      );
      return rows;
    });
  }

  async listarPorCozinha(cozinhaId: string, scope: 'platform' | 'tenant', tenantId?: string): Promise<ReservaRow[]> {
    if (scope === 'platform') {
      return this.db.withPlatform(async (c) => {
        const { rows } = await c.query<ReservaRow>(
          `SELECT id, tenant_id, cozinha_id, lower(periodo) as inicio, upper(periodo) as fim, modalidade, criado_em
           FROM reserva WHERE cozinha_id = $1 ORDER BY lower(periodo)`,
          [cozinhaId]
        );
        return rows;
      });
    } else {
      if (!tenantId) throw new Error('tenantId requerido para escopo de inquilino');
      return this.db.withTenant(tenantId, async (c) => {
        const { rows } = await c.query<ReservaRow>(
          `SELECT id, tenant_id, cozinha_id, lower(periodo) as inicio, upper(periodo) as fim, modalidade, criado_em
           FROM reserva WHERE cozinha_id = $1 ORDER BY lower(periodo)`,
          [cozinhaId]
        );
        return rows;
      });
    }
  }

  async atualizar(
    id: string,
    dto: { cozinhaId: string; inicio: string; fim: string; modalidade: ModalidadeReserva; tenantId: string }
  ): Promise<ReservaRow> {
    const cozinha = await this.db.withPlatform(async (c) => {
      const { rows } = await c.query('SELECT 1 FROM cozinha WHERE id = $1', [dto.cozinhaId]);
      return rows[0];
    });
    if (!cozinha) {
      throw new NotFoundException(`Cozinha não encontrada: ${dto.cozinhaId}`);
    }

    try {
      return await this.db.withTenant(dto.tenantId, async (c) => {
        const { rows: existenteRows } = await c.query<ReservaRow>(
          `SELECT id, tenant_id, cozinha_id, lower(periodo) as inicio, upper(periodo) as fim, modalidade, criado_em
           FROM reserva WHERE id = $1`,
          [id]
        );
        if (existenteRows.length === 0) throw new NotFoundException(`Reserva não encontrada: ${id}`);

        const { rows } = await c.query<ReservaRow>(
          `UPDATE reserva
           SET tenant_id = $2,
               cozinha_id = $3,
               periodo = tstzrange($4, $5, '[)'),
               modalidade = $6
           WHERE id = $1
           RETURNING id, tenant_id, cozinha_id, lower(periodo) as inicio, upper(periodo) as fim, modalidade, criado_em`,
          [id, dto.tenantId, dto.cozinhaId, dto.inicio, dto.fim, dto.modalidade]
        );
        return rows[0];
      });
    } catch (err: any) {
      if (err.code === '23P01') {
        throw new ConflictException(
          `Conflito de agenda: a Cozinha já está ocupada ou reservada neste período.`
        );
      }
      throw err;
    }
  }

  async remover(id: string, scope: 'platform' | 'tenant', tenantId?: string): Promise<void> {
    if (scope === 'platform') {
      await this.db.withPlatform(async (c) => {
        const { rowCount } = await c.query('DELETE FROM reserva WHERE id = $1', [id]);
        if (rowCount === 0) throw new NotFoundException(`Reserva não encontrada: ${id}`);
      });
    } else {
      if (!tenantId) throw new Error('tenantId requerido para escopo de inquilino');
      await this.db.withTenant(tenantId, async (c) => {
        const { rowCount } = await c.query('DELETE FROM reserva WHERE id = $1', [id]);
        if (rowCount === 0) throw new NotFoundException(`Reserva não encontrada: ${id}`);
      });
    }
  }
}
