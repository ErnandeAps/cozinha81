import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../core/auth/current-tenant.decorator';
import { Papeis } from '../../core/auth/papeis.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuloGuard } from '../../core/gating/modulo.guard';
import { RequerModulo } from '../../core/gating/requer-modulo.decorator';
import {
  GestaoCentralGlpService,
  type AbastecimentoGlp,
  type CentralGlpConfig,
  type ConfigurarCentralGlpDto,
  type DashboardGlpResumo,
  type FechamentoMensalGlp,
  type FecharMesGlpDto,
  type LeituraMedidorGlp,
  type PerdaAjusteGlp,
  type RegistrarAbastecimentoGlpDto,
  type RegistrarLeituraMedidorGlpDto,
  type RegistrarPerdaAjusteGlpDto,
} from './gestao-central-glp.service';

@Controller('portal/gestao-central-glp')
@UseGuards(AuthGuard('jwt'), RolesGuard, ModuloGuard)
@RequerModulo('gestao_cozinha')
export class GestaoCentralGlpController {
  constructor(private readonly service: GestaoCentralGlpService) {}

  @Post('central')
  @Papeis('dono_admin')
  configurarCentral(@Body() dto: ConfigurarCentralGlpDto, @CurrentTenant() tenantId: string): Promise<CentralGlpConfig> {
    return this.service.configurarCentral(tenantId, dto);
  }

  @Get('central')
  @Papeis('dono_admin', 'operador')
  obterCentral(@CurrentTenant() tenantId: string): Promise<CentralGlpConfig | null> {
    return this.service.obterCentral(tenantId);
  }

  @Post('abastecimentos')
  @Papeis('dono_admin')
  registrarAbastecimento(@Body() dto: RegistrarAbastecimentoGlpDto, @CurrentTenant() tenantId: string): Promise<AbastecimentoGlp> {
    return this.service.registrarAbastecimento(tenantId, dto);
  }

  @Get('abastecimentos')
  @Papeis('dono_admin', 'operador')
  listarAbastecimentos(@CurrentTenant() tenantId: string): Promise<AbastecimentoGlp[]> {
    return this.service.listarAbastecimentos(tenantId);
  }

  @Post('leituras')
  @Papeis('dono_admin')
  registrarLeitura(@Body() dto: RegistrarLeituraMedidorGlpDto, @CurrentTenant() tenantId: string): Promise<LeituraMedidorGlp> {
    return this.service.registrarLeitura(tenantId, dto);
  }

  @Get('leituras')
  @Papeis('dono_admin', 'operador')
  listarLeituras(@CurrentTenant() tenantId: string): Promise<LeituraMedidorGlp[]> {
    return this.service.listarLeituras(tenantId);
  }

  @Post('perdas')
  @Papeis('dono_admin')
  registrarPerda(@Body() dto: RegistrarPerdaAjusteGlpDto, @CurrentTenant() tenantId: string): Promise<PerdaAjusteGlp> {
    return this.service.registrarPerda(tenantId, dto);
  }

  @Get('perdas')
  @Papeis('dono_admin', 'operador')
  listarPerdas(@CurrentTenant() tenantId: string): Promise<PerdaAjusteGlp[]> {
    return this.service.listarPerdas(tenantId);
  }

  @Post('fechamento')
  @Papeis('dono_admin')
  fecharMes(@Body() dto: FecharMesGlpDto, @CurrentTenant() tenantId: string): Promise<FechamentoMensalGlp> {
    return this.service.fecharMes(tenantId, dto);
  }

  @Get('fechamento')
  @Papeis('dono_admin', 'operador')
  listarFechamentos(@CurrentTenant() tenantId: string): Promise<FechamentoMensalGlp[]> {
    return this.service.listarFechamentos(tenantId);
  }

  @Get('dashboard')
  @Papeis('dono_admin', 'operador')
  dashboard(@CurrentTenant() tenantId: string): Promise<DashboardGlpResumo> {
    return this.service.dashboard(tenantId);
  }
}
