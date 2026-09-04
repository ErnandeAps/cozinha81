import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { isModulo, type Modulo } from '../../../core/gating/modulos';

export interface ModuloFlag {
  modulo: Modulo;
  habilitado: boolean;
}

/**
 * Liga/desliga flags de Módulo de um Inquilino (AD-3: backoffice é dono).
 *
 * Desligar remove o acesso imediatamente (o gating passa a rejeitar), mas
 * **nunca apaga dados** — só altera a flag (FR-4, AC-5/6). Religar restaura o
 * acesso aos dados preservados.
 */
@Injectable()
export class ModuloFlagService {
  constructor(private readonly db: DatabaseService) {}

  async listar(tenantId: string): Promise<ModuloFlag[]> {
    return this.db.withTenant(tenantId, (c) =>
      c
        .query<ModuloFlag>('SELECT modulo, habilitado FROM modulo_flag ORDER BY modulo')
        .then((r) => r.rows),
    );
  }

  async definir(
    tenantId: string,
    modulo: string,
    habilitado: boolean,
    staffId: string,
  ): Promise<ModuloFlag> {
    if (!isModulo(modulo)) throw new BadRequestException(`Módulo inválido: ${modulo}.`);

    // Escrita cross-tenant explícita pelo staff (tenant context do alvo) — e
    // auditada por operação (AD-14), na mesma transação.
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<ModuloFlag>(
        `INSERT INTO modulo_flag (tenant_id, modulo, habilitado) VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id, modulo) DO UPDATE SET habilitado = EXCLUDED.habilitado
         RETURNING modulo, habilitado`,
        [tenantId, modulo, habilitado],
      );
      await c.query(
        `INSERT INTO provisionamento_audit (tenant_id, staff_id, acao, detalhes)
         VALUES ($1, $2, 'alterar_modulo_flag', $3)`,
        [tenantId, staffId, JSON.stringify({ modulo, habilitado })],
      );
      return rows[0];
    });
  }
}
