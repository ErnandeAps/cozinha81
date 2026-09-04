import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWT_EXPIRES_IN, jwtSecret } from './auth.config';
import { InquilinoAuthService } from './inquilino-auth.service';
import type { JwtPayload } from './jwt-payload';
import { type PgHarness, seedInquilino, seedUsuario, startPgHarness } from '../../testing/pg-harness';

jest.setTimeout(180_000);

describe('Login do realm de Inquilino (Story 1.4)', () => {
  let h: PgHarness;
  let jwt: JwtService;
  let auth: InquilinoAuthService;
  let tenantId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    jwt = new JwtService({ secret: jwtSecret(), signOptions: { expiresIn: JWT_EXPIRES_IN } });
    auth = new InquilinoAuthService(h.db, jwt);

    tenantId = await seedInquilino(h, 'Restaurante Alfa');
    await seedUsuario(h, { tenantId, email: 'dono@alfa.com', senha: 'senha-dono', papel: 'dono_admin' });
    await seedUsuario(h, { tenantId, email: 'op@alfa.com', senha: 'senha-op', papel: 'operador' });
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('AC-1 — Dono/Admin loga e recebe token com (tenant_id, role)', async () => {
    const { accessToken, usuario } = await auth.login('dono@alfa.com', 'senha-dono');
    const payload = await jwt.verifyAsync<JwtPayload>(accessToken);

    expect(payload.scope).toBe('tenant');
    expect(payload.tenantId).toBe(tenantId);
    expect(payload.papel).toBe('dono_admin');
    expect(usuario).toMatchObject({ papel: 'dono_admin', tenantId });
  });

  it('AC-3 — Operador recebe role=operador', async () => {
    const { accessToken } = await auth.login('op@alfa.com', 'senha-op');
    const payload = await jwt.verifyAsync<JwtPayload>(accessToken);
    expect(payload.papel).toBe('operador');
    expect(payload.tenantId).toBe(tenantId);
  });

  it('AC-5 — senha inválida falha sem revelar existência', async () => {
    await expect(auth.login('dono@alfa.com', 'errada')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('AC-6 — me retorna o contexto real do tenant e as permissões do papel', async () => {
    const donoCtx = await auth.me(tenantId, 'dono_admin');
    expect(donoCtx.nomeRestaurante).toBe('Restaurante Alfa');
    expect(donoCtx.permissoes).toEqual(
      expect.arrayContaining(['estoque', 'fichas', 'dashboard_gerencial']),
    );

    const opCtx = await auth.me(tenantId, 'operador');
    expect(opCtx.nomeRestaurante).toBe('Restaurante Alfa');
    expect(opCtx.permissoes).toEqual(
      expect.arrayContaining(['inicio', 'pedidos', 'dashboard_operacional']),
    );
  });

  it('AC-5 — email inexistente falha com a mesma resposta neutra', async () => {
    await expect(auth.login('ninguem@alfa.com', 'qualquer')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('usuário pendente (sem senha definida) não loga', async () => {
    // Dono criado por provisionamento entra como 'pendente' sem senha_hash.
    await h.adminPool.query(
      `INSERT INTO usuario (tenant_id, email, nome, papel, status) VALUES ($1, 'pend@alfa.com', 'Pend', 'dono_admin', 'pendente')`,
      [tenantId],
    );
    await expect(auth.login('pend@alfa.com', 'qualquer')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
