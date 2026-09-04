import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../core/auth/current-tenant.decorator';
import { Papeis } from '../../core/auth/papeis.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuloGuard } from '../../core/gating/modulo.guard';
import { RequerModulo } from '../../core/gating/requer-modulo.decorator';
import { type CmvUnitario, type CmvValorPeriodo, CmvService } from './cmv.service';

/**
 * Painel CMV (Épico 5) — TODO restrito ao Dono/Admin (FR-3/NFR-3, AD-4).
 * O Operador recebe 403 e a seção CMV não aparece no menu dele (frontend).
 */
@Controller('portal/cmv')
@UseGuards(AuthGuard('jwt'), RolesGuard, ModuloGuard)
@RequerModulo('gestao_cozinha')
@Papeis('dono_admin')
export class CmvController {
  constructor(private readonly cmv: CmvService) {}

  /** CMV unitário da Ficha (Story 5.1) = custo da porção on-read (3.2). */
  @Get('fichas/:id/unitario')
  unitario(
    @Param('id') id: string,
    @Query('asOf') asOf: string | undefined,
    @CurrentTenant() tenantId: string,
  ): Promise<CmvUnitario> {
    return this.cmv.unitario(tenantId, id, asOf);
  }

  /** CMV em valor + CMV% do período (Stories 5.2/5.3) — competência `YYYY-MM`. */
  @Get('periodo')
  valorPeriodo(
    @Query('competencia') competencia: string,
    @CurrentTenant() tenantId: string,
  ): Promise<CmvValorPeriodo> {
    return this.cmv.valorPeriodo(tenantId, competencia);
  }

  /** Faturamento BRUTO manual do período (Story 5.3) — base do CMV%. */
  @Put('faturamento')
  definirFaturamento(
    @Body() body: { competencia: string; valorCentavos: number },
    @CurrentTenant() tenantId: string,
  ) {
    return this.cmv.definirFaturamentoManual(tenantId, body?.competencia, body?.valorCentavos);
  }
}
