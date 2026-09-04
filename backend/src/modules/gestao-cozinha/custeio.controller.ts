import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from '../../core/auth/current-tenant.decorator';
import { Papeis } from '../../core/auth/papeis.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ModuloGuard } from '../../core/gating/modulo.guard';
import { RequerModulo } from '../../core/gating/requer-modulo.decorator';
import { type CusteioConfig, CusteioService, type MetodoCusteio } from './custeio.service';

/** Configuração de Custeio — restrita ao Dono/Admin (AC-3). */
@Controller('portal/custeio')
@UseGuards(AuthGuard('jwt'), RolesGuard, ModuloGuard)
@RequerModulo('gestao_cozinha')
@Papeis('dono_admin')
export class CusteioController {
  constructor(private readonly custeio: CusteioService) {}

  /** `null` = não definido (frontend exige escolha no onboarding). */
  @Get()
  obter(@CurrentTenant() tenantId: string): Promise<CusteioConfig | null> {
    return this.custeio.obter(tenantId);
  }

  @Put()
  definir(@Body() body: { metodo: MetodoCusteio }, @CurrentTenant() tenantId: string): Promise<CusteioConfig> {
    return this.custeio.definir(tenantId, body?.metodo);
  }
}
