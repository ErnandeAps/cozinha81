import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../../core/database/database.service';
import type { SalvarCentroCustoDto } from './centro-custo.controller';

function toCentavos(valor: number | string | null | undefined): number {
  const numero = Number(valor ?? 0);
  if (!Number.isFinite(numero)) {
    return 0;
  }

  return Math.round(numero * 100);
}

@Injectable()
export class CentroCustoService {
  constructor(private readonly db: DatabaseService) {}

  async obterPorCozinha(cozinhaId: string): Promise<Record<string, unknown>> {
    return this.db.withPlatform(async (client) => {
      const { rows } = await client.query(
        `SELECT *
         FROM centro_custo
         WHERE cozinha_id = $1
         ORDER BY atualizado_em DESC
         LIMIT 1`,
        [cozinhaId],
      );

      if (rows.length === 0) {
        throw new NotFoundException(`Nenhum centro de custo encontrado para cozinha ${cozinhaId}.`);
      }

      return rows[0];
    });
  }

  async salvarPorCozinha(cozinhaId: string, dto: SalvarCentroCustoDto): Promise<Record<string, unknown>> {
    return this.db.withPlatform(async (client) => {
      const equipamentosDetalhesNormalizados = (dto.equipamentosDetalhes ?? []).map((item) => ({
        ...item,
        valor: toCentavos(item.valor),
      }));

      const payload = {
        cozinha_id: cozinhaId,
        nome_cozinha: dto.nomeCozinha ?? '',
        investimento_inicial: toCentavos(dto.investimentoInicial),
        prazo_contrato_meses: Number(dto.prazoContratoMeses ?? 0),
        custos_fixos_mensais: toCentavos(dto.custosFixosMensais),
        roi_desejado: Number(dto.roiDesejado ?? 0),
        reserva_manutencao: toCentavos(dto.reservaManutencao),
        aluguel_mensal: toCentavos(dto.aluguelMensal),
        margem: Number(dto.margem ?? 0),
        taxa_administracao: toCentavos(dto.taxaAdministracao),
        area_m2: Number(dto.areaM2 ?? 0),
        equipamentos: toCentavos(dto.equipamentos),
        servicos: toCentavos(dto.servicos),
        condominio: toCentavos(dto.condominio),
        seguranca: toCentavos(dto.seguranca),
        manutencao: toCentavos(dto.manutencao),
        outros: toCentavos(dto.outros),
        equipamentos_detalhes: JSON.stringify(equipamentosDetalhesNormalizados),
      };

      const { rows } = await client.query(
        `INSERT INTO centro_custo (
          cozinha_id,
          nome_cozinha,
          investimento_inicial,
          prazo_contrato_meses,
          custos_fixos_mensais,
          roi_desejado,
          reserva_manutencao,
          aluguel_mensal,
          margem,
          taxa_administracao,
          area_m2,
          equipamentos,
          servicos,
          condominio,
          seguranca,
          manutencao,
          outros,
          equipamentos_detalhes
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18
        )
        ON CONFLICT (cozinha_id)
        DO UPDATE SET
          nome_cozinha = EXCLUDED.nome_cozinha,
          investimento_inicial = EXCLUDED.investimento_inicial,
          prazo_contrato_meses = EXCLUDED.prazo_contrato_meses,
          custos_fixos_mensais = EXCLUDED.custos_fixos_mensais,
          roi_desejado = EXCLUDED.roi_desejado,
          reserva_manutencao = EXCLUDED.reserva_manutencao,
          aluguel_mensal = EXCLUDED.aluguel_mensal,
          margem = EXCLUDED.margem,
          taxa_administracao = EXCLUDED.taxa_administracao,
          area_m2 = EXCLUDED.area_m2,
          equipamentos = EXCLUDED.equipamentos,
          servicos = EXCLUDED.servicos,
          condominio = EXCLUDED.condominio,
          seguranca = EXCLUDED.seguranca,
          manutencao = EXCLUDED.manutencao,
          outros = EXCLUDED.outros,
          equipamentos_detalhes = EXCLUDED.equipamentos_detalhes,
          atualizado_em = now()
        RETURNING *`,
        [
          payload.cozinha_id,
          payload.nome_cozinha,
          payload.investimento_inicial,
          payload.prazo_contrato_meses,
          payload.custos_fixos_mensais,
          payload.roi_desejado,
          payload.reserva_manutencao,
          payload.aluguel_mensal,
          payload.margem,
          payload.taxa_administracao,
          payload.area_m2,
          payload.equipamentos,
          payload.servicos,
          payload.condominio,
          payload.seguranca,
          payload.manutencao,
          payload.outros,
          payload.equipamentos_detalhes,
        ],
      );

      return rows[0];
    });
  }
}
