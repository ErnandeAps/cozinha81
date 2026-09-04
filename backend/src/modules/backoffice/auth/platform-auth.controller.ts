import { BadRequestException, Body, Controller, HttpCode, Post } from '@nestjs/common';
import { PlatformAuthService } from './platform-auth.service';
import type { LoginDto } from './login.dto';

/**
 * Porta de autenticação do realm de plataforma (`backoffice`).
 * Apenas login — **não existe endpoint de signup público** (AD-11/FR-1).
 */
@Controller('backoffice/auth')
export class PlatformAuthController {
  constructor(private readonly auth: PlatformAuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    if (!body?.email || !body?.senha) {
      throw new BadRequestException('email e senha são obrigatórios.');
    }
    return this.auth.login(body.email, body.senha);
  }
}
