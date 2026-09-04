import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../core/database/database.service';
import type {
  AtualizarInsumoDto,
  CriarInsumoDto,
  RegistrarEntradaDto,
  RegistrarPerdaDto,
} from './insumo.dto';

export type TipoMovimento = 'entrada' | 'baixa' | 'perda' | 'estorno';

export interface InsumoRow {
  id: string;
  tenant_id: string;
  nome: string;
  unidade_base: string;
  estoque_minimo: string | null;
  lote_validade: boolean;
  unidade_uso: string | null;
  fator_conversao: string | null;
  quantidade_atual: string;
  criado_em: Date;
}

export interface MovimentoEstoqueRow {
  id: string;
  tenant_id: string;
  insumo_id: string;
  tipo: TipoMovimento;
  quantidade: string;
  preco_centavos: string | null;
  lote: string | null;
  validade: Date | null;
  cause_key: string;
  motivo: string | null;
  criado_em: Date;
}

export interface HistoricoPrecoRow {
  id: string;
  quantidade: string;
  preco_centavos: string | null;
  criado_em: Date;
  lote: string | null;
  validade: Date | null;
  cause_key: string;
}

export interface AlertaAtivoRow {
  id: string;
  insumo_id: string;
  nome: string;
  quantidade_atual: string;
  unidade_base: string;
  estoque_minimo: string | null;
}

// Saldo derivado do ledger (AD-9). `estorno` (reversão de baixa) SOMA; baixa/perda
// subtraem. Fonte única do sinal — evita divergência entre as queries.
const MOV_DELTA = `CASE WHEN m.tipo IN ('entrada', 'estorno') THEN m.quantidade ELSE -m.quantidade END`;
const SALDO_POR_INSUMO = `COALESCE((SELECT SUM(${MOV_DELTA}) FROM movimento_estoque m WHERE m.insumo_id = i.id), 0)::text`;

@Injectable()
export class InsumoService {
  constructor(private readonly db: DatabaseService) {}

  async criar(tenantId: string, dto: CriarInsumoDto): Promise<InsumoRow> {
    if (!dto.nome?.trim()) {
      throw new BadRequestException('Nome do insumo é obrigatório.');
    }
    if (!dto.unidade_base?.trim()) {
      throw new BadRequestException('Unidade base é obrigatória.');
    }

    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<InsumoRow>(
        `INSERT INTO insumo (tenant_id, nome, unidade_base, estoque_minimo, lote_validade, unidade_uso, fator_conversao)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *, '0'::text as quantidade_atual`,
        [
          tenantId,
          dto.nome.trim(),
          dto.unidade_base.trim(),
          dto.estoque_minimo ?? null,
          dto.lote_validade ?? false,
          dto.unidade_uso ?? null,
          dto.fator_conversao ?? null,
        ],
      );
      return rows[0];
    });
  }

  async listar(tenantId: string): Promise<InsumoRow[]> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<InsumoRow>(
        `SELECT i.*, ${SALDO_POR_INSUMO} as quantidade_atual
         FROM insumo i
         ORDER BY i.nome`,
      );
      return rows;
    });
  }

  async obterPorId(tenantId: string, id: string): Promise<InsumoRow> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<InsumoRow>(
        `SELECT i.*, ${SALDO_POR_INSUMO} as quantidade_atual
         FROM insumo i
         WHERE i.id = $1`,
        [id],
      );
      const insumo = rows[0];
      if (!insumo) {
        throw new NotFoundException('Insumo não encontrado.');
      }
      return insumo;
    });
  }

  async atualizar(tenantId: string, id: string, dto: AtualizarInsumoDto): Promise<InsumoRow> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows: existing } = await c.query('SELECT 1 FROM insumo WHERE id = $1', [id]);
      if (existing.length === 0) {
        throw new NotFoundException('Insumo não encontrado.');
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let index = 1;

      const setCampo = (campo: string, valor: unknown) => {
        updates.push(`${campo} = $${index++}`);
        values.push(valor);
      };

      if (dto.nome !== undefined) {
        if (!dto.nome?.trim()) throw new BadRequestException('Nome do insumo é obrigatório.');
        setCampo('nome', dto.nome.trim());
      }
      if (dto.unidade_base !== undefined) {
        if (!dto.unidade_base?.trim()) throw new BadRequestException('Unidade base é obrigatória.');
        setCampo('unidade_base', dto.unidade_base.trim());
      }
      if (dto.estoque_minimo !== undefined) setCampo('estoque_minimo', dto.estoque_minimo);
      if (dto.lote_validade !== undefined) setCampo('lote_validade', dto.lote_validade);
      if (dto.unidade_uso !== undefined) setCampo('unidade_uso', dto.unidade_uso);
      if (dto.fator_conversao !== undefined) setCampo('fator_conversao', dto.fator_conversao);

      if (updates.length === 0) {
        return this.obterPorIdComCliente(c, id);
      }

      values.push(id);
      await c.query(`UPDATE insumo SET ${updates.join(', ')} WHERE id = $${index}`, values);
      return this.obterPorIdComCliente(c, id);
    });
  }

  async remover(tenantId: string, id: string): Promise<void> {
    await this.db.withTenant(tenantId, async (c) => {
      const { rowCount } = await c.query('DELETE FROM insumo WHERE id = $1', [id]);
      if (rowCount === 0) {
        throw new NotFoundException('Insumo não encontrado.');
      }
    });
  }

  async registrarEntrada(tenantId: string, dto: RegistrarEntradaDto): Promise<MovimentoEstoqueRow> {
    if (!dto.insumoId) throw new BadRequestException('insumoId é obrigatório.');
    if (dto.quantidade <= 0) throw new BadRequestException('Quantidade deve ser maior que zero.');
    if (dto.precoCentavos < 0) throw new BadRequestException('Preço de compra não pode ser negativo.');
    if (!dto.causeKey) throw new BadRequestException('Chave de idempotência (causeKey) é obrigatória.');

    return this.db.withTenant(tenantId, async (c) => {
      const { rows: insumos } = await c.query<{ lote_validade: boolean }>(
        'SELECT lote_validade FROM insumo WHERE id = $1',
        [dto.insumoId],
      );
      if (insumos.length === 0) {
        throw new NotFoundException('Insumo não encontrado.');
      }

      if (insumos[0].lote_validade) {
        if (!dto.lote?.trim()) throw new BadRequestException('Lote é obrigatório para este insumo.');
        if (!dto.validade) throw new BadRequestException('Validade é obrigatória para este insumo.');
      }

      const { rows } = await c.query<MovimentoEstoqueRow>(
        `INSERT INTO movimento_estoque (tenant_id, insumo_id, tipo, quantidade, preco_centavos, lote, validade, cause_key)
         VALUES ($1, $2, 'entrada', $3, $4, $5, $6, $7)
         ON CONFLICT (tenant_id, cause_key) DO NOTHING
         RETURNING *`,
        [tenantId, dto.insumoId, dto.quantidade, dto.precoCentavos, dto.lote?.trim() || null, dto.validade || null, dto.causeKey],
      );

      if (rows.length === 0) {
        return this.movimentoPorCauseKey(c, tenantId, dto.causeKey);
      }

      await this.verificarAlertasEstoque(c, tenantId, dto.insumoId);
      return rows[0];
    });
  }

  async registrarPerda(tenantId: string, insumoId: string, dto: RegistrarPerdaDto): Promise<MovimentoEstoqueRow> {
    if (dto.quantidade <= 0) throw new BadRequestException('Quantidade deve ser maior que zero.');
    if (!dto.motivo?.trim()) throw new BadRequestException('Motivo da perda é obrigatório.');
    if (!dto.causeKey) throw new BadRequestException('Chave de idempotência (causeKey) é obrigatória.');

    return this.db.withTenant(tenantId, async (c) => {
      const { rows: insumos } = await c.query('SELECT id FROM insumo WHERE id = $1', [insumoId]);
      if (insumos.length === 0) {
        throw new NotFoundException('Insumo não encontrado.');
      }

      const { rows } = await c.query<MovimentoEstoqueRow>(
        `INSERT INTO movimento_estoque (tenant_id, insumo_id, tipo, quantidade, motivo, cause_key)
         VALUES ($1, $2, 'perda', $3, $4, $5)
         ON CONFLICT (tenant_id, cause_key) DO NOTHING
         RETURNING *`,
        [tenantId, insumoId, dto.quantidade, dto.motivo.trim(), dto.causeKey],
      );

      if (rows.length === 0) {
        return this.movimentoPorCauseKey(c, tenantId, dto.causeKey);
      }

      await this.verificarAlertasEstoque(c, tenantId, insumoId);
      return rows[0];
    });
  }

  async obterHistoricoPrecos(tenantId: string, insumoId: string): Promise<HistoricoPrecoRow[]> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<HistoricoPrecoRow>(
        `SELECT id, quantidade::text, preco_centavos::text, criado_em, lote, validade, cause_key
         FROM movimento_estoque
         WHERE insumo_id = $1 AND tipo = 'entrada'
         ORDER BY criado_em DESC`,
        [insumoId],
      );
      return rows;
    });
  }

  async obterAlertasAtivos(tenantId: string): Promise<AlertaAtivoRow[]> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<AlertaAtivoRow>(
        `SELECT a.id, a.insumo_id, i.nome,
                ${SALDO_POR_INSUMO} as quantidade_atual,
                i.unidade_base, i.estoque_minimo::text
         FROM alerta_estoque a
         JOIN insumo i ON i.id = a.insumo_id
         ORDER BY i.nome`,
      );
      return rows;
    });
  }

  /** Conversão de unidade de uso → base (decimais exatos). */
  converterUsoParaBase(quantidadeUso: number, fatorConversao: number): number {
    if (fatorConversao <= 0) return 0;
    return quantidadeUso / fatorConversao;
  }

  /** Custo (centavos) de usar `quantidadeUso` dado o preço da unidade-base. */
  calcularCustoUso(precoBaseCentavos: number, quantidadeUso: number, fatorConversao: number): number {
    const quantBase = this.converterUsoParaBase(quantidadeUso, fatorConversao);
    return Math.round(precoBaseCentavos * quantBase);
  }

  private async obterPorIdComCliente(c: PoolClient, id: string): Promise<InsumoRow> {
    const { rows } = await c.query<InsumoRow>(
      `SELECT i.*, ${SALDO_POR_INSUMO} as quantidade_atual FROM insumo i WHERE i.id = $1`,
      [id],
    );
    return rows[0];
  }

  private async movimentoPorCauseKey(c: PoolClient, tenantId: string, causeKey: string): Promise<MovimentoEstoqueRow> {
    const { rows } = await c.query<MovimentoEstoqueRow>(
      'SELECT * FROM movimento_estoque WHERE tenant_id = $1 AND cause_key = $2',
      [tenantId, causeKey],
    );
    return rows[0];
  }

  /** Reavalia o alerta de estoque mínimo de um insumo no client de uma transação
   *  em andamento (usado pela baixa de produção, Story 4.2). */
  reavaliarAlertas(c: PoolClient, tenantId: string, insumoId: string): Promise<void> {
    return this.verificarAlertasEstoque(c, tenantId, insumoId);
  }

  private async verificarAlertasEstoque(c: PoolClient, tenantId: string, insumoId: string): Promise<void> {
    const { rows } = await c.query<{ estoque_minimo: string | null; quantidade_atual: string }>(
      `SELECT i.estoque_minimo, ${SALDO_POR_INSUMO} as quantidade_atual
       FROM insumo i
       WHERE i.id = $1`,
      [insumoId],
    );
    if (rows.length === 0) return;

    const { estoque_minimo, quantidade_atual } = rows[0];
    if (estoque_minimo === null) return;

    const abaixoOuIgual = Number(quantidade_atual) <= Number(estoque_minimo);
    if (abaixoOuIgual) {
      await c.query(
        `INSERT INTO alerta_estoque (tenant_id, insumo_id) VALUES ($1, $2)
         ON CONFLICT (tenant_id, insumo_id) DO NOTHING`,
        [tenantId, insumoId],
      );
    } else {
      await c.query('DELETE FROM alerta_estoque WHERE tenant_id = $1 AND insumo_id = $2', [tenantId, insumoId]);
    }
  }
}
