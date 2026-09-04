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

/** E2E HTTP do épico 4 (Produção): gating, papéis, baixa automática e manual. */
describe('Produção HTTP (épico 4 e2e)', () => {
  let h: PgHarness;
  let app: INestApplication;
  let tenantId: string;
  let donoToken: string;
  let operadorToken: string;
  let semModuloToken: string;
  let insumoId: string;
  let fichaId: string;

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
    insumoId = ins.body.id;
    await request(srv())
      .post('/api/portal/insumos/entradas')
      .set(bearer(donoToken))
      .send({ insumoId, quantidade: 10, precoCentavos: 1000, causeKey: '019056d6-0000-7000-8000-0000000000e4' })
      .expect(201);
    const ficha = await request(srv())
      .post('/api/portal/fichas')
      .set(bearer(donoToken))
      .send({ nome: 'Molho', itens: [{ insumoId, quantidade: 0.5 }] })
      .expect(201);
    fichaId = ficha.body.id;
  });

  afterAll(async () => {
    await app?.close();
    await h?.adminPool.end();
    await h?.container.stop();
  });

  async function saldo(): Promise<string> {
    const r = await request(srv()).get(`/api/portal/insumos/${insumoId}`).set(bearer(donoToken)).expect(200);
    return r.body.quantidade_atual;
  }

  it('gating: produção bloqueada para tenant sem o Módulo', async () => {
    await request(srv()).get('/api/portal/producoes').set(bearer(semModuloToken)).expect(403);
  });

  it('config de modo de baixa é restrita ao Dono/Admin (Operador negado)', async () => {
    await request(srv()).put('/api/portal/producoes/config').set(bearer(operadorToken)).send({ modoBaixa: 'manual' }).expect(403);
  });

  it('modo automático: Operador registra produção e o estoque baixa conforme a Ficha', async () => {
    await request(srv()).put('/api/portal/producoes/config').set(bearer(donoToken)).send({ modoBaixa: 'automatico' }).expect(200);
    const antes = Number(await saldo());

    const p = await request(srv())
      .post('/api/portal/producoes')
      .set(bearer(operadorToken))
      .send({ fichaId, quantidade: 2 }) // 0.5*2 = 1.0
      .expect(201);
    expect(p.body.status_baixa).toBe('baixado');
    expect(Number(await saldo())).toBe(antes - 1);
  });

  it('modo manual: registrar fica pendente; baixa explícita movimenta (idempotente)', async () => {
    await request(srv()).put('/api/portal/producoes/config').set(bearer(donoToken)).send({ modoBaixa: 'manual' }).expect(200);
    const antes = Number(await saldo());

    const p = await request(srv())
      .post('/api/portal/producoes')
      .set(bearer(operadorToken))
      .send({ fichaId, quantidade: 1 }) // 0.5 ao baixar
      .expect(201);
    expect(p.body.status_baixa).toBe('pendente');
    expect(Number(await saldo())).toBe(antes); // intacto

    await request(srv()).post(`/api/portal/producoes/${p.body.id}/baixa`).set(bearer(operadorToken)).expect(201);
    expect(Number(await saldo())).toBe(antes - 0.5);

    // reenvio da baixa não duplica
    await request(srv()).post(`/api/portal/producoes/${p.body.id}/baixa`).set(bearer(operadorToken)).expect(201);
    expect(Number(await saldo())).toBe(antes - 0.5);
  });

  it('produção sem ficha: sinal "sem-ficha" é restrito ao Dono/Admin', async () => {
    await request(srv()).post('/api/portal/producoes').set(bearer(operadorToken)).send({ quantidade: 3 }).expect(201);
    await request(srv()).get('/api/portal/producoes/sem-ficha').set(bearer(operadorToken)).expect(403);
    const sinal = await request(srv()).get('/api/portal/producoes/sem-ficha').set(bearer(donoToken)).expect(200);
    expect(sinal.body.length).toBeGreaterThanOrEqual(1);
  });
});
