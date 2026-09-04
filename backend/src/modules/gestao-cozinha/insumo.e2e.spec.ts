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

/**
 * E2E HTTP do módulo de estoque (Épico 2): boota o AppModule real contra
 * Postgres 18, apontando o pool para o container. Exercita a CAMADA HTTP —
 * gating de Módulo, papéis, redação de custo e o endpoint de conversão.
 */
describe('Insumo HTTP (Épico 2 e2e)', () => {
  let h: PgHarness;
  let app: INestApplication;
  let jwt: JwtService;
  let tenantId: string;
  let tenantSemModulo: string;
  let donoToken: string;
  let operadorToken: string;
  let donoSemModuloToken: string;

  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const sign = (p: JwtPayload) => jwt.sign(p);

  beforeAll(async () => {
    h = await startPgHarness();
    jwt = new JwtService({ secret: jwtSecret() });

    // Tenant COM o módulo habilitado.
    tenantId = await seedInquilino(h, 'Restaurante Alfa');
    await h.adminPool.query(
      `INSERT INTO modulo_flag (tenant_id, modulo, habilitado) VALUES ($1, 'gestao_cozinha', true)`,
      [tenantId],
    );
    const donoId = await seedUsuario(h, { tenantId, email: 'dono@alfa.com', senha: 'x', papel: 'dono_admin' });
    const opId = await seedUsuario(h, { tenantId, email: 'op@alfa.com', senha: 'x', papel: 'operador' });

    // Tenant SEM o módulo (gating deve barrar).
    tenantSemModulo = await seedInquilino(h, 'Restaurante Beta');
    const donoBetaId = await seedUsuario(h, {
      tenantId: tenantSemModulo,
      email: 'dono@beta.com',
      senha: 'x',
      papel: 'dono_admin',
    });

    donoToken = sign({ sub: donoId, scope: 'tenant', tenantId, papel: 'dono_admin' });
    operadorToken = sign({ sub: opId, scope: 'tenant', tenantId, papel: 'operador' });
    donoSemModuloToken = sign({ sub: donoBetaId, scope: 'tenant', tenantId: tenantSemModulo, papel: 'dono_admin' });

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
    // app.close() encerra o pool (onModuleDestroy do DatabaseService) — não dar stop duplo nele.
    await h?.adminPool.end();
    await h?.container.stop();
  });

  it('exige autenticação', async () => {
    await request(app.getHttpServer()).get('/api/portal/insumos').expect(401);
  });

  it('gating: tenant sem o Módulo recebe 403 com sinal de upsell', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/portal/insumos')
      .set(bearer(donoSemModuloToken))
      .expect(403);
    expect(res.body.code).toBe('MODULO_NAO_HABILITADO');
    expect(res.body.details.upsell).toBe(true);
  });

  it('papéis: Operador não pode cadastrar insumo (403)', async () => {
    await request(app.getHttpServer())
      .post('/api/portal/insumos')
      .set(bearer(operadorToken))
      .send({ nome: 'Proibido', unidade_base: 'kg' })
      .expect(403);
  });

  it('Dono cadastra, lista, registra entrada e converte', async () => {
    const criado = await request(app.getHttpServer())
      .post('/api/portal/insumos')
      .set(bearer(donoToken))
      .send({ nome: 'Tomate', unidade_base: 'kg', fator_conversao: 1000, unidade_uso: 'g' })
      .expect(201);
    const insumoId = criado.body.id;
    expect(insumoId).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/portal/insumos/entradas')
      .set(bearer(donoToken))
      .send({ insumoId, quantidade: 2, precoCentavos: 1550, causeKey: '019056d6-f28a-7d22-bd55-a2283ea4f001' })
      .expect(201);

    const lista = await request(app.getHttpServer()).get('/api/portal/insumos').set(bearer(donoToken)).expect(200);
    const tomate = lista.body.find((i: { id: string }) => i.id === insumoId);
    expect(tomate.quantidade_atual).toBe('2');

    // Endpoint de conversão (bug corrigido: lê query param).
    const conv = await request(app.getHttpServer())
      .get(`/api/portal/insumos/${insumoId}/converter`)
      .query({ quantidadeUso: 180 })
      .set(bearer(donoToken))
      .expect(200);
    expect(conv.body.quantidadeBase).toBe(0.18);
  });

  it('redação de custo: Operador não recebe preco_centavos no histórico', async () => {
    const criado = await request(app.getHttpServer())
      .post('/api/portal/insumos')
      .set(bearer(donoToken))
      .send({ nome: 'Cebola', unidade_base: 'kg' })
      .expect(201);
    const insumoId = criado.body.id;

    await request(app.getHttpServer())
      .post('/api/portal/insumos/entradas')
      .set(bearer(donoToken))
      .send({ insumoId, quantidade: 1, precoCentavos: 800, causeKey: '019056d6-f28a-7d22-bd55-a2283ea4f002' })
      .expect(201);

    const comoDono = await request(app.getHttpServer())
      .get(`/api/portal/insumos/${insumoId}/precos`)
      .set(bearer(donoToken))
      .expect(200);
    expect(comoDono.body[0].preco_centavos).toBe('800');

    const comoOperador = await request(app.getHttpServer())
      .get(`/api/portal/insumos/${insumoId}/precos`)
      .set(bearer(operadorToken))
      .expect(200);
    expect(comoOperador.body[0].preco_centavos).toBeUndefined();
    expect(comoOperador.body[0].quantidade).toBe('1'); // campo não-custo permanece
  });
});
