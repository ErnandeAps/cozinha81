import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { DatabaseService } from '../core/database/database.service';
import { runMigrations } from '../core/database/migration-runner';
import { hashPassword } from '../core/auth/password';

/**
 * Harness de integração contra Postgres 18 REAL (RLS não existe em mock).
 *
 * - `adminPool`: superusuário — roda migrations e seed (bypassa RLS legitimamente).
 * - `appPool`: papel runtime `cozinha_app` (NOSUPERUSER/NOBYPASSRLS), `max=1`
 *   para forçar reuso da mesma conexão física entre operações.
 * - `db`: `DatabaseService` sobre o `appPool`.
 */
export interface PgHarness {
  container: StartedPostgreSqlContainer;
  adminPool: Pool;
  appPool: Pool;
  db: DatabaseService;
  stop: () => Promise<void>;
}

export async function startPgHarness(): Promise<PgHarness> {
  const container = await new PostgreSqlContainer('postgres:18-alpine').start();
  const adminPool = new Pool({ connectionString: container.getConnectionUri() });

  await adminPool.query(`CREATE ROLE cozinha_app LOGIN PASSWORD 'app' NOSUPERUSER NOBYPASSRLS`);
  await runMigrations(adminPool);
  await adminPool.query('GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cozinha_app');
  await adminPool.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cozinha_app`,
  );
  // Sequences (ex.: pedido.numero serial → pedido_numero_seq) precisam de USAGE
  // para o papel runtime poder inserir. Espelha os grants exigidos em produção.
  await adminPool.query('GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO cozinha_app');
  await adminPool.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO cozinha_app`,
  );

  const appPool = new Pool({
    host: container.getHost(),
    port: container.getPort(),
    database: container.getDatabase(),
    user: 'cozinha_app',
    password: 'app',
    max: 1,
  });
  const db = new DatabaseService(appPool);

  return {
    container,
    adminPool,
    appPool,
    db,
    stop: async () => {
      await appPool.end();
      await adminPool.end();
      await container.stop();
    },
  };
}

/** Cria um staff de plataforma com senha (hash bcrypt). Retorna o id. */
export async function seedStaff(
  harness: PgHarness,
  email: string,
  senha: string,
  nome = 'Staff Cozinha81',
): Promise<string> {
  const senhaHash = await hashPassword(senha);
  const { rows } = await harness.adminPool.query<{ id: string }>(
    'INSERT INTO staff (email, nome, senha_hash) VALUES ($1, $2, $3) RETURNING id',
    [email, nome, senhaHash],
  );
  return rows[0].id;
}

/** Cria um Inquilino (tenant) mínimo. Retorna o tenantId (= id). */
export async function seedInquilino(harness: PgHarness, nome = 'Tenant'): Promise<string> {
  const { rows } = await harness.adminPool.query<{ id: string }>(
    'INSERT INTO inquilino (id, tenant_id, nome) VALUES (uuidv7(), uuidv7(), $1) RETURNING id',
    [nome],
  );
  // garante id == tenant_id (a linha É o tenant)
  const tenantId = rows[0].id;
  await harness.adminPool.query('UPDATE inquilino SET tenant_id = id WHERE id = $1', [tenantId]);
  return tenantId;
}

/** Cria um Usuário de Inquilino ativo, com senha. Retorna o id. */
export async function seedUsuario(
  harness: PgHarness,
  params: { tenantId: string; email: string; senha: string; papel: 'dono_admin' | 'operador'; nome?: string },
): Promise<string> {
  const senhaHash = await hashPassword(params.senha);
  const { rows } = await harness.adminPool.query<{ id: string }>(
    `INSERT INTO usuario (tenant_id, email, nome, papel, status, senha_hash)
     VALUES ($1, $2, $3, $4, 'ativo', $5) RETURNING id`,
    [params.tenantId, params.email, params.nome ?? params.email, params.papel, senhaHash],
  );
  return rows[0].id;
}
