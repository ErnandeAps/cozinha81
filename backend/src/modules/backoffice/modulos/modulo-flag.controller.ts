import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { AuthPrincipal } from '../../../core/auth/jwt-payload';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { ModuloFlagService } from './modulo-flag.service';

/** Gestão de flags de Módulo por Inquilino — realm de plataforma (backoffice). */
@Controller('backoffice/inquilinos/:tenantId/modulos')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class ModuloFlagController {
  constructor(private readonly flags: ModuloFlagService) {}

  @Get()
  listar(@Param('tenantId') tenantId: string) {
    return this.flags.listar(tenantId);
  }

  @Patch(':modulo')
  definir(
    @Param('tenantId') tenantId: string,
    @Param('modulo') modulo: string,
    @Body() body: { habilitado: boolean },
    @CurrentUser() staff: AuthPrincipal,
  ) {
    return this.flags.definir(tenantId, modulo, body?.habilitado === true, staff.sub);
  }
}
