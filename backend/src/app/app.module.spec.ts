import { Test } from '@nestjs/testing';
import { AppModule } from './app.module';
import { DATABASE_POOL } from '../core/database/database.service';

/**
 * Smoke de DI: garante que o grafo de injeção do AppModule resolve por inteiro
 * (controllers, guards, dois interceptors globais, JwtModule, DatabaseModule).
 * Não conecta ao banco — o Pool é lazy. Pega regressões de wiring sem e2e.
 */
describe('AppModule (DI smoke)', () => {
  it('compila o grafo de dependências completo', async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    expect(moduleRef.get(DATABASE_POOL, { strict: false })).toBeDefined();
    await moduleRef.close();
  });
});
