import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWT_EXPIRES_IN, jwtSecret } from '../../core/auth/auth.config';
import { InquilinoAuthService } from '../../core/auth/inquilino-auth.service';
import { type PgHarness, seedInquilino, seedUsuario, startPgHarness } from '../../testing/pg-harness';
import { ConviteService } from './convite.service';

jest.setTimeout(180_000);

describe('Convite de usuários (Story 1.5)', () => {
  let h: PgHarness;
  let convite: ConviteService;
  let auth: InquilinoAuthService;
  let tenantId: string;
  let donoId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    convite = new ConviteService(h.db);
    auth = new InquilinoAuthService(
      h.db,
      new JwtService({ secret: jwtSecret(), signOptions: { expiresIn: JWT_EXPIRES_IN } }),
    );
    tenantId = await seedInquilino(h, 'Restaurante Alfa');
    donoId = await seedUsuario(h, {
      tenantId,
      email: 'dono@alfa.com',
      senha: 'x',
      papel: 'dono_admin',
    });
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('AC-1/AC-2 — Dono/Admin convida, convidado aceita e loga apenas no seu tenant', async () => {
    const criado = await convite.convidar(tenantId, donoId, {
      email: 'op@alfa.com',
      nome: 'Operador Alfa',
      papel: 'operador',
    });
    expect(criado.token).toBeTruthy();
    expect(criado.usuario).toMatchObject({ papel: 'operador', status: 'pendente' });

    // Antes do aceite, não loga (pendente, sem senha).
    await expect(auth.login('op@alfa.com', 'nova-senha')).rejects.toThrow();

    // Aceite define a senha e ativa.
    const { tenantId: aceiteTenant } = await convite.aceitar({ token: criado.token, senha: 'nova-senha' });
    expect(aceiteTenant).toBe(tenantId);

    const { accessToken, usuario } = await auth.login('op@alfa.com', 'nova-senha');
    expect(usuario).toMatchObject({ papel: 'operador', tenantId });
    expect(accessToken).toBeTruthy();
  });

  it('AC-4 — token é de uso único', async () => {
    const criado = await convite.convidar(tenantId, donoId, {
      email: 'op2@alfa.com',
      nome: 'Op 2',
      papel: 'operador',
    });
    await convite.aceitar({ token: criado.token, senha: 's1' });
    await expect(convite.aceitar({ token: criado.token, senha: 's2' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('AC-4 — convite expirado é recusado', async () => {
    const criado = await convite.convidar(tenantId, donoId, {
      email: 'op3@alfa.com',
      nome: 'Op 3',
      papel: 'operador',
    });
    // Força expiração no passado.
    await h.adminPool.query(`UPDATE convite SET expira_em = now() - interval '1 day' WHERE id = $1`, [
      criado.conviteId,
    ]);
    await expect(convite.aceitar({ token: criado.token, senha: 's' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('AC-4 — token inválido é recusado', async () => {
    await expect(convite.aceitar({ token: 'token-que-nao-existe', senha: 's' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('recusa convite para email já existente no tenant (409)', async () => {
    await convite.convidar(tenantId, donoId, { email: 'dup@alfa.com', nome: 'Dup', papel: 'operador' });
    await expect(
      convite.convidar(tenantId, donoId, { email: 'dup@alfa.com', nome: 'Dup', papel: 'operador' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('AC-2 — vínculo ao tenant: convidado não enxerga dados de outro tenant', async () => {
    // Outro tenant com um usuário próprio.
    const outroTenant = await seedInquilino(h, 'Restaurante Beta');
    await seedUsuario(h, { tenantId: outroTenant, email: 'beta@beta.com', senha: 'b', papel: 'dono_admin' });

    const vistosPeloTenantAlfa = await h.db.withTenant(tenantId, (c) =>
      c.query<{ email: string }>('SELECT email FROM usuario').then((r) => r.rows.map((x) => x.email)),
    );
    expect(vistosPeloTenantAlfa).toContain('op@alfa.com');
    expect(vistosPeloTenantAlfa).not.toContain('beta@beta.com');
  });
});
