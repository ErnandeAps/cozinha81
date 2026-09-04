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

/** E2E HTTP do épico 5 (CMV): privacidade (Operador 403), gating e fluxo completo. */
describe('CMV HTTP (épico 5 e2e)', () => {
  let h: PgHarness;
  let app: INestApplication;
  let tenantId: string;
  let donoToken: string;
  let operadorToken: string;
  let semModuloToken: string;
  let fichaId: string;
  const competencia = new Date().toISOString().slice(0, 7);

  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });
  const srv = () => app.getHttpServer();

  beforeAll(async () => {
    h = await startPgHarness();
    const jwt = new JwtService({ secret: jwtSecret() });

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

    await request(srv()).put('/api/portal/custeio').set(bearer(donoToken)).send({ metodo: 'ultimo_preco' }).expect(200);
    const ins = await request(srv())
      .post('/api/portal/insumos')
      .set(bearer(donoToken))
      .send({ nome: 'Tomate', unidade_base: 'kg' })
      .expect(201);
    await request(srv())
      .post('/api/portal/insumos/entradas')
      .set(bearer(donoToken))
      .send({ insumoId: ins.body.id, quantidade: 5, precoCentavos: 1000, causeKey: '019056d6-0000-7000-8000-0000000005e1' })
      .expect(201);
    const ficha = await request(srv())
      .post('/api/portal/fichas')
      .set(bearer(donoToken))
      .send({ nome: 'Molho', itens: [{ insumoId: ins.body.id, quantidade: 0.5 }] })
      .expect(201);
    fichaId = ficha.body.id;
    // produção em modo auto → baixa 1.0 base (CMV valor = 1.0 * 1000 / 5 = 200).
    await request(srv())
      .post('/api/portal/producoes')
      .set(bearer(donoToken))
      .send({ fichaId, quantidade: 2, causeKey: '019056d6-0000-7000-8000-0000000005e2' })
      .expect(201);
  });

  afterAll(async () => {
    await app?.close();
    await h?.adminPool.end();
    await h?.container.stop();
  });

  it('gating: CMV bloqueado para tenant sem o Módulo', async () => {
    await request(srv()).get(`/api/portal/cmv/periodo?competencia=${competencia}`).set(bearer(semModuloToken)).expect(403);
  });

  it('privacidade (NFR-3): Operador é negado em TODOS os endpoints de CMV', async () => {
    await request(srv()).get(`/api/portal/cmv/fichas/${fichaId}/unitario`).set(bearer(operadorToken)).expect(403);
    await request(srv()).get(`/api/portal/cmv/periodo?competencia=${competencia}`).set(bearer(operadorToken)).expect(403);
    await request(srv()).put('/api/portal/cmv/faturamento').set(bearer(operadorToken)).send({ competencia, valorCentavos: 1000 }).expect(403);
  });

  it('5.1: CMV unitário (Dono) bate com o custo/porção da Ficha', async () => {
    const cmv = await request(srv()).get(`/api/portal/cmv/fichas/${fichaId}/unitario`).set(bearer(donoToken)).expect(200);
    const custo = await request(srv()).get(`/api/portal/fichas/${fichaId}/custo`).set(bearer(donoToken)).expect(200);
    expect(cmv.body.cmvUnitarioCentavos).toBe(custo.body.custoPorcaoCentavos);
  });

  it('5.2/5.3: período consolida CMV em valor e calcula o CMV% sobre faturamento bruto', async () => {
    await request(srv()).put('/api/portal/cmv/faturamento').set(bearer(donoToken)).send({ competencia, valorCentavos: 1000 }).expect(200);
    const r = await request(srv()).get(`/api/portal/cmv/periodo?competencia=${competencia}`).set(bearer(donoToken)).expect(200);
    expect(r.body.cmvValorCentavos).toBe('200');
    expect(r.body.faturamentoCentavos).toBe('1000');
    expect(r.body.cmvPercentual).toBe('20.00'); // 200 / 1000
  });
});
