import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import { PRECO_ALUGUEL_CENTAVOS, PRECO_MODULO_CENTAVOS } from './billing.constants';

export interface FaturaRow {
  id: string;
  tenant_id: string;
  periodo_inicio: Date;
  periodo_fim: Date;
  status: 'aberta' | 'paga' | 'vencida' | 'cancelada';
  valor_total: number;
  criado_em: Date;
}

export interface FaturaItemRow {
  id: string;
  fatura_id: string;
  tipo: 'aluguel' | 'modulo' | 'consumo_material' | 'hora_extra' | 'multa';
  descricao: string;
  valor: number;
  origem_id: string | null;
  criado_em: Date;
}

@Injectable()
export class BillingService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Gera uma fatura consolidada para um inquilino no período informado.
   *
   * Fluxo transacional (tudo-ou-nada):
   * 1. Coleta reservas do período → itens de aluguel (FR-38 / Story 10.1)
   * 2. Coleta módulos habilitados → itens de assinatura (FR-39 / Story 10.2)
   * 3. Coleta consumos de materiais no período → itens de extras (FR-40 / Story 10.3)
   * 4. Insere fatura + itens em transação atômica
   */
  async gerarFatura(
    tenantId: string,
    inicio: string,
    fim: string,
  ): Promise<FaturaRow & { itens: FaturaItemRow[] }> {
    return this.db.withPlatform(async (c) => {
      // Verificar se o inquilino existe
      const { rows: tenantRows } = await c.query(
        'SELECT 1 FROM inquilino WHERE id = $1',
        [tenantId],
      );
      if (tenantRows.length === 0) {
        throw new NotFoundException(`Inquilino não encontrado: ${tenantId}`);
      }

      // Verificar duplicidade de fatura para o mesmo tenant+período
      const { rows: existentes } = await c.query(
        `SELECT 1 FROM fatura
         WHERE tenant_id = $1 AND periodo_inicio = $2 AND periodo_fim = $3
         AND status != 'cancelada'`,
        [tenantId, inicio, fim],
      );
      if (existentes.length > 0) {
        throw new ConflictException(
          'Já existe uma fatura para este inquilino neste período.',
        );
      }

      // --- 1. Reservas do período → itens de aluguel ---
      const { rows: reservas } = await c.query<{
        id: string;
        modalidade: string;
        inicio: Date;
        fim: Date;
      }>(
        `SELECT id, modalidade, lower(periodo) as inicio, upper(periodo) as fim
         FROM reserva
         WHERE tenant_id = $1
           AND lower(periodo) < $3::timestamptz
           AND upper(periodo) > $2::timestamptz
         ORDER BY lower(periodo)`,
        [tenantId, inicio, fim],
      );

      // --- 2. Módulos habilitados → assinaturas ---
      const { rows: modulos } = await c.query<{
        modulo: string;
        habilitado: boolean;
      }>(
        `SELECT modulo, habilitado FROM modulo_flag
         WHERE tenant_id = $1 AND habilitado = true`,
        [tenantId],
      );

      // --- 3. Consumo de materiais no período → extras ---
      const { rows: consumos } = await c.query<{
        id: string;
        material_id: string;
        quantidade: number;
        valor_unitario: number;
        nome: string;
      }>(
        `SELECT mm.id, mm.material_id, mm.quantidade, mm.valor_unitario, m.nome
         FROM material_movimento mm
         JOIN material m ON m.id = mm.material_id
         WHERE mm.tenant_id = $1
           AND mm.tipo = 'consumo'
           AND mm.criado_em >= $2::timestamptz
           AND mm.criado_em < $3::timestamptz
         ORDER BY mm.criado_em`,
        [tenantId, inicio, fim],
      );

      // --- Montar itens ---
      const itens: Array<{
        tipo: string;
        descricao: string;
        valor: number;
        origem_id: string | null;
      }> = [];

      for (const r of reservas) {
        const preco = PRECO_ALUGUEL_CENTAVOS[r.modalidade];
        if (preco === undefined) {
          throw new Error(`Preço não configurado para a modalidade de reserva: ${r.modalidade}`);
        }
        itens.push({
          tipo: 'aluguel',
          descricao: `Aluguel ${r.modalidade}: ${new Date(r.inicio).toISOString().slice(0, 10)} a ${new Date(r.fim).toISOString().slice(0, 10)}`,
          valor: preco,
          origem_id: r.id,
        });
      }

      for (const m of modulos) {
        const preco = PRECO_MODULO_CENTAVOS[m.modulo];
        if (preco === undefined) {
          throw new Error(`Preço não configurado para o módulo: ${m.modulo}`);
        }
        itens.push({
          tipo: 'modulo',
          descricao: `Assinatura módulo ${m.modulo}`,
          valor: preco,
          origem_id: null,
        });
      }

      for (const consumo of consumos) {
        const valorItem = consumo.quantidade * consumo.valor_unitario;
        itens.push({
          tipo: 'consumo_material',
          descricao: `Consumo de ${consumo.nome} (${consumo.quantidade} un)`,
          valor: valorItem,
          origem_id: consumo.id,
        });
      }

      // --- Calcular total ---
      const valorTotal = itens.reduce((acc, i) => acc + i.valor, 0);

      // --- Inserir fatura ---
      const { rows: faturaRows } = await c.query<FaturaRow>(
        `INSERT INTO fatura (tenant_id, periodo_inicio, periodo_fim, status, valor_total)
         VALUES ($1, $2, $3, 'aberta', $4)
         RETURNING *`,
        [tenantId, inicio, fim, valorTotal],
      );
      const fatura = faturaRows[0];

      // --- Inserir itens ---
      const itensInseridos: FaturaItemRow[] = [];
      for (const item of itens) {
        const { rows } = await c.query<FaturaItemRow>(
          `INSERT INTO fatura_item (fatura_id, tipo, descricao, valor, origem_id)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [fatura.id, item.tipo, item.descricao, item.valor, item.origem_id],
        );
        itensInseridos.push(rows[0]);
      }

      return { ...fatura, itens: itensInseridos };
    });
  }

  async pagarFatura(faturaId: string): Promise<FaturaRow> {
    return this.db.withPlatform(async (c) => {
      const { rows, rowCount } = await c.query<FaturaRow>(
        `UPDATE fatura SET status = 'paga' WHERE id = $1 AND status = 'aberta' RETURNING *`,
        [faturaId],
      );
      if (rowCount === 0) {
        throw new NotFoundException(
          `Fatura não encontrada ou não está aberta: ${faturaId}`,
        );
      }
      return rows[0];
    });
  }

  async cancelarFatura(faturaId: string): Promise<FaturaRow> {
    return this.db.withPlatform(async (c) => {
      const { rows, rowCount } = await c.query<FaturaRow>(
        `UPDATE fatura SET status = 'cancelada' WHERE id = $1 AND status = 'aberta' RETURNING *`,
        [faturaId],
      );
      if (rowCount === 0) {
        throw new NotFoundException(
          `Fatura não encontrada ou não está aberta: ${faturaId}`,
        );
      }
      return rows[0];
    });
  }

  async obterFatura(faturaId: string): Promise<FaturaRow & { itens: FaturaItemRow[] }> {
    return this.db.withPlatform(async (c) => {
      const { rows: faturaRows } = await c.query<FaturaRow>(
        'SELECT * FROM fatura WHERE id = $1',
        [faturaId],
      );
      if (faturaRows.length === 0) {
        throw new NotFoundException(`Fatura não encontrada: ${faturaId}`);
      }
      const { rows: itensRows } = await c.query<FaturaItemRow>(
        'SELECT * FROM fatura_item WHERE fatura_id = $1 ORDER BY criado_em',
        [faturaId],
      );
      return { ...faturaRows[0], itens: itensRows };
    });
  }

  async listarPorTenant(tenantId: string): Promise<FaturaRow[]> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<FaturaRow>(
        'SELECT * FROM fatura WHERE tenant_id = $1 ORDER BY criado_em DESC',
        [tenantId],
      );
      return rows;
    });
  }

  async listarTodas(): Promise<FaturaRow[]> {
    return this.db.withPlatform(async (c) => {
      const { rows } = await c.query<FaturaRow>(
        'SELECT * FROM fatura ORDER BY criado_em DESC',
      );
      return rows;
    });
  }
}
