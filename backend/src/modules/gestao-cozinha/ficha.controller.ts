import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../core/auth/current-tenant.decorator';
import { Papeis } from '../../core/auth/papeis.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuloGuard } from '../../core/gating/modulo.guard';
import { RequerModulo } from '../../core/gating/requer-modulo.decorator';
import {
  type CriarFichaDto,
  type CustoFicha,
  type FichaComItens,
  type FichaItemInput,
  FichaService,
} from './ficha.service';

@Controller('portal/fichas')
@UseGuards(AuthGuard('jwt'), RolesGuard, ModuloGuard)
@RequerModulo('gestao_cozinha')
export class FichaController {
  constructor(private readonly fichas: FichaService) {}

  @Post()
  @Papeis('dono_admin')
  criar(@Body() dto: CriarFichaDto, @CurrentTenant() tenantId: string): Promise<FichaComItens> {
    return this.fichas.criar(tenantId, dto);
  }

  @Get()
  @Papeis('dono_admin', 'operador')
  listar(@CurrentTenant() tenantId: string) {
    return this.fichas.listar(tenantId);
  }

  @Get(':id')
  @Papeis('dono_admin', 'operador')
  obter(@Param('id') id: string, @CurrentTenant() tenantId: string): Promise<FichaComItens> {
    return this.fichas.obter(tenantId, id);
  }

  /** Custo on-read — dado de custo, restrito ao Dono/Admin (AC-6). */
  @Get(':id/custo')
  @Papeis('dono_admin')
  custo(
    @Param('id') id: string,
    @Query('asOf') asOf: string | undefined,
    @CurrentTenant() tenantId: string,
  ): Promise<CustoFicha> {
    return this.fichas.calcularCusto(tenantId, id, asOf);
  }

  /** Adiciona item (insumo ou sub-ficha) a uma Ficha — valida árvore (Story 3.3). */
  @Post(':id/itens')
  @Papeis('dono_admin')
  adicionarItem(
    @Param('id') id: string,
    @Body() item: FichaItemInput,
    @CurrentTenant() tenantId: string,
  ): Promise<FichaComItens> {
    return this.fichas.adicionarItem(tenantId, id, item);
  }

  @Delete(':id')
  @Papeis('dono_admin')
  remover(@Param('id') id: string, @CurrentTenant() tenantId: string): Promise<void> {
    return this.fichas.remover(tenantId, id);
  }
}
