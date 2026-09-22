import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../core/auth/current-user.decorator';
import type { AuthPrincipal } from '../../../core/auth/jwt-payload';
import { PresencaService, type PresencaRow } from './presenca.service';
import { RegistrarPresencaDto } from './presenca.dto';

@Controller('backoffice/presencas')
@UseGuards(AuthGuard('jwt'))
export class PresencaController {
  constructor(private readonly presencaService: PresencaService) {}

  @Post()
  registrar(
    @Body() body: RegistrarPresencaDto,
    @CurrentUser() user: AuthPrincipal
  ): Promise<PresencaRow> {
    const isPlatform = user.scope === 'platform';
    const tenantId = isPlatform ? (body.tenantId || null) : (user.tenantId || null);

    return this.presencaService.registrar(
      body.cozinhaId,
      tenantId,
      body.tipo,
      body.checklist,
      body.data
    );
  }

  @Get('cozinha/:cozinhaId')
  listarPorCozinha(
    @Param('cozinhaId') cozinhaId: string,
    @CurrentUser() user: AuthPrincipal
  ): Promise<PresencaRow[]> {
    const isPlatform = user.scope === 'platform';
    const tenantId = isPlatform ? undefined : user.tenantId;

    return this.presencaService.listarPorCozinha(cozinhaId, tenantId);
  }
}
