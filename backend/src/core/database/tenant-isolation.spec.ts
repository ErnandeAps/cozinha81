import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import { runMigrations } from './migration-runner';
import { DatabaseService } from './database.service';
import { runWithTenant } from './run-with-tenant';
import { MissingTenantContextError } from './tenant-context';

/**
 * Harness de isolamento multi-tenant (Story 1.2, AC-3/AC-5, NFR-1).
 *
 * Roda contra Postgres 18 REAL (RLS não existe em mock). O app conecta com um
 * papel não-superusuário (`cozinha_app`) — caso contrário a RLS forçada seria
 * ignorada. O seed é feito como admin (superuser), que legitimamente bypassa a
 * RLS para popular os dois tenants.
 */
jest.setTimeout(180_000);

const T1 = '018f4b1a-0000-7000-8000-0000000000a1';
const T2 = '018f4b1a-0000-7000-8000-0000000000a2';

describe('Isolamento multi-tenant via RLS (Story 1.2)', () => {
  let container: StartedPostgreSqlContainer;
  let adminPool: Pool;
  let appPool: Pool;
  let db: DatabaseService;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:18-alpine').start();

    adminPool = new Pool({ connectionString: container.getConnectionUri() });

    // Papel runtime do app: NÃO superusuário, NÃO bypassa RLS.
    await adminPool.query(`CREATE ROLE cozinha_app LOGIN PASSWORD 'app' NOSUPERUSER NOBYPASSRLS`);

    await runMigrations(adminPool);
    await adminPool.query('GRANT SELECT, INSERT, UPDATE, DELETE ON inquilino TO cozinha_app');

    // Seed dos dois tenants como admin (RLS legitimamente bypassada).
    await adminPool.query(
      `INSERT INTO inquilino (id, tenant_id, nome) VALUES ($1, $1, 'Tenant 1'), ($2, $2, 'Tenant 2')`,
      [T1, T2],
    );

    // Pool do app: papel não-privilegiado, max=1 força reuso da MESMA conexão
    // física entre tenants (prova de que o GUC não vaza — AC-3).
    appPool = new Pool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: 'cozinha_app',
      password: 'app',
      max: 1,
    });
    db = new DatabaseService(appPool);
  });

  afterAll(async () => {
    await appPool?.end();
    await adminPool?.end();
    await container?.stop();
  });

  it('AC-5: no contexto de T1, só linhas de T1 são visíveis (nunca T2)', async () => {
    const rows = await db.withTenant(T1, (c) =>
      c.query<{ tenant_id: string }>('SELECT tenant_id FROM inquilino').then((r) => r.rows),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].tenant_id).toBe(T1);
  });

  it('AC-5: escrita sem tenant context é recusada na aplicação e no banco', async () => {
    // Camada de aplicação: sem contexto ambiente, withAmbient recusa.
    await expect(
      db.withAmbient((c) => c.query('SELECT 1')),
    ).rejects.toBeInstanceOf(MissingTenantContextError);

    // Camada de banco: mesmo forçando uma transação sem app.tenant_id (platform
    // scope, que ainda não concede acesso na 1.2), a RLS bloqueia a escrita.
    await expect(
      db.withPlatform((c) =>
        c.query(`INSERT INTO inquilino (tenant_id, nome) VALUES ($1, 'intruso')`, [T2]),
      ),
    ).rejects.toThrow();
  });

  it('AC-3: conexão reusada entre tenants não vaza o GUC', async () => {
    const seenByT1 = await db.withTenant(T1, (c) =>
      c.query<{ tenant_id: string }>('SELECT tenant_id FROM inquilino').then((r) => r.rows.map((x) => x.tenant_id)),
    );
    const seenByT2 = await db.withTenant(T2, (c) =>
      c.query<{ tenant_id: string }>('SELECT tenant_id FROM inquilino').then((r) => r.rows.map((x) => x.tenant_id)),
    );

    expect(seenByT1).toEqual([T1]);
    expect(seenByT2).toEqual([T2]);

    // Após as transações, o próximo checkout da MESMA conexão tem o GUC resetado.
    const leaked = await db.withPlatform((c) =>
      c.query<{ v: string | null }>(`SELECT current_setting('app.tenant_id', true) AS v`).then((r) => r.rows[0].v),
    );
    expect(leaked === null || leaked === '').toBe(true);
  });

  it('AC-4: runWithTenant estabelece contexto para escrita de worker', async () => {
    const novoId = await runWithTenant(T1, () =>
      db.withAmbient((c) =>
        c
          .query<{ id: string }>(
            `INSERT INTO inquilino (tenant_id, nome) VALUES ($1, 'via-worker') RETURNING id`,
            [T1],
          )
          .then((r) => r.rows[0].id),
      ),
    );
    expect(novoId).toBeTruthy();

    // E a escrita é visível apenas no contexto de T1.
    const count = await db.withTenant(T1, (c) =>
      c.query<{ n: string }>(`SELECT count(*)::text AS n FROM inquilino WHERE nome = 'via-worker'`).then(
        (r) => Number(r.rows[0].n),
      ),
    );
    expect(count).toBe(1);
  });
});
