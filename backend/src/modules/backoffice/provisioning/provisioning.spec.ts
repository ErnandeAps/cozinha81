import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JWT_EXPIRES_IN, jwtSecret } from '../../../core/auth/auth.config';
import type { JwtPayload } from '../../../core/auth/jwt-payload';
import { type PgHarness, seedStaff, startPgHarness } from '../../../testing/pg-harness';
import { PlatformAuthService } from '../auth/platform-auth.service';
import { ProvisioningService } from './provisioning.service';

jest.setTimeout(180_000);

describe('Provisionamento de Inquilino + realm de plataforma (Story 1.3)', () => {
  let h: PgHarness;
  let jwt: JwtService;
  let auth: PlatformAuthService;
  let provisioning: ProvisioningService;
  let staffId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    jwt = new JwtService({ secret: jwtSecret(), signOptions: { expiresIn: JWT_EXPIRES_IN } });
    auth = new PlatformAuthService(h.db, jwt);
    provisioning = new ProvisioningService(h.db);
    staffId = await seedStaff(h, 'staff@cozinha81.com', 'senha-forte');
  });

  afterAll(async () => {
    await h?.stop();
  });

  describe('AC-1 — realm de plataforma (auth staff)', () => {
    it('emite token com scope=platform, papel=staff e SEM tenantId', async () => {
      const { accessToken, staff } = await auth.login('staff@cozinha81.com', 'senha-forte');
      const payload = await jwt.verifyAsync<JwtPayload>(accessToken);

      expect(payload.scope).toBe('platform');
      expect(payload.papel).toBe('staff');
      expect(payload.tenantId).toBeUndefined();
      expect(payload.sub).toBe(staffId);
      expect(staff.id).toBe(staffId);
    });

    it('rejeita senha inválida', async () => {
      await expect(auth.login('staff@cozinha81.com', 'errada')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('AC-2/AC-4 — provisionar Inquilino + Módulos', () => {
    it('cria tenant isolado + Dono/Admin inicial + flags de Módulo', async () => {
      const result = await provisioning.provisionar(
        {
          nome: 'Restaurante Alfa',
          dono: { email: 'dono@alfa.com', nome: 'Dona Alfa' },
          modulos: ['gestao_cozinha'],
        },
        staffId,
      );

      expect(result.tenantId).toBeTruthy();
      expect(result.dono).toMatchObject({ papel: 'dono_admin', status: 'pendente', email: 'dono@alfa.com' });
      expect(result.modulos).toEqual([
        { modulo: 'gestao_cozinha', habilitado: true },
        { modulo: 'pedidos_kds', habilitado: false },
      ]);

      // Inquilino e Dono existem no tenant alvo.
      const inquilino = await h.db.withTenant(result.tenantId, (c) =>
        c.query(`SELECT nome FROM inquilino WHERE id = $1`, [result.tenantId]).then((r) => r.rows),
      );
      expect(inquilino).toHaveLength(1);

      const dono = await h.db.withTenant(result.tenantId, (c) =>
        c
          .query(`SELECT papel, status FROM usuario WHERE email = 'dono@alfa.com'`)
          .then((r) => r.rows[0]),
      );
      expect(dono).toMatchObject({ papel: 'dono_admin', status: 'pendente' });

      const flags = await h.db.withTenant(result.tenantId, (c) =>
        c
          .query(`SELECT modulo, habilitado FROM modulo_flag ORDER BY modulo`)
          .then((r) => r.rows),
      );
      expect(flags).toEqual([
        { modulo: 'gestao_cozinha', habilitado: true },
        { modulo: 'pedidos_kds', habilitado: false },
      ]);
    });

    it('AC-3 — grava trilha de auditoria do provisionamento', async () => {
      const result = await provisioning.provisionar(
        { nome: 'Restaurante Beta', dono: { email: 'dono@beta.com', nome: 'Dono Beta' }, modulos: ['gestao_cozinha', 'pedidos_kds'] },
        staffId,
      );

      const { rows } = await h.adminPool.query(
        `SELECT staff_id, acao, detalhes FROM provisionamento_audit WHERE tenant_id = $1`,
        [result.tenantId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].staff_id).toBe(staffId);
      expect(rows[0].acao).toBe('provisionar_inquilino');
      expect(rows[0].detalhes.dono).toBe('dono@beta.com');
    });

    it('lista inquilinos com dados completos do restaurante, dono e módulos', async () => {
      const result = await provisioning.provisionar(
        {
          nome: 'Restaurante Gama',
          razaoSocial: 'Gama Restaurantes Ltda',
          nomeFantasia: 'Gama Kitchen',
          cnpj: '12.345.678/0001-99',
          telefone: '(11) 3333-4444',
          email: 'contato@gama.com',
          segmento: 'Pizzaria',
          cep: '01000-000',
          cidade: 'São Paulo',
          estado: 'SP',
          dono: { email: 'dono@gama.com', nome: 'Dono Gama' },
          modulos: ['gestao_cozinha'],
        },
        staffId,
      );

      const itens = await provisioning.listar();
      expect(itens).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: result.tenantId,
            nome: 'Restaurante Gama',
            razaoSocial: 'Gama Restaurantes Ltda',
            nomeFantasia: 'Gama Kitchen',
            cnpj: '12.345.678/0001-99',
            telefone: '(11) 3333-4444',
            email: 'contato@gama.com',
            segmento: 'Pizzaria',
            cidade: 'São Paulo',
            estado: 'SP',
            dono: expect.objectContaining({ email: 'dono@gama.com', nome: 'Dono Gama' }),
            modulos: expect.arrayContaining([
              expect.objectContaining({ modulo: 'gestao_cozinha', habilitado: true }),
              expect.objectContaining({ modulo: 'pedidos_kds', habilitado: false }),
            ]),
          }),
        ]),
      );
    });

    it('persiste a cozinha selecionada no cadastro do inquilino', async () => {
      const cozinha = await h.db.withPlatform((c) =>
        c.query<{ id: string; nome: string }>(`INSERT INTO cozinha (nome, equipada) VALUES ('Cozinha do Clube', true) RETURNING id, nome`).then((r) => r.rows[0]),
      );

      const result = await provisioning.provisionar(
        {
          nome: 'Restaurante Épsilon',
          cozinhaId: cozinha.id,
          dono: { email: 'dono@epsilon.com', nome: 'Dono Épsilon' },
          modulos: ['gestao_cozinha'],
        },
        staffId,
      );

      expect(result.cozinhaId).toBe(cozinha.id);

      const inquilino = await h.db.withPlatform((c) =>
        c.query<{ cozinha_id: string | null }>(`SELECT cozinha_id FROM inquilino WHERE id = $1`, [result.tenantId]).then((r) => r.rows[0]),
      );

      expect(inquilino?.cozinha_id).toBe(cozinha.id);
    });

    it('remove um inquilino e os registros relacionados', async () => {
      const result = await provisioning.provisionar(
        { nome: 'Restaurante Delta', dono: { email: 'dono@delta.com', nome: 'Dono Delta' }, modulos: ['gestao_cozinha'] },
        staffId,
      );

      await provisioning.remover(result.tenantId);

      const itens = await provisioning.listar();
      expect(itens.find((item) => item.id === result.tenantId)).toBeUndefined();
    });
  });

  describe('AC-3 — isolamento mantido entre tenants provisionados', () => {
    it('o Dono de um tenant não é visível no contexto de outro', async () => {
      const t1 = await provisioning.provisionar(
        { nome: 'T1', dono: { email: 'dono@t1.com', nome: 'D1' }, modulos: [] },
        staffId,
      );
      await provisioning.provisionar(
        { nome: 'T2', dono: { email: 'dono@t2.com', nome: 'D2' }, modulos: [] },
        staffId,
      );

      const vistosPorT1 = await h.db.withTenant(t1.tenantId, (c) =>
        c.query<{ email: string }>(`SELECT email FROM usuario`).then((r) => r.rows.map((x) => x.email)),
      );
      expect(vistosPorT1).toContain('dono@t1.com');
      expect(vistosPorT1).not.toContain('dono@t2.com');
    });

    it('staff (scope=platform) enxerga Inquilinos cross-tenant (AD-14)', async () => {
      const todos = await h.db.withPlatform((c) =>
        c.query<{ n: string }>(`SELECT count(*)::text AS n FROM inquilino`).then((r) => Number(r.rows[0].n)),
      );
      expect(todos).toBeGreaterThanOrEqual(4); // Alfa, Beta, T1, T2
    });
  });
});
