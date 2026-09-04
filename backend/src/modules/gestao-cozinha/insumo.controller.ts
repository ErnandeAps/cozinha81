import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../core/auth/current-tenant.decorator';
import { Papeis } from '../../core/auth/papeis.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuloGuard } from '../../core/gating/modulo.guard';
import { RequerModulo } from '../../core/gating/requer-modulo.decorator';
import {
  type AlertaAtivoRow,
  type HistoricoPrecoRow,
  InsumoService,
  type InsumoRow,
  type MovimentoEstoqueRow,
} from './insumo.service';
import type { AtualizarInsumoDto, CriarInsumoDto, RegistrarEntradaDto, RegistrarPerdaDto } from './insumo.dto';

@Controller('portal/insumos')
@UseGuards(AuthGuard('jwt'), RolesGuard, ModuloGuard)
@RequerModulo('gestao_cozinha')
export class InsumoController {
  constructor(private readonly insumoService: InsumoService) {}

  @Post()
  @Papeis('dono_admin')
  criar(@Body() dto: CriarInsumoDto, @CurrentTenant() tenantId: string): Promise<InsumoRow> {
    return this.insumoService.criar(tenantId, dto);
  }

  @Get()
  @Papeis('dono_admin', 'operador')
  listar(@CurrentTenant() tenantId: string): Promise<InsumoRow[]> {
    return this.insumoService.listar(tenantId);
  }

  @Get(':id')
  @Papeis('dono_admin', 'operador')
  obterPorId(@Param('id') id: string, @CurrentTenant() tenantId: string): Promise<InsumoRow> {
    return this.insumoService.obterPorId(tenantId, id);
  }

  @Put(':id')
  @Papeis('dono_admin')
  atualizar(
    @Param('id') id: string,
    @Body() dto: AtualizarInsumoDto,
    @CurrentTenant() tenantId: string,
  ): Promise<InsumoRow> {
    return this.insumoService.atualizar(tenantId, id, dto);
  }

  @Delete(':id')
  @Papeis('dono_admin')
  remover(@Param('id') id: string, @CurrentTenant() tenantId: string): Promise<void> {
    return this.insumoService.remover(tenantId, id);
  }

  @Post('entradas')
  @Papeis('dono_admin')
  registrarEntrada(
    @Body() dto: RegistrarEntradaDto,
    @CurrentTenant() tenantId: string,
  ): Promise<MovimentoEstoqueRow> {
    return this.insumoService.registrarEntrada(tenantId, dto);
  }

  @Get(':id/precos')
  @Papeis('dono_admin', 'operador')
  obterHistoricoPrecos(
    @Param('id') id: string,
    @CurrentTenant() tenantId: string,
  ): Promise<HistoricoPrecoRow[]> {
    return this.insumoService.obterHistoricoPrecos(tenantId, id);
  }

  @Post(':id/perdas')
  @Papeis('dono_admin')
  registrarPerda(
    @Param('id') id: string,
    @Body() dto: RegistrarPerdaDto,
    @CurrentTenant() tenantId: string,
  ): Promise<MovimentoEstoqueRow> {
    return this.insumoService.registrarPerda(tenantId, id, dto);
  }

  @Get('alertas/ativos')
  @Papeis('dono_admin', 'operador')
  obterAlertasAtivos(@CurrentTenant() tenantId: string): Promise<AlertaAtivoRow[]> {
    return this.insumoService.obterAlertasAtivos(tenantId);
  }

  @Get(':id/converter')
  @Papeis('dono_admin', 'operador')
  async converter(
    @Param('id') id: string,
    @Query('quantidadeUso') quantidadeUsoRaw: string,
    @CurrentTenant() tenantId: string,
  ): Promise<{ quantidadeBase: number }> {
    const quantidadeUso = Number(quantidadeUsoRaw);
    if (!Number.isFinite(quantidadeUso) || quantidadeUso < 0) {
      throw new BadRequestException('quantidadeUso inválida.');
    }

    const insumo = await this.insumoService.obterPorId(tenantId, id);
    if (!insumo.fator_conversao) {
      throw new BadRequestException('Insumo sem fator de conversão configurado.');
    }

    return {
      quantidadeBase: this.insumoService.converterUsoParaBase(
        quantidadeUso,
        Number(insumo.fator_conversao),
      ),
    };
  }
}
