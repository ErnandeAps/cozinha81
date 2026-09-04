import { BadRequestException, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../core/database/database.service';

export type MetodoCusteio = 'ultimo_preco' | 'medio_ponderado';
export const METODOS_CUSTEIO: MetodoCusteio[] = ['ultimo_preco', 'medio_ponderado'];

export interface CusteioConfig {
  metodo: MetodoCusteio;
  versao: number;
}

/**
 * Método de Custeio do tenant (Story 3.1, FR-13, AD-10).
 *
 * Não há default silencioso: enquanto não definido, `obter` retorna `null` e o
 * cálculo de custo (3.2) recusa. Trocar o método **incrementa a versão**, que
 * parametriza as leituras on-read para manter consistência.
 */
@Injectable()
export class CusteioService {
  constructor(private readonly db: DatabaseService) {}

  async obter(tenantId: string): Promise<CusteioConfig | null> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<CusteioConfig>(
        'SELECT metodo, versao FROM custeio_config WHERE tenant_id = $1',
        [tenantId],
      );
      return rows[0] ?? null;
    });
  }

  /** Retorna o método+versão ou lança se ainda não foi definido (sem default). */
  async exigir(tenantId: string): Promise<CusteioConfig> {
    const cfg = await this.obter(tenantId);
    if (!cfg) {
      throw new BadRequestException('Método de custeio não definido. Escolha antes de calcular custos.');
    }
    return cfg;
  }

  async definir(tenantId: string, metodo: MetodoCusteio): Promise<CusteioConfig> {
    if (!METODOS_CUSTEIO.includes(metodo)) {
      throw new BadRequestException('Método de custeio inválido.');
    }
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<CusteioConfig>(
        'SELECT metodo, versao FROM custeio_config WHERE tenant_id = $1',
        [tenantId],
      );
      const atual = rows[0];

      if (!atual) {
        await c.query('INSERT INTO custeio_config (tenant_id, metodo, versao) VALUES ($1, $2, 1)', [
          tenantId,
          metodo,
        ]);
        return { metodo, versao: 1 };
      }
      if (atual.metodo === metodo) {
        return atual; // sem troca → sem bump de versão
      }
      const nova = atual.versao + 1;
      await c.query(
        'UPDATE custeio_config SET metodo = $2, versao = $3, atualizado_em = now() WHERE tenant_id = $1',
        [tenantId, metodo, nova],
      );
      return { metodo, versao: nova };
    });
  }
}
