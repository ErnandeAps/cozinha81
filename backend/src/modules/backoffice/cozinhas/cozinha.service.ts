import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';

export interface CozinhaRow {
  id: string;
  nome: string;
  equipada: boolean;
  criado_em: Date;
  inquilino_id?: string | null;
  inquilino_nome?: string | null;
}

@Injectable()
export class CozinhaService {
  constructor(private readonly db: DatabaseService) {}

  async criar(dto: { nome: string; equipada?: boolean; inquilinoId?: string }): Promise<CozinhaRow> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<CozinhaRow>(
        'INSERT INTO cozinha (nome, equipada) VALUES ($1, $2) RETURNING *',
        [dto.nome, dto.equipada ?? false]
      );

      const cozinha = rows[0];
      if (dto.inquilinoId) {
        await this.associarInquilino(c, cozinha.id, dto.inquilinoId);
      }

      return this.obterCompleta(c, cozinha.id);
    });
  }

  async listar(): Promise<CozinhaRow[]> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<CozinhaRow>(`
        SELECT c.*, i.id AS inquilino_id, i.nome AS inquilino_nome
        FROM cozinha c
        LEFT JOIN inquilino i ON i.cozinha_id = c.id
        ORDER BY c.nome
      `);
      return rows;
    });
  }

  async obter(id: string): Promise<CozinhaRow> {
    return this.db.withPlatform(async (c) => {
      const row = await this.obterCompleta(c, id);
      return row;
    });
  }

  async atualizar(id: string, dto: { nome?: string; equipada?: boolean; inquilinoId?: string }): Promise<CozinhaRow> {
    return this.db.withPlatform(async (c) => {
      const { rows: currentRows } = await c.query<CozinhaRow>('SELECT * FROM cozinha WHERE id = $1', [id]);
      if (currentRows.length === 0) throw new NotFoundException(`Cozinha não encontrada: ${id}`);

      const updatedNome = dto.nome !== undefined ? dto.nome : currentRows[0].nome;
      const updatedEquipada = dto.equipada !== undefined ? dto.equipada : currentRows[0].equipada;

      const { rows } = await c.query<CozinhaRow>(
        'UPDATE cozinha SET nome = $1, equipada = $2 WHERE id = $3 RETURNING *',
        [updatedNome, updatedEquipada, id]
      );

      if (dto.inquilinoId !== undefined) {
        await this.associarInquilino(c, id, dto.inquilinoId);
      }

      return this.obterCompleta(c, rows[0].id);
    });
  }

  private async associarInquilino(c: any, cozinhaId: string, inquilinoId: string): Promise<void> {
    const { rows: tenantRows } = await c.query('SELECT id FROM inquilino WHERE id = $1', [inquilinoId]);
    if (tenantRows.length === 0) {
      throw new NotFoundException(`Inquilino não encontrado: ${inquilinoId}`);
    }

    const { rows: antigos } = await c.query('SELECT id FROM inquilino WHERE cozinha_id = $1 AND id <> $2', [cozinhaId, inquilinoId]);

    for (const row of antigos) {
      await this.db.withTenant(row.id, async (cliente) => {
        await cliente.query('UPDATE inquilino SET cozinha_id = NULL WHERE id = $1', [row.id]);
      });
    }

    await this.db.withTenant(inquilinoId, async (cliente) => {
      await cliente.query('UPDATE inquilino SET cozinha_id = $1 WHERE id = $2', [cozinhaId, inquilinoId]);
    });
  }

  private async obterCompleta(c: any, id: string): Promise<CozinhaRow> {
    const { rows } = await c.query(`
      SELECT c.*, i.id AS inquilino_id, i.nome AS inquilino_nome
      FROM cozinha c
      LEFT JOIN inquilino i ON i.cozinha_id = c.id
      WHERE c.id = $1
    `, [id]);

    if (rows.length === 0) throw new NotFoundException(`Cozinha não encontrada: ${id}`);
    return rows[0];
  }

  async remover(id: string): Promise<void> {
    await this.db.withPlatform(async (c) => {
      const { rowCount } = await c.query('DELETE FROM cozinha WHERE id = $1', [id]);
      if (rowCount === 0) throw new NotFoundException(`Cozinha não encontrada: ${id}`);
    });
  }
}
