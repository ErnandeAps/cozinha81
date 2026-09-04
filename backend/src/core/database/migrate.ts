import { Pool } from 'pg';
import { buildPoolConfig } from './database.config';
import { runMigrations } from './migration-runner';

/**
 * Entrypoint operável das migrations (dev/prod/CI).
 *
 * Conecta com um papel **administrativo** (dono do schema) — em geral via
 * `DATABASE_URL` apontando para o usuário admin, NÃO para o papel runtime do
 * app. Roda os `.sql` pendentes e encerra.
 *
 *   nx run backend:migrate
 *   DATABASE_URL=postgres://admin:***@host:5432/cozinha81 node dist/backend/migrate.js
 */
async function main(): Promise<void> {
  const pool = new Pool(buildPoolConfig());
  try {
    const applied = await runMigrations(pool);
    if (applied.length === 0) {
      console.log('[migrate] schema já está em dia — nada a aplicar.');
    } else {
      console.log(`[migrate] aplicadas ${applied.length} migration(s): ${applied.join(', ')}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[migrate] falhou:', err);
  process.exit(1);
});
