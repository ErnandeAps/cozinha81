import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';
import { buildPoolConfig } from './database.config';
import { DATABASE_POOL, DatabaseService } from './database.service';

/**
 * Módulo global de acesso a dados. Provê o `pg.Pool` (conexão runtime do app,
 * que deve ser um papel não-superusuário) e o `DatabaseService` tenant-aware.
 */
@Global()
@Module({
  providers: [
    {
      provide: DATABASE_POOL,
      useFactory: () => new Pool(buildPoolConfig()),
    },
    DatabaseService,
  ],
  exports: [DatabaseService, DATABASE_POOL],
})
export class DatabaseModule {}
