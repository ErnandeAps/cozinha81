import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformScopeGuard } from '../../core/auth/platform-scope.guard';
import {
  GestaoCentralGlpService,
  type ConfigurarCentralGlpDto,
  type FecharMesGlpDto,
  type RegistrarAbastecimentoGlpDto,
  type RegistrarLeituraMedidorGlpDto,
  type RegistrarPerdaAjusteGlpDto,
} from './gestao-central-glp.service';

type DtoComTenant<T> = T & { tenantId: string };

@Controller('backoffice/central-glp')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class GestaoCentralGlpBackofficeController {
  constructor(private readonly service: GestaoCentralGlpService) {}

  @Post('central')
  configurarCentral(@Body() dto: DtoComTenant<ConfigurarCentralGlpDto>) {
    return this.service.configurarCentral(dto.tenantId, dto);
  }

  @Get('central')
  obterCentral(@Query('tenantId') tenantId: string) {
    return this.service.obterCentral(tenantId);
  }

  @Post('abastecimentos')
  registrarAbastecimento(@Body() dto: DtoComTenant<RegistrarAbastecimentoGlpDto>) {
    return this.service.registrarAbastecimento(dto.tenantId, dto);
  }

  @Get('abastecimentos')
  listarAbastecimentos(@Query('tenantId') tenantId: string) {
    return this.service.listarAbastecimentos(tenantId);
  }

  @Delete('abastecimentos/:id')
  removerAbastecimento(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.removerAbastecimento(tenantId, id).then(() => ({ ok: true }));
  }

  @Post('leituras')
  registrarLeitura(@Body() dto: DtoComTenant<RegistrarLeituraMedidorGlpDto>) {
    return this.service.registrarLeitura(dto.tenantId, dto);
  }

  @Get('leituras')
  listarLeituras(@Query('tenantId') tenantId: string) {
    return this.service.listarLeituras(tenantId);
  }

  @Get('leituras/dashboard')
  listarLeiturasDashboard(
    @Query('tenantId') tenantId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.service.listarLeiturasDashboard(tenantId, dataInicio, dataFim);
  }

  @Delete('leituras/:id')
  removerLeitura(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.removerLeitura(tenantId, id).then(() => ({ ok: true }));
  }

  @Post('perdas')
  registrarPerda(@Body() dto: DtoComTenant<RegistrarPerdaAjusteGlpDto>) {
    return this.service.registrarPerda(dto.tenantId, dto);
  }

  @Get('perdas')
  listarPerdas(@Query('tenantId') tenantId: string) {
    return this.service.listarPerdas(tenantId);
  }

  @Post('fechamento')
  fecharMes(@Body() dto: DtoComTenant<FecharMesGlpDto>) {
    return this.service.fecharMes(dto.tenantId, dto);
  }

  @Get('fechamento')
  listarFechamentos(@Query('tenantId') tenantId?: string) {
    return this.service.listarFechamentos(tenantId);
  }

  @Get('fechamento/:id/leituras')
  listarLeiturasDoFechamento(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.listarLeiturasDoFechamento(tenantId, id);
  }

  @Delete('fechamento/:id')
  removerFechamento(@Query('tenantId') tenantId: string, @Param('id') id: string) {
    return this.service.removerFechamento(tenantId, id).then(() => ({ ok: true }));
  }

  @Get('dashboard')
  dashboard() {
    return this.service.dashboardCompartilhado();
  }
}