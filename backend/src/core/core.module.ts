import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { EncryptionService } from './security/encryption.service';
import { ModuloGuard } from './gating/modulo.guard';
import { TenantContextMiddleware } from './middleware/tenant-context.middleware';
import { CostRedactionInterceptor } from './serialization/cost-redaction.interceptor';

/**
 * Infraestrutura transversal do backend: acesso a dados multi-tenant (1.2),
 * identidade/JWT dos dois realms (1.3+), gating de Módulo e a camada única de
 * serialização por Papel (1.6), além do middleware de tenant context.
 */
@Module({
  imports: [DatabaseModule, AuthModule],
  providers: [
    EncryptionService,
    ModuloGuard,
    { provide: APP_INTERCEPTOR, useClass: CostRedactionInterceptor },
  ],
  exports: [DatabaseModule, AuthModule, ModuloGuard, EncryptionService],
})
export class CoreModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
