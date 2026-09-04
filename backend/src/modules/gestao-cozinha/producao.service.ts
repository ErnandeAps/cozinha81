import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { v5 as uuidv5 } from 'uuid';
import { DatabaseService } from '../../core/database/database.service';
import { FichaService } from './ficha.service';
import { InsumoService } from './insumo.service';

/** Namespace fixo para derivar cause_keys determinísticos das baixas de produção. */
const PRODUCAO_BAIXA_NS = 'b1f0a7e2-4c3d-5e6f-8a9b-0c1d2e3f4a5b';
/** Namespace fixo para derivar cause_keys determinísticos dos estornos. */
const ESTORNO_NS = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

export type StatusBaixa = 'pendente' | 'baixado' | 'sem_ficha';
export type ModoBaixa = 'automatico' | 'manual';

export interface RegistrarProducaoDto {
  /** Opcional: produção avulsa "sem ficha" não baixa estoque (4.2 AC#3). */
  fichaId?: string | null;
  /** Nº de porções produzidas (inteiro > 0). */
  quantidade: number;
  /** Opcional: idempotência (AD-6). Reenvio com a mesma chave não duplica. */
  causeKey?: string | null;
  /** Opcional: se o pedido já estava cancelado antes da baixa, estorna atomicamente (AD-13) */
  pedidoCancelado?: boolean;
}

export interface ProducaoRow {
  id: string;
  ficha_id: string | null;
  quantidade: string;
  status_baixa: StatusBaixa;
  cause_key: string | null;
  criado_em: Date;
}

/** cause_key determinístico da baixa de um insumo numa produção (idempotência). */
export function causeKeyBaixa(producaoId: string, insumoId: string): string {
  return uuidv5(`${producaoId}:${insumoId}`, PRODUCAO_BAIXA_NS);
}

/** cause_key determinístico do estorno de uma baixa (idempotência — AC#4). */
export function causeKeyEstorno(baixaCauseKey: string): string {
  return uuidv5(`estorno:${baixaCauseKey}`, ESTORNO_NS);
}

/**
 * Registro de Produção (Story 4.1) + baixa automática de estoque (Story 4.2).
 *
 * A baixa automática debita os Insumos conforme a árvore da Ficha por movimentos
 * `tipo='baixa'` no ledger (AD-9), cada um com `cause_key` derivado da produção
 * (AD-6) — idempotente e reversível. Produção sem Ficha não baixa: é marcada
 * `sem_ficha` e fica sinalizada ao Dono/Admin (AC#3).
 */
@Injectable()
export class ProducaoService {
  constructor(
    private readonly db: DatabaseService,
    private readonly fichas: FichaService,
    private readonly insumos: InsumoService,
  ) {}

  async registrar(tenantId: string, dto: RegistrarProducaoDto): Promise<ProducaoRow> {
    if (!Number.isFinite(dto?.quantidade) || dto.quantidade <= 0) {
      throw new BadRequestException('Quantidade produzida deve ser maior que zero.');
    }
    const quantidade = Math.round(dto.quantidade);

    return this.db.withTenant(tenantId, async (c) => {
      if (dto.fichaId) {
        const { rows } = await c.query('SELECT 1 FROM ficha WHERE id = $1', [dto.fichaId]);
        if (rows.length === 0) throw new NotFoundException('Ficha não encontrada.');
      }

      // Idempotência: com cause_key, reenvio retorna a produção existente (e as
      // baixas, derivadas do id, deduplicam por cause_key no ledger).
      const { rows } = await c.query<ProducaoRow>(
        `INSERT INTO producao (tenant_id, ficha_id, quantidade, cause_key, status_baixa)
         VALUES ($1, $2, $3, $4, 'pendente')
         ON CONFLICT (tenant_id, cause_key) WHERE cause_key IS NOT NULL DO NOTHING
         RETURNING id, ficha_id, quantidade::text, status_baixa, cause_key, criado_em`,
        [tenantId, dto.fichaId ?? null, quantidade, dto.causeKey ?? null],
      );

      let producao: ProducaoRow;
      if (rows.length === 0) {
        // Conflito de cause_key → produção já existia. Recupera-a.
        producao = await this.porCauseKey(c, tenantId, dto.causeKey as string);
        // Reenvio: não reprocessa a baixa (status já reflete o 1º processamento).
        return this.porId(c, producao.id);
      }
      producao = rows[0];

      // Produção sem Ficha nunca baixa — marcada e sinalizada (4.2 AC#3),
      // independentemente do modo de baixa.
      if (!producao.ficha_id) {
        await c.query(`UPDATE producao SET status_baixa = 'sem_ficha' WHERE id = $1`, [producao.id]);
        return this.porId(c, producao.id);
      }

      // Modo de baixa configurável (4.3): automático debita já; manual fica
      // pendente até a baixa explícita.
      const modo = await this.modoBaixa(c, tenantId);
      if (modo === 'automatico') {
        await this.executarBaixa(c, tenantId, producao);
      }
      
      // Se pedido já estava cancelado (baixa tardia), executa estorno na mesma
      // transação (atomicamente) mantendo o ledger consistente (Story 7.6 - AD-13).
      if (dto.pedidoCancelado) {
        await this.executarEstorno(c, tenantId, producao, 'Estorno de baixa tardia cancelada');
      }

      return this.porId(c, producao.id);
    });
  }

  /**
   * Localiza a produção por causeKey (usado no Cancelamento) e estorna suas
   * baixas de estoque de forma idempotente e determinística (sem queries texto no ledger).
   */
  async estornarPorCauseKey(tenantId: string, causeKey: string, motivoEstorno: string): Promise<void> {
    await this.db.withTenant(tenantId, async (c) => {
      const producao = await this.porCauseKey(c, tenantId, causeKey);
      if (!producao) return; // produção ainda não ocorreu
      await this.executarEstorno(c, tenantId, producao, motivoEstorno);
    });
  }

  /** Baixa explícita de uma Produção pendente (modo manual, 4.3 AC#2). Idempotente. */
  async baixarManual(tenantId: string, producaoId: string): Promise<ProducaoRow> {
    return this.db.withTenant(tenantId, async (c) => {
      const producao = await this.porId(c, producaoId);
      if (!producao) throw new NotFoundException('Produção não encontrada.');
      if (producao.status_baixa === 'baixado') return producao; // idempotente
      if (!producao.ficha_id || producao.status_baixa === 'sem_ficha') {
        throw new BadRequestException('Produção sem Ficha não pode baixar estoque. Vincule uma Ficha.');
      }
      await this.executarBaixa(c, tenantId, producao);
      return this.porId(c, producao.id);
    });
  }

  /** Modo de baixa do tenant (default `automatico`). */
  async obterModoBaixa(tenantId: string): Promise<ModoBaixa> {
    return this.db.withTenant(tenantId, (c) => this.modoBaixa(c, tenantId));
  }

  /** Alterna o modo de baixa — vale para as PRÓXIMAS produções (4.3 AC#3). */
  async definirModoBaixa(tenantId: string, modo: ModoBaixa): Promise<{ modoBaixa: ModoBaixa }> {
    if (modo !== 'automatico' && modo !== 'manual') {
      throw new BadRequestException('Modo de baixa inválido.');
    }
    return this.db.withTenant(tenantId, async (c) => {
      await c.query(
        `INSERT INTO producao_config (tenant_id, modo_baixa) VALUES ($1, $2)
         ON CONFLICT (tenant_id) DO UPDATE SET modo_baixa = EXCLUDED.modo_baixa, atualizado_em = now()`,
        [tenantId, modo],
      );
      return { modoBaixa: modo };
    });
  }

  async listar(tenantId: string): Promise<ProducaoRow[]> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<ProducaoRow>(
        `SELECT id, ficha_id, quantidade::text, status_baixa, cause_key, criado_em
         FROM producao ORDER BY criado_em DESC`,
      );
      return rows;
    });
  }

  /** Produções avulsas sem Ficha — sinal ao Dono/Admin para corrigir (AC#3). */
  async listarSemFicha(tenantId: string): Promise<ProducaoRow[]> {
    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<ProducaoRow>(
        `SELECT id, ficha_id, quantidade::text, status_baixa, cause_key, criado_em
         FROM producao WHERE status_baixa = 'sem_ficha' ORDER BY criado_em DESC`,
      );
      return rows;
    });
  }

  // ── internos ──────────────────────────────────────────────────────────────

  /** Modo de baixa do tenant lido no client da transação (default automatico). */
  private async modoBaixa(c: PoolClient, tenantId: string): Promise<ModoBaixa> {
    const { rows } = await c.query<{ modo_baixa: ModoBaixa }>(
      'SELECT modo_baixa FROM producao_config WHERE tenant_id = $1',
      [tenantId],
    );
    return rows[0]?.modo_baixa ?? 'automatico';
  }

  /**
   * Debita os Insumos conforme a árvore da Ficha (Ficha obrigatória). Idempotente:
   * cada baixa usa `cause_key` derivado de (produção, insumo); o ON CONFLICT do
   * ledger impede duplicação no reenvio/baixa repetida.
   */
  private async executarBaixa(c: PoolClient, tenantId: string, producao: ProducaoRow): Promise<void> {
    if (producao.status_baixa === 'baixado') return; // já baixada
    if (!producao.ficha_id) return; // guard — chamadores garantem Ficha presente

    const { rows: f } = await c.query<{ rendimento_porcoes: number }>(
      'SELECT rendimento_porcoes FROM ficha WHERE id = $1',
      [producao.ficha_id],
    );
    if (f.length === 0) throw new NotFoundException('Ficha não encontrada.');

    const consumo = await this.fichas.consumoInsumos(
      c,
      producao.ficha_id,
      Number(producao.quantidade),
    );

    for (const [insumoId, qtd] of consumo) {
      if (qtd <= 0) continue;
      await c.query(
        `INSERT INTO movimento_estoque (tenant_id, insumo_id, tipo, quantidade, cause_key, motivo)
         VALUES ($1, $2, 'baixa', $3, $4, $5)
         ON CONFLICT (tenant_id, cause_key) DO NOTHING`,
        [tenantId, insumoId, qtd.toString(), causeKeyBaixa(producao.id, insumoId), `Produção ${producao.id}`],
      );
      await this.insumos.reavaliarAlertas(c, tenantId, insumoId);
    }

    await c.query(`UPDATE producao SET status_baixa = 'baixado' WHERE id = $1`, [producao.id]);
  }

  /**
   * Estorna os insumos consumidos da produção, utilizando a árvore da ficha 
   * para calcular as cause_keys das baixas originárias, sendo 100% determinístico.
   */
  private async executarEstorno(c: PoolClient, tenantId: string, producao: ProducaoRow, motivo: string): Promise<void> {
    if (!producao.ficha_id) return;

    const { rows: f } = await c.query<{ rendimento_porcoes: number }>(
      'SELECT rendimento_porcoes FROM ficha WHERE id = $1',
      [producao.ficha_id],
    );
    if (f.length === 0) return;

    const consumo = await this.fichas.consumoInsumos(
      c,
      producao.ficha_id,
      Number(producao.quantidade),
    );

    for (const [insumoId, qtd] of consumo) {
      if (qtd <= 0) continue;
      const ckBaixa = causeKeyBaixa(producao.id, insumoId);
      await c.query(
        `INSERT INTO movimento_estoque (tenant_id, insumo_id, tipo, quantidade, cause_key, motivo)
         VALUES ($1, $2, 'estorno', $3, $4, $5)
         ON CONFLICT (tenant_id, cause_key) DO NOTHING`,
        [tenantId, insumoId, qtd.toString(), causeKeyEstorno(ckBaixa), motivo],
      );
      await this.insumos.reavaliarAlertas(c, tenantId, insumoId);
    }
  }

  private async porId(c: PoolClient, id: string): Promise<ProducaoRow> {
    const { rows } = await c.query<ProducaoRow>(
      `SELECT id, ficha_id, quantidade::text, status_baixa, cause_key, criado_em FROM producao WHERE id = $1`,
      [id],
    );
    return rows[0];
  }

  private async porCauseKey(c: PoolClient, tenantId: string, causeKey: string): Promise<ProducaoRow> {
    const { rows } = await c.query<ProducaoRow>(
      `SELECT id, ficha_id, quantidade::text, status_baixa, cause_key, criado_em
       FROM producao WHERE tenant_id = $1 AND cause_key = $2`,
      [tenantId, causeKey],
    );
    return rows[0];
  }
}
