import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentTenant } from './current-tenant.decorator';
import { CurrentUser } from './current-user.decorator';
import type { AuthPrincipal, PapelInquilino } from './jwt-payload';
import { Papeis } from './papeis.decorator';
import { RolesGuard } from './roles.guard';
import { InquilinoAuthService } from './inquilino-auth.service';

interface LoginBody {
  email: string;
  senha: string;
}

/**
 * Porta de login do realm de Inquilino (`portal`/`kds`). Sem signup público
 * (AD-11): usuários entram por provisionamento (1.3) ou convite (1.5).
 */
@Controller('portal/auth')
export class InquilinoAuthController {
  constructor(private readonly auth: InquilinoAuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginBody) {
    if (!body?.email || !body?.senha) {
      throw new BadRequestException('email e senha são obrigatórios.');
    }
    return this.auth.login(body.email, body.senha);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Papeis('dono_admin', 'operador')
  me(@CurrentTenant() tenantId: string, @CurrentUser() user: AuthPrincipal) {
    const papel = user.papel;
    if (papel !== 'dono_admin' && papel !== 'operador') {
      throw new ForbiddenException('Papel sem permissão para esta operação.');
    }
    return this.auth.me(tenantId, papel as PapelInquilino);
  }
}
