import type { PoolConfig } from 'pg';

/**
 * Monta a configuração do pool a partir do ambiente.
 *
 * Em produção o app DEVE conectar com um papel **não-superusuário** e **sem
 * BYPASSRLS** — caso contrário a RLS forçada não tem efeito (superuser ignora
 * RLS). Ver migrations/README e a Story 1.2 (AD-1).
 */
export function buildPoolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  if (env.DATABASE_URL) {
    return { connectionString: env.DATABASE_URL };
  }

  const config: PoolConfig = {
    host: env.PGHOST ?? 'localhost',
    port: env.PGPORT ? Number.parseInt(env.PGPORT, 10) : 5432,
    user: env.PGUSER ?? 'cozinha_app',
    database: env.PGDATABASE ?? 'cozinha81',
  };

  if (env.PGPASSWORD && env.PGPASSWORD.trim().length > 0) {
    config.password = env.PGPASSWORD;
  }

  return config;
}
