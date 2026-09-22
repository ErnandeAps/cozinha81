import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface DocumentoRow {
  id: string;
  tenant_id: string;
  cozinha_id: string | null;
  tipo: string;
  arquivo: string;
  validade: Date;
  criado_em: Date;
}

@Injectable()
export class DocumentoService {
  private readonly uploadDir = join(__dirname, '..', '..', '..', 'uploads');

  constructor(private readonly db: DatabaseService) {
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async anexarParaInquilino(
    tenantId: string,
    tipo: string,
    validade: string,
    file: { originalname: string; buffer: Buffer }
  ): Promise<DocumentoRow> {
    const inquilino = await this.db.withPlatform(async (c) => {
      const { rows } = await c.query('SELECT id FROM inquilino WHERE id = $1', [tenantId]);
      return rows[0];
    });
    if (!inquilino) {
      throw new NotFoundException(`Inquilino não encontrado: ${tenantId}`);
    }

    const uniqueFilename = `${Date.now()}-${file.originalname}`;
    const filePath = join(this.uploadDir, uniqueFilename);
    writeFileSync(filePath, file.buffer);

    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<DocumentoRow>(
        `INSERT INTO documento (tenant_id, tipo, arquivo, validade)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [tenantId, tipo, uniqueFilename, validade]
      );
      return rows[0];
    });
  }

  async listarPorInquilino(tenantId: string): Promise<DocumentoRow[]> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<DocumentoRow>(
        'SELECT * FROM documento WHERE tenant_id = $1 ORDER BY criado_em DESC',
        [tenantId]
      );
      return rows;
    });
  }

  async anexar(
    cozinhaId: string,
    tipo: string,
    validade: string,
    file: { originalname: string; buffer: Buffer }
  ): Promise<DocumentoRow> {
    const cozinha = await this.db.withPlatform(async (c) => {
      const { rows } = await c.query('SELECT 1 FROM cozinha WHERE id = $1', [cozinhaId]);
      return rows[0];
    });
    if (!cozinha) {
      throw new NotFoundException(`Cozinha não encontrada: ${cozinhaId}`);
    }

    const uniqueFilename = `${Date.now()}-${file.originalname}`;
    const filePath = join(this.uploadDir, uniqueFilename);
    writeFileSync(filePath, file.buffer);

    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<DocumentoRow>(
        `INSERT INTO documento (cozinha_id, tipo, arquivo, validade)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [cozinhaId, tipo, uniqueFilename, validade]
      );
      return rows[0];
    });
  }

  async listarPorCozinha(cozinhaId: string): Promise<DocumentoRow[]> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<DocumentoRow>(
        'SELECT * FROM documento WHERE cozinha_id = $1 ORDER BY criado_em DESC',
        [cozinhaId]
      );
      return rows;
    });
  }

  async remover(id: string): Promise<void> {
    await this.db.withPlatform(async (c) => {
      const { rowCount } = await c.query('DELETE FROM documento WHERE id = $1', [id]);
      if (rowCount === 0) throw new NotFoundException(`Documento não encontrado: ${id}`);
    });
  }
}
