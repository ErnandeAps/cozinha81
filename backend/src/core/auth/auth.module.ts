import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JWT_EXPIRES_IN, jwtSecret } from './auth.config';
import { InquilinoAuthController } from './inquilino-auth.controller';
import { InquilinoAuthService } from './inquilino-auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PlatformScopeGuard } from './platform-scope.guard';
import { RolesGuard } from './roles.guard';
import { TenantContextInterceptor } from './tenant-context.interceptor';

/**
 * Infra de identidade compartilhada pelos dois realms (AD-11). Exporta o
 * `JwtService` (assinatura de tokens), registra a estratégia JWT do Passport,
 * o login do realm de Inquilino e o interceptor global que resolve o tenant
 * context a partir do principal autenticado (Story 1.4).
 */
@Global()
@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: jwtSecret(),
      signOptions: { expiresIn: JWT_EXPIRES_IN },
    }),
  ],
  controllers: [InquilinoAuthController],
  providers: [
    JwtStrategy,
    PlatformScopeGuard,
    RolesGuard,
    InquilinoAuthService,
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
  ],
  exports: [JwtModule, PassportModule, PlatformScopeGuard, RolesGuard, InquilinoAuthService],
})
export class AuthModule {}
