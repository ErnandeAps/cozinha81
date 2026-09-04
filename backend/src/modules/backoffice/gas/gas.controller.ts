import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { GasLeituraService, type DashboardLeituraGasRow, type LeituraGasRow, type RegistrarLeituraGasDto } from './gas.service';

@Controller('backoffice/gas')
@UseGuards(AuthGuard('jwt'))
export class GasController {
  constructor(private readonly gasService: GasLeituraService) {}

  @Post('leituras')
  registrar(@Body() body: RegistrarLeituraGasDto): Promise<LeituraGasRow> {
    return this.gasService.registrar(body);
  }

  @Delete('tenant/:tenantId/:id')
  remover(@Param('tenantId') tenantId: string, @Param('id') id: string): Promise<{ ok: true }> {
    return this.gasService.remover(tenantId, id).then(() => ({ ok: true }));
  }

  @Get('tenant/:tenantId')
  listarPorTenant(@Param('tenantId') tenantId: string): Promise<LeituraGasRow[]> {
    return this.gasService.listarPorTenant(tenantId);
  }

  @Get('dashboard')
  @UseGuards(PlatformScopeGuard)
  listarDashboard(
    @Query('tenantId') tenantId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ): Promise<DashboardLeituraGasRow[]> {
    return this.gasService.listarDashboard(tenantId, dataInicio, dataFim);
  }

  @Get()
  @UseGuards(PlatformScopeGuard)
  listarTodos(): Promise<LeituraGasRow[]> {
    return this.gasService.listarTodos();
  }
}
