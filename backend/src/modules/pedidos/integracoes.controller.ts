import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IntegracoesService, IntegrationDto } from './integracoes.service';
import { Papeis } from '../../core/auth/papeis.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { CurrentTenant } from '../../core/auth/current-tenant.decorator';

/**
 * Tela Integrações (Story 7.2). AC#4: restrita ao Dono/Admin da Cozinha —
 * AuthGuard('jwt') popula o principal e RolesGuard + @Papeis('dono_admin')
 * barram o Operador.
 */
@Controller('integracoes')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Papeis('dono_admin')
export class IntegracoesController {
  constructor(private readonly integracoesService: IntegracoesService) {}

  @Get()
  async list(@CurrentTenant() tenantId: string): Promise<IntegrationDto[]> {
    return this.integracoesService.listIntegrations(tenantId);
  }

  @Post()
  async connect(
    @CurrentTenant() tenantId: string,
    @Body() body: { provider: string; storeId: string; credentialsRaw: string }
  ): Promise<{ success: boolean }> {
    await this.integracoesService.saveIntegration(tenantId, body.provider, body.storeId, body.credentialsRaw);
    return { success: true };
  }

  @Delete(':provider')
  async disconnect(
    @CurrentTenant() tenantId: string,
    @Param('provider') provider: string
  ): Promise<{ success: boolean }> {
    await this.integracoesService.deleteIntegration(tenantId, provider);
    return { success: true };
  }
}
