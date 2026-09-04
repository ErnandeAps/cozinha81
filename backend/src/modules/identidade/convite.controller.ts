import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import { CurrentTenant } from '../../core/auth/current-tenant.decorator';
import type { AuthPrincipal } from '../../core/auth/jwt-payload';
import { Papeis } from '../../core/auth/papeis.decorator';
import { RolesGuard } from '../../core/auth/roles.guard';
import { ConviteService } from './convite.service';
import type { AceitarConviteDto, ConvidarDto } from './convite.dto';

/** Gestão de usuários do Inquilino via convite (realm de Inquilino). */
@Controller('portal/usuarios/convites')
export class ConviteController {
  constructor(private readonly convite: ConviteService) {}

  /** Apenas Dono/Admin convida (AC-3, server-side). */
  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Papeis('dono_admin')
  convidar(
    @Body() body: ConvidarDto,
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: AuthPrincipal,
  ) {
    return this.convite.convidar(tenantId, user.sub, body);
  }

  /** Aceite público (o convidado ainda não tem credencial). */
  @Post('aceitar')
  @HttpCode(200)
  aceitar(@Body() body: AceitarConviteDto) {
    return this.convite.aceitar(body);
  }
}
