import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PoolClient } from 'pg';
import { DatabaseService } from '../../core/database/database.service';
import { CusteioService, type MetodoCusteio } from './custeio.service';
import { divRound, SUB_ESCALA } from './money';

const PROFUNDIDADE_MAX = 3;

export interface FichaItemInput {
  /** Exatamente um: insumoId (quantidade em base escalada) ou subFichaId (porções×1000). */
  insumoId?: string;
  subFichaId?: string;
  quantidade: number;
}

export interface CriarFichaDto {
  nome: string;
  rendimentoPorcoes?: number;
  itens: FichaItemInput[];
}

export interface FichaItemRow {
  id: string;
  insumo_id: string | null;
  sub_ficha_id: string | null;
  quantidade: string;
}

export interface FichaComItens {
  id: string;
  nome: string;
  rendimento_porcoes: number;
  itens: FichaItemRow[];
}

export interface CustoFicha {
  fichaId: string;
  metodo: MetodoCusteio;
  versao: number;
  asOf: string;
  custoTotalCentavos: string;
  custoPorcaoCentavos: string;
}

interface CtxCusto {
  metodo: MetodoCusteio;
  asOf: string;
}

interface GrafoFichas {
  itens: Map<string, FichaItemRow[]>;
  rendimentos: Map<string, number>;
  pais: Map<string, string[]>;
}

/**
 * Ficha Técnica + cálculo de custo ON-READ (Story 3.2/3.3, AD-10).
 *
 * Custo nunca é persistido: é derivado na leitura sobre a árvore da Ficha
 * (≤3 níveis, sem ciclo), parametrizado por `as_of` + método/versão de custeio.
 * Determinístico (inteiros, sem float). Sub-receitas agregam recursivamente.
 */
@Injectable()
export class FichaService {
  constructor(
    private readonly db: DatabaseService,
    private readonly custeio: CusteioService,
  ) {}

  async criar(tenantId: string, dto: CriarFichaDto): Promise<FichaComItens> {
    if (!dto?.nome?.trim()) throw new BadRequestException('Nome da Ficha é obrigatório.');
    if (!dto.itens?.length) throw new BadRequestException('A Ficha precisa de ao menos um item.');
    for (const it of dto.itens) {
      this.validarItem(it);
    }

    return this.db.withTenant(tenantId, async (c) => {
      const { rows: fichaRows } = await c.query<{ id: string }>(
        'INSERT INTO ficha (tenant_id, nome, rendimento_porcoes) VALUES ($1, $2, $3) RETURNING id',
        [tenantId, dto.nome.trim(), dto.rendimentoPorcoes ?? 1],
      );
      const fichaId = fichaRows[0].id;

      // Valida árvore das sub-fichas ANTES de inserir os itens (AD-10: ≤3 níveis, sem ciclo).
      for (const it of dto.itens) {
        if (it.subFichaId) {
          if (it.subFichaId === fichaId) throw new BadRequestException('Uma Ficha não pode referenciar a si mesma.');
          
          const grafo = await this.carregarGrafo(c);
          let list = grafo.itens.get(fichaId);
          if (!list) {
            list = [];
            grafo.itens.set(fichaId, list);
          }
          for (const itemInput of dto.itens) {
            if (itemInput.subFichaId) {
              list.push({
                id: 'temp',
                insumo_id: null,
                sub_ficha_id: itemInput.subFichaId,
                quantidade: itemInput.quantidade.toString(),
              });
              let parents = grafo.pais.get(itemInput.subFichaId);
              if (!parents) {
                parents = [];
                grafo.pais.set(itemInput.subFichaId, parents);
              }
              parents.push(fichaId);
            }
          }

          this.validarGrafo(grafo, fichaId);
          break; // Checa uma vez para a ficha inteira
        }
      }

      for (const it of dto.itens) {
        await c.query(
          'INSERT INTO ficha_item (tenant_id, ficha_id, insumo_id, sub_ficha_id, quantidade) VALUES ($1, $2, $3, $4, $5)',
          [tenantId, fichaId, it.insumoId ?? null, it.subFichaId ?? null, it.quantidade],
        );
      }

      return this.obterComCliente(c, fichaId);
    });
  }

  /**
   * Adiciona um item a uma Ficha existente, validando árvore (≤3 níveis, sem
   * ciclo) antes de gravar (Story 3.3, AC-2/AC-3). O guard de leitura
   * (`custoTotal`) é o backstop final contra recursão.
   */
  async adicionarItem(tenantId: string, fichaId: string, item: FichaItemInput): Promise<FichaComItens> {
    this.validarItem(item);

    return this.db.withTenant(tenantId, async (c) => {
      const { rows: f } = await c.query('SELECT 1 FROM ficha WHERE id = $1', [fichaId]);
      if (f.length === 0) throw new NotFoundException('Ficha não encontrada.');

      if (item.subFichaId) {
        if (item.subFichaId === fichaId) {
          throw new BadRequestException('Uma Ficha não pode referenciar a si mesma.');
        }
        const { rows: sf } = await c.query('SELECT 1 FROM ficha WHERE id = $1', [item.subFichaId]);
        if (sf.length === 0) throw new NotFoundException('Sub-ficha não encontrada.');

        // Carrega o grafo em memória e simula a inserção para validar
        const grafo = await this.carregarGrafo(c);
        let list = grafo.itens.get(fichaId);
        if (!list) {
          list = [];
          grafo.itens.set(fichaId, list);
        }
        list.push({
          id: 'temp',
          insumo_id: null,
          sub_ficha_id: item.subFichaId,
          quantidade: item.quantidade.toString(),
        });

        let parents = grafo.pais.get(item.subFichaId);
        if (!parents) {
          parents = [];
          grafo.pais.set(item.subFichaId, parents);
        }
        parents.push(fichaId);

        // Valida o grafo simulado
        this.validarGrafo(grafo, fichaId);
      }

      await c.query(
        'INSERT INTO ficha_item (tenant_id, ficha_id, insumo_id, sub_ficha_id, quantidade) VALUES ($1, $2, $3, $4, $5)',
        [tenantId, fichaId, item.insumoId ?? null, item.subFichaId ?? null, item.quantidade],
      );
      return this.obterComCliente(c, fichaId);
    });
  }

  async listar(tenantId: string): Promise<{ id: string; nome: string; rendimento_porcoes: number }[]> {
    return this.db.withTenant(tenantId, (c) =>
      c
        .query<{ id: string; nome: string; rendimento_porcoes: number }>(
          'SELECT id, nome, rendimento_porcoes FROM ficha ORDER BY nome',
        )
        .then((r) => r.rows),
    );
  }

  async obter(tenantId: string, id: string): Promise<FichaComItens> {
    return this.db.withTenant(tenantId, (c) => this.obterComCliente(c, id));
  }

  async remover(tenantId: string, id: string): Promise<void> {
    await this.db.withTenant(tenantId, async (c) => {
      const { rowCount } = await c.query('DELETE FROM ficha WHERE id = $1', [id]);
      if (rowCount === 0) throw new NotFoundException('Ficha não encontrada.');
    });
  }

  /** Custo on-read da Ficha (total e por porção). Exige método de custeio definido. */
  async calcularCusto(tenantId: string, fichaId: string, asOf?: string): Promise<CustoFicha> {
    const cfg = await this.custeio.exigir(tenantId);
    const asOfIso = asOf ?? new Date().toISOString();

    return this.db.withTenant(tenantId, async (c) => {
      const grafo = await this.carregarGrafo(c);
      const rend = grafo.rendimentos.get(fichaId);
      if (rend === undefined) throw new NotFoundException('Ficha não encontrada.');

      const ctx: CtxCusto = { metodo: cfg.metodo, asOf: asOfIso };
      const total = await this.custoTotal(c, grafo, fichaId, ctx, 1, new Set());
      const porcao = divRound(total, BigInt(rend));

      return {
        fichaId,
        metodo: cfg.metodo,
        versao: cfg.versao,
        asOf: asOfIso,
        custoTotalCentavos: total.toString(),
        custoPorcaoCentavos: porcao.toString(),
      };
    });
  }

  /**
   * Consumo de Insumos (base escalada) para produzir `porcoes` porções da Ficha
   * (Story 4.2). Achata a árvore de sub-receitas em quantidades por Insumo,
   * determinístico com inteiros (half-up por ocorrência). Roda no client da
   * transação chamadora (a baixa no ledger precisa ser atômica com a leitura).
   *
   * A conversão porções→"lotes da receita" é uma fração num/den embutida pelo
   * chamador (raiz: porcoes/rendimento; sub: s·num / (1000·den·rendimento_sub)).
   */
  async consumoInsumos(
    c: PoolClient,
    fichaId: string,
    quantidadeFicha: number,
    nivel = 1,
    visitados: Set<string> = new Set(),
  ): Promise<Map<string, number>> {
    const grafo = await this.carregarGrafo(c);
    return this.calcularConsumoSubtree(grafo, fichaId, quantidadeFicha, nivel, visitados);
  }

  /**
   * Valor (centavos) de uma quantidade-base de um Insumo pelo método/`as_of`
   * informados (Story 5.2). Reusa o MESMO motor de valoração do custo on-read
   * (3.2) para não divergir. Roda no client da transação chamadora.
   */
  valorInsumo(c: PoolClient, insumoId: string, qtdBase: number, metodo: MetodoCusteio, asOf: string): Promise<bigint> {
    return this.custoInsumoItem(c, insumoId, qtdBase, { metodo, asOf });
  }

  // ── internos ──────────────────────────────────────────────────────────────

  private async carregarGrafo(c: PoolClient): Promise<GrafoFichas> {
    const { rows: fichas } = await c.query<{ id: string; rendimento_porcoes: number }>(
      'SELECT id, rendimento_porcoes FROM ficha',
    );
    const { rows: itens } = await c.query<FichaItemRow & { ficha_id: string }>(
      'SELECT id, ficha_id, insumo_id, sub_ficha_id, quantidade FROM ficha_item',
    );

    const itensMap = new Map<string, FichaItemRow[]>();
    const rendimentosMap = new Map<string, number>();
    const paisMap = new Map<string, string[]>();

    for (const f of fichas) {
      rendimentosMap.set(f.id, f.rendimento_porcoes);
    }

    for (const it of itens) {
      let list = itensMap.get(it.ficha_id);
      if (!list) {
        list = [];
        itensMap.set(it.ficha_id, list);
      }
      list.push(it);

      if (it.sub_ficha_id) {
        let parents = paisMap.get(it.sub_ficha_id);
        if (!parents) {
          parents = [];
          paisMap.set(it.sub_ficha_id, parents);
        }
        parents.push(it.ficha_id);
      }
    }

    return { itens: itensMap, rendimentos: rendimentosMap, pais: paisMap };
  }

  private validarGrafo(grafo: GrafoFichas, startId: string): void {
    const ancestrais = new Set<string>();
    const coletarAncestrais = (id: string, visitados: Set<string>) => {
      if (visitados.has(id)) {
        throw new BadRequestException('Referência circular de Ficha detectada.');
      }
      const visitados2 = new Set(visitados).add(id);
      ancestrais.add(id);
      const parents = grafo.pais.get(id) ?? [];
      for (const p of parents) {
        coletarAncestrais(p, visitados2);
      }
    };

    coletarAncestrais(startId, new Set());

    for (const anc of ancestrais) {
      const prof = this.obterProfundidadeEDetectarCiclo(grafo, anc, new Set());
      if (prof > PROFUNDIDADE_MAX) {
        throw new BadRequestException(`Composição excederia ${PROFUNDIDADE_MAX} níveis de Ficha.`);
      }
    }
  }

  private obterProfundidadeEDetectarCiclo(grafo: GrafoFichas, atualId: string, visitados: Set<string>): number {
    if (visitados.has(atualId)) {
      throw new BadRequestException('Referência circular de Ficha detectada.');
    }
    const visitados2 = new Set(visitados).add(atualId);
    const itens = grafo.itens.get(atualId) ?? [];
    let maxFilho = 0;
    for (const it of itens) {
      if (it.sub_ficha_id) {
        maxFilho = Math.max(maxFilho, this.obterProfundidadeEDetectarCiclo(grafo, it.sub_ficha_id, visitados2));
      }
    }
    return 1 + maxFilho;
  }

  private validarItem(item: FichaItemInput): void {
    const temInsumo = !!item.insumoId;
    const temSub = !!item.subFichaId;
    if (temInsumo === temSub) {
      throw new BadRequestException('Cada item deve ter exatamente um componente (insumo OU sub-ficha).');
    }
    if (!(item.quantidade > 0)) {
      throw new BadRequestException('Quantidade deve ser maior que zero.');
    }
  }

  private async custoTotal(
    c: PoolClient,
    grafo: GrafoFichas,
    fichaId: string,
    ctx: CtxCusto,
    nivel: number,
    visitados: Set<string>,
  ): Promise<bigint> {
    if (nivel > PROFUNDIDADE_MAX) {
      throw new BadRequestException(`Árvore de Ficha excede ${PROFUNDIDADE_MAX} níveis.`);
    }
    if (visitados.has(fichaId)) {
      throw new BadRequestException('Referência circular de Ficha detectada.');
    }
    const visitados2 = new Set(visitados).add(fichaId);

    const itens = grafo.itens.get(fichaId) ?? [];

    let total = 0n;
    for (const it of itens) {
      if (it.insumo_id) {
        total += await this.custoInsumoItem(c, it.insumo_id, Number(it.quantidade), ctx);
      } else if (it.sub_ficha_id) {
        const subTotal = await this.custoTotal(c, grafo, it.sub_ficha_id, ctx, nivel + 1, visitados2);
        const rend = Number(grafo.rendimentos.get(it.sub_ficha_id) ?? 1);
        const precoPorcao = Number(subTotal) / rend;
        total += BigInt(Math.round(precoPorcao * Number(it.quantidade)));
      }
    }
    return total;
  }

  private calcularConsumoSubtree(
    grafo: GrafoFichas,
    fichaId: string,
    quantidadeFicha: number,
    nivel: number,
    visitados: Set<string>,
  ): Map<string, number> {
    if (nivel > PROFUNDIDADE_MAX) {
      throw new BadRequestException(`Árvore de Ficha excede ${PROFUNDIDADE_MAX} níveis.`);
    }
    if (visitados.has(fichaId)) {
      throw new BadRequestException('Referência circular de Ficha detectada.');
    }
    const visitados2 = new Set(visitados).add(fichaId);

    const itens = grafo.itens.get(fichaId) ?? [];
    const rend = grafo.rendimentos.get(fichaId) ?? 1;
    const fator = quantidadeFicha / rend;

    const acc = new Map<string, number>();
    for (const it of itens) {
      if (it.insumo_id) {
        const consumido = Number(it.quantidade) * fator;
        acc.set(it.insumo_id, (acc.get(it.insumo_id) ?? 0) + consumido);
      } else if (it.sub_ficha_id) {
        const subQtd = Number(it.quantidade) * fator;
        const subMap = this.calcularConsumoSubtree(
          grafo,
          it.sub_ficha_id,
          subQtd,
          nivel + 1,
          visitados2,
        );
        for (const [insumoId, qtd] of subMap) {
          acc.set(insumoId, (acc.get(insumoId) ?? 0) + qtd);
        }
      }
    }
    return acc;
  }

  private async custoInsumoItem(c: PoolClient, insumoId: string, qtdBase: number, ctx: CtxCusto): Promise<bigint> {
    if (ctx.metodo === 'ultimo_preco') {
      const { rows } = await c.query<{ preco_centavos: string; quantidade: string }>(
        `SELECT preco_centavos, quantidade FROM movimento_estoque
         WHERE insumo_id = $1 AND tipo = 'entrada' AND preco_centavos IS NOT NULL AND criado_em <= $2
         ORDER BY criado_em DESC LIMIT 1`,
        [insumoId, ctx.asOf],
      );
      if (rows.length === 0) return 0n;
      const preco = Number(rows[0].preco_centavos);
      const qtdEntrada = Number(rows[0].quantidade);
      return BigInt(Math.round((preco * qtdBase) / qtdEntrada));
    }
    // medio_ponderado
    const { rows } = await c.query<{ p: string | null; q: string | null }>(
      `SELECT SUM(preco_centavos) AS p, SUM(quantidade) AS q FROM movimento_estoque
       WHERE insumo_id = $1 AND tipo = 'entrada' AND preco_centavos IS NOT NULL AND criado_em <= $2`,
      [insumoId, ctx.asOf],
    );
    const p = rows[0].p;
    const q = rows[0].q;
    if (!p || !q || Number(q) === 0) return 0n;
    return BigInt(Math.round((Number(p) * qtdBase) / Number(q)));
  }

  private async obterComCliente(c: PoolClient, id: string): Promise<FichaComItens> {
    const { rows: f } = await c.query<{ id: string; nome: string; rendimento_porcoes: number }>(
      'SELECT id, nome, rendimento_porcoes FROM ficha WHERE id = $1',
      [id],
    );
    if (f.length === 0) throw new NotFoundException('Ficha não encontrada.');
    const { rows: itens } = await c.query<FichaItemRow>(
      'SELECT id, insumo_id, sub_ficha_id, quantidade FROM ficha_item WHERE ficha_id = $1 ORDER BY criado_em',
      [id],
    );
    return { ...f[0], itens };
  }
}
