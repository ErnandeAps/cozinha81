import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pool } from 'pg';

/** Diretório canônico das migrations versionadas (arquivos `NNN_*.sql`). */
export const MIGRATIONS_DIR = join(__dirname, 'migrations');

/**
 * Runner de migrations mínimo, versionado e idempotente.
 *
 * - Aplica os arquivos `*.sql` em ordem lexicográfica (use prefixo numérico).
 * - Cada migration roda dentro de uma transação; falha => rollback e aborta.
 * - O que já foi aplicado é registrado em `schema_migrations` e nunca reexecuta.
 *
 * Deve rodar com um papel administrativo (dono do schema), não com o papel
 * runtime do app.
 *
 * @returns nomes dos arquivos aplicados nesta execução (vazio se já estava em dia).
 */
export async function runMigrations(pool: Pool, dir: string = MIGRATIONS_DIR): Promise<string[]> {
  const applied: string[] = [];
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version    text        PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const files = readdirSync(dir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rowCount } = await client.query('SELECT 1 FROM schema_migrations WHERE version = $1', [file]);
      if (rowCount && rowCount > 0) continue;

      const sql = readFileSync(join(dir, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    }
  } finally {
    client.release();
  }
  return applied;
}
