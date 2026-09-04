import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../core/auth/current-tenant.decorator';
import { Papeis } from '../../core/auth/papeis.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuloGuard } from '../../core/gating/modulo.guard';
import { RequerModulo } from '../../core/gating/requer-modulo.decorator';
import {
  type ModoBaixa,
  type ProducaoRow,
  ProducaoService,
  type RegistrarProducaoDto,
} from './producao.service';

/** Registro de Produção (Story 4.1) — gated pelo Módulo Gestão de cozinha. */
@Controller('portal/producoes')
@UseGuards(AuthGuard('jwt'), RolesGuard, ModuloGuard)
@RequerModulo('gestao_cozinha')
export class ProducaoController {
  constructor(private readonly producoes: ProducaoService) {}

  @Post()
  @Papeis('dono_admin', 'operador')
  registrar(@Body() dto: RegistrarProducaoDto, @CurrentTenant() tenantId: string): Promise<ProducaoRow> {
    return this.producoes.registrar(tenantId, dto);
  }

  @Get()
  @Papeis('dono_admin', 'operador')
  listar(@CurrentTenant() tenantId: string): Promise<ProducaoRow[]> {
    return this.producoes.listar(tenantId);
  }

  /** Produções "sem ficha" — sinal ao Dono/Admin para corrigir (4.2 AC#3). */
  @Get('sem-ficha')
  @Papeis('dono_admin')
  listarSemFicha(@CurrentTenant() tenantId: string): Promise<ProducaoRow[]> {
    return this.producoes.listarSemFicha(tenantId);
  }

  /** Modo de baixa do tenant (4.3) — configuração restrita ao Dono/Admin. */
  @Get('config')
  @Papeis('dono_admin')
  async obterConfig(@CurrentTenant() tenantId: string): Promise<{ modoBaixa: ModoBaixa }> {
    return { modoBaixa: await this.producoes.obterModoBaixa(tenantId) };
  }

  @Put('config')
  @Papeis('dono_admin')
  definirConfig(
    @Body() body: { modoBaixa: ModoBaixa },
    @CurrentTenant() tenantId: string,
  ): Promise<{ modoBaixa: ModoBaixa }> {
    return this.producoes.definirModoBaixa(tenantId, body?.modoBaixa);
  }

  /** Baixa explícita de uma Produção pendente (modo manual, 4.3 AC#2). */
  @Post(':id/baixa')
  @Papeis('dono_admin', 'operador')
  baixarManual(@Param('id') id: string, @CurrentTenant() tenantId: string): Promise<ProducaoRow> {
    return this.producoes.baixarManual(tenantId, id);
  }
}
