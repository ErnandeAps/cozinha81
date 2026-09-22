import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { AuthPrincipal } from '../../../core/auth/jwt-payload';
import { PlatformScopeGuard } from '../../../core/auth/platform-scope.guard';
import { ProvisioningService } from './provisioning.service';
import type { ProvisionarInquilinoDto } from './provisioning.dto';

/**
 * Endpoints de provisionamento — porta do `backoffice`, restrita ao realm de
 * plataforma. `AuthGuard('jwt')` autentica; `PlatformScopeGuard` exige
 * `scope=platform` (nega tokens de Inquilino — AC-5).
 */
@Controller('backoffice/inquilinos')
@UseGuards(AuthGuard('jwt'), PlatformScopeGuard)
export class ProvisioningController {
  constructor(private readonly provisioning: ProvisioningService) {}

  @Post()
  provisionar(@Body() body: ProvisionarInquilinoDto, @CurrentUser() staff: AuthPrincipal) {
    return this.provisioning.provisionar(body, staff.sub);
  }

  @Put(':id')
  atualizar(@Param('id') id: string, @Body() body: Partial<ProvisionarInquilinoDto>) {
    return this.provisioning.atualizar(id, body);
  }

  @Get()
  listar() {
    return this.provisioning.listar();
  }

  @Delete(':id')
  remover(@Param('id') id: string) {
    return this.provisioning.remover(id);
  }
}
