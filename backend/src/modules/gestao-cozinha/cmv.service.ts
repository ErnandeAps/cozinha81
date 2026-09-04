import { BadRequestException, Injectable } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../core/database/database.service';
import { FichaService } from './ficha.service';
import { CusteioService, type MetodoCusteio } from './custeio.service';
import { divRound } from './money';

export interface CmvUnitario {
  fichaId: string;
  metodo: MetodoCusteio;
  versao: number;
  asOf: string;
  /** CMV unitário = custo da porção da Ficha (AD-10). Centavos (string/bigint). */
  cmvUnitarioCentavos: string;
}

export type OrigemFaturamento = 'manual' | 'pedidos';

export interface CmvValorPeriodo {
  competencia: string;
  de: string;
  ate: string;
  metodo: MetodoCusteio;
  versao: number;
  asOf: string;
  /** Consumo do período (baixas de produção + perdas) valorado. Centavos. */
  cmvValorCentavos: string;
  /** Faturamento BRUTO resolvido por precedência (pedidos > manual). `null` se não informado. */
  faturamentoCentavos: string | null;
  faturamentoOrigem: OrigemFaturamento | null;
  /** CMV% = CMV em valor ÷ faturamento × 100 (2 casas). `null` sem faturamento. */
  cmvPercentual: string | null;
}

/** Intervalo [de, ate) de uma competência mensal `YYYY-MM` (UTC). */
export function intervaloMes(competencia: string): { de: string; ate: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(competencia ?? '');
  if (!m) throw new BadRequestException('Competência inválida (use YYYY-MM).');
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) throw new BadRequestException('Competência inválida (mês 01-12).');
  return {
    de: new Date(Date.UTC(ano, mes - 1, 1)).toISOString(),
    ate: new Date(Date.UTC(ano, mes, 1)).toISOString(), // 1º dia do mês seguinte (exclusivo)
  };
}

/**
 * CMV — Custo de Mercadoria Vendida (Épico 5, FR-16/17/18).
 *
 * Tudo é derivado ON-READ (AD-10), reusando o motor de custo da Story 3.2 para
 * não divergir do número exibido no editor de Ficha. Restrito ao Dono/Admin
 * (os campos de custo ficam no registro sensível — AD-4).
 */
@Injectable()
export class CmvService {
  constructor(
    private readonly db: DatabaseService,
    private readonly fichas: FichaService,
    private readonly custeio: CusteioService,
  ) {}

  /**
   * CMV unitário de uma Ficha (Story 5.1): é exatamente o custo da porção
   * calculado pela 3.2 para o mesmo `as_of`/método (AC#1/AC#3) — sem recalcular.
   */
  async unitario(tenantId: string, fichaId: string, asOf?: string): Promise<CmvUnitario> {
    const custo = await this.fichas.calcularCusto(tenantId, fichaId, asOf);
    return {
      fichaId: custo.fichaId,
      metodo: custo.metodo,
      versao: custo.versao,
      asOf: custo.asOf,
      cmvUnitarioCentavos: custo.custoPorcaoCentavos,
    };
  }

  /**
   * CMV em valor de um período (Story 5.2): consolida o **consumo** do período
   * — baixas de produção + perdas no ledger (AD-9) — valorado pelo método/versão
   * de custeio vigente (AD-10). Nunca soma entradas (compras). On-read.
   */
  async valorPeriodo(tenantId: string, competencia: string): Promise<CmvValorPeriodo> {
    const { de, ate } = intervaloMes(competencia);
    const cfg = await this.custeio.exigir(tenantId);
    const asOf = ate; // valoração com os preços até o fim do período

    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<{ insumo_id: string; q: string }>(
        `SELECT insumo_id, SUM(quantidade)::text AS q
         FROM movimento_estoque
         WHERE tipo IN ('baixa', 'perda') AND criado_em >= $1 AND criado_em < $2
         GROUP BY insumo_id`,
        [de, ate],
      );

      let total = 0n;
      for (const r of rows) {
        total += await this.fichas.valorInsumo(c, r.insumo_id, Number(r.q), cfg.metodo, asOf);
      }

      const fat = await this.faturamentoResolvido(c, tenantId, competencia);
      let cmvPercentual: string | null = null;
      if (fat && BigInt(fat.valor_centavos) > 0n) {
        // CMV% × 100 (inteiro, half-up) → formata com 2 casas decimais.
        const pct100 = divRound(total * 10000n, BigInt(fat.valor_centavos));
        cmvPercentual = `${pct100 / 100n}.${(pct100 % 100n).toString().padStart(2, '0')}`;
      }

      return {
        competencia,
        de,
        ate,
        metodo: cfg.metodo,
        versao: cfg.versao,
        asOf,
        cmvValorCentavos: total.toString(),
        faturamentoCentavos: fat ? fat.valor_centavos : null,
        faturamentoOrigem: fat ? fat.origem : null,
        cmvPercentual,
      };
    });
  }

  /**
   * Faturamento BRUTO manual do período (Story 5.3). Comissões de canal NÃO são
   * descontadas (FR-18). Persistido com `origem='manual'`; o automático (7.7)
   * entra como `origem='pedidos'` e tem PRECEDÊNCIA na leitura — nunca somados.
   */
  async definirFaturamentoManual(
    tenantId: string,
    competencia: string,
    valorCentavos: number,
  ): Promise<{ competencia: string; faturamentoCentavos: string; origem: OrigemFaturamento }> {
    intervaloMes(competencia); // valida o formato YYYY-MM
    if (!Number.isFinite(valorCentavos) || valorCentavos < 0) {
      throw new BadRequestException('Faturamento deve ser um valor não negativo (centavos).');
    }
    const valor = Math.round(valorCentavos);
    return this.db.withTenant(tenantId, async (c) => {
      await c.query(
        `INSERT INTO faturamento_periodo (tenant_id, competencia, origem, valor_centavos)
         VALUES ($1, $2, 'manual', $3)
         ON CONFLICT (tenant_id, competencia, origem)
         DO UPDATE SET valor_centavos = EXCLUDED.valor_centavos, atualizado_em = now()`,
        [tenantId, competencia, valor],
      );
      return { competencia, faturamentoCentavos: valor.toString(), origem: 'manual' };
    });
  }

  /**
   * Faturamento BRUTO ajustado automaticamente (deltas) do módulo de Pedidos (Story 7.7 refactored).
   * Tem precedência sobre o faturamento manual.
   */
  async ajustarFaturamentoPedidos(
    tenantId: string,
    competencia: string,
    operacao: 'adicionar' | 'subtrair',
    valorCentavos: bigint,
  ): Promise<void> {
    const delta = operacao === 'adicionar' ? valorCentavos : -valorCentavos;
    return this.db.withTenant(tenantId, async (c) => {
      await c.query(
        `INSERT INTO faturamento_periodo (tenant_id, competencia, origem, valor_centavos)
         VALUES ($1, $2, 'pedidos', $3)
         ON CONFLICT (tenant_id, competencia, origem)
         DO UPDATE SET valor_centavos = faturamento_periodo.valor_centavos + EXCLUDED.valor_centavos, atualizado_em = now()`,
        [tenantId, competencia, delta.toString()],
      );
    });
  }

  /** Resolve o faturamento por precedência (pedidos > manual) — nunca soma. */
  private async faturamentoResolvido(
    c: PoolClient,
    tenantId: string,
    competencia: string,
  ): Promise<{ valor_centavos: string; origem: OrigemFaturamento } | null> {
    const { rows } = await c.query<{ valor_centavos: string; origem: OrigemFaturamento }>(
      `SELECT valor_centavos::text, origem FROM faturamento_periodo
       WHERE tenant_id = $1 AND competencia = $2
       ORDER BY CASE origem WHEN 'pedidos' THEN 0 ELSE 1 END
       LIMIT 1`,
      [tenantId, competencia],
    );
    return rows[0] ?? null;
  }
}
