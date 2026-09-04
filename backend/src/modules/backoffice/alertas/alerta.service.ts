import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';

export interface AlertaDocumentoRow {
  id: string;
  cozinha_id: string;
  documento_id: string;
  criado_em: Date;
  cozinha_nome?: string;
  documento_tipo?: string;
  documento_validade?: Date;
  documento_arquivo?: string;
}

@Injectable()
export class AlertaService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Sincroniza os alertas de vencimento de documentos de forma idempotente.
   * Cria alertas para documentos vencendo em até 30 dias (ou já vencidos),
   * e remove alertas para documentos que foram renovados ou excluídos.
   */
  async sincronizarAlertas(): Promise<void> {
    await this.db.withPlatform(async (c) => {
      // 1. Criar novos alertas para documentos expirando nos próximos 30 dias ou expirados
      await c.query(`
        INSERT INTO alerta_documento (cozinha_id, documento_id)
        SELECT cozinha_id, id as documento_id
        FROM documento
        WHERE validade <= now() + interval '30 days'
        ON CONFLICT (documento_id) DO NOTHING
      `);

      // 2. Remover alertas de documentos que não estão mais vencendo em até 30 dias ou foram excluídos
      await c.query(`
        DELETE FROM alerta_documento
        WHERE documento_id NOT IN (
          SELECT id FROM documento
          WHERE validade <= now() + interval '30 days'
        )
      `);
    });
  }

  /**
   * Obtém todos os alertas de vencimento de documentos ativos.
   */
  async obterAlertasAtivos(): Promise<AlertaDocumentoRow[]> {
    await this.sincronizarAlertas();

    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<AlertaDocumentoRow>(`
        SELECT a.id, a.cozinha_id, a.documento_id, a.criado_em,
               coz.nome as cozinha_nome,
               doc.tipo as documento_tipo,
               doc.validade as documento_validade,
               doc.arquivo as documento_arquivo
        FROM alerta_documento a
        JOIN cozinha coz ON coz.id = a.cozinha_id
        JOIN documento doc ON doc.id = a.documento_id
        ORDER BY doc.validade ASC
      `);
      return rows;
    });
  }

  /**
   * Obtém os alertas ativos para uma cozinha específica.
   */
  async obterAlertasPorCozinha(cozinhaId: string): Promise<AlertaDocumentoRow[]> {
    await this.sincronizarAlertas();

    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<AlertaDocumentoRow>(`
        SELECT a.id, a.cozinha_id, a.documento_id, a.criado_em,
               coz.nome as cozinha_nome,
               doc.tipo as documento_tipo,
               doc.validade as documento_validade,
               doc.arquivo as documento_arquivo
        FROM alerta_documento a
        JOIN cozinha coz ON coz.id = a.cozinha_id
        JOIN documento doc ON doc.id = a.documento_id
        WHERE a.cozinha_id = $1
        ORDER BY doc.validade ASC
      `, [cozinhaId]);
      return rows;
    });
  }
}
