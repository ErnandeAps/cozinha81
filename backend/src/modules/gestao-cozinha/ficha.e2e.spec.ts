import { type INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../app/app.module';
import { GlobalExceptionFilter } from '../../core/filters/http-exception.filter';
import { jwtSecret } from '../../core/auth/auth.config';
import { DATABASE_POOL } from '../../core/database/database.service';
import type { JwtPayload } from '../../core/auth/jwt-payload';
import { type PgHarness, seedInquilino, seedUsuario, startPgHarness } from '../../testing/pg-harness';

jest.setTimeout(180_000);

/** E2E HTTP do épico 3 (Custeio + Fichas): gating, papéis e custo on-read. */
describe('Custeio + Fichas HTTP (épico 3 e2e)', () => {
  let h: PgHarness;
  let app: INestApplication;
  let jwt: JwtService;
  let tenantId: string;
  let donoToken: string;
  let operadorToken: string;
  let semModuloToken: string;

  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    h = await startPgHarness();
    jwt = new JwtService({ secret: jwtSecret() });

    tenantId = await seedInquilino(h, 'Alfa');
    await h.adminPool.query(
      `INSERT INTO modulo_flag (tenant_id, modulo, habilitado) VALUES ($1, 'gestao_cozinha', true)`,
      [tenantId],
    );
    const donoId = await seedUsuario(h, { tenantId, email: 'dono@alfa.com', senha: 'x', papel: 'dono_admin' });
    const opId = await seedUsuario(h, { tenantId, email: 'op@alfa.com', senha: 'x', papel: 'operador' });
    const semMod = await seedInquilino(h, 'Beta');
    const donoBeta = await seedUsuario(h, { tenantId: semMod, email: 'd@beta.com', senha: 'x', papel: 'dono_admin' });

    const sign = (p: JwtPayload) => jwt.sign(p);
    donoToken = sign({ sub: donoId, scope: 'tenant', tenantId, papel: 'dono_admin' });
    operadorToken = sign({ sub: opId, scope: 'tenant', tenantId, papel: 'operador' });
    semModuloToken = sign({ sub: donoBeta, scope: 'tenant', tenantId: semMod, papel: 'dono_admin' });

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DATABASE_POOL)
      .useValue(h.appPool)
      .compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api', { exclude: ['health', 'error-test'] });
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    await h?.adminPool.end();
    await h?.container.stop();
  });

  const srv = () => app.getHttpServer();

  it('gating: Custeio bloqueado para tenant sem o Módulo', async () => {
    await request(srv()).get('/api/portal/custeio').set(bearer(semModuloToken)).expect(403);
  });

  it('Custeio é restrito ao Dono/Admin (Operador negado)', async () => {
    await request(srv()).get('/api/portal/custeio').set(bearer(operadorToken)).expect(403);
  });

  it('fluxo: define custeio, cadastra insumo+entrada, cria Ficha e lê o custo on-read', async () => {
    await request(srv()).put('/api/portal/custeio').set(bearer(donoToken)).send({ metodo: 'ultimo_preco' }).expect(200);

    const ins = await request(srv())
      .post('/api/portal/insumos')
      .set(bearer(donoToken))
      .send({ nome: 'Tomate', unidade_base: 'kg' })
      .expect(201);
    await request(srv())
      .post('/api/portal/insumos/entradas')
      .set(bearer(donoToken))
      .send({ insumoId: ins.body.id, quantidade: 1, precoCentavos: 1000, causeKey: '019056d6-0000-7000-8000-0000000000e3' })
      .expect(201);

    const ficha = await request(srv())
      .post('/api/portal/fichas')
      .set(bearer(donoToken))
      .send({ nome: 'Molho', itens: [{ insumoId: ins.body.id, quantidade: 0.5 }] })
      .expect(201);

    const custo = await request(srv())
      .get(`/api/portal/fichas/${ficha.body.id}/custo`)
      .set(bearer(donoToken))
      .expect(200);
    expect(custo.body.custoPorcaoCentavos).toBe('500'); // 1000 * 0.5 / 1
  });

  it('Operador é negado no custo da Ficha (AC-6)', async () => {
    const lista = await request(srv()).get('/api/portal/fichas').set(bearer(operadorToken)).expect(200);
    expect(lista.body.length).toBeGreaterThanOrEqual(1); // vê a ficha
    await request(srv()).get(`/api/portal/fichas/${lista.body[0].id}/custo`).set(bearer(operadorToken)).expect(403);
  });
});
