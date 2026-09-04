import {
  type PgHarness,
  seedInquilino,
  seedStaff,
  seedUsuario,
  startPgHarness,
} from '../../../testing/pg-harness';
import { ModuloFlagService } from './modulo-flag.service';

jest.setTimeout(180_000);

describe('Toggle de Módulo preserva dados (Story 1.6 AC-5/AC-6)', () => {
  let h: PgHarness;
  let flags: ModuloFlagService;
  let tenantId: string;
  let staffId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    flags = new ModuloFlagService(h.db);
    staffId = await seedStaff(h, 'staff@cozinha81.com', 'x');
    tenantId = await seedInquilino(h, 'Alfa');
    // "dado" do Inquilino para provar preservação no toggle.
    await seedUsuario(h, { tenantId, email: 'dono@alfa.com', senha: 'x', papel: 'dono_admin' });
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('habilita, desliga e religa sem apagar os dados do Inquilino', async () => {
    expect(await flags.definir(tenantId, 'gestao_cozinha', true, staffId)).toEqual({
      modulo: 'gestao_cozinha',
      habilitado: true,
    });

    // Desligar: flag vira false, mas o dado continua lá.
    expect(await flags.definir(tenantId, 'gestao_cozinha', false, staffId)).toMatchObject({ habilitado: false });
    const aposDesligar = await h.db.withTenant(tenantId, (c) =>
      c.query<{ n: string }>(`SELECT count(*)::text AS n FROM usuario`).then((r) => Number(r.rows[0].n)),
    );
    expect(aposDesligar).toBe(1);

    // Religar: acesso restaurado, dado intacto.
    expect(await flags.definir(tenantId, 'gestao_cozinha', true, staffId)).toMatchObject({ habilitado: true });
    const aposReligar = await h.db.withTenant(tenantId, (c) =>
      c.query<{ n: string }>(`SELECT count(*)::text AS n FROM usuario`).then((r) => Number(r.rows[0].n)),
    );
    expect(aposReligar).toBe(1);

    // Cada operação de flag é auditada (AD-14).
    const { rows } = await h.adminPool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM provisionamento_audit
       WHERE tenant_id = $1 AND acao = 'alterar_modulo_flag' AND staff_id = $2`,
      [tenantId, staffId],
    );
    expect(Number(rows[0].n)).toBe(3);
  });

  it('lista as flags do tenant', async () => {
    await flags.definir(tenantId, 'pedidos_kds', false, staffId);
    const lista = await flags.listar(tenantId);
    expect(lista).toEqual(
      expect.arrayContaining([
        { modulo: 'gestao_cozinha', habilitado: true },
        { modulo: 'pedidos_kds', habilitado: false },
      ]),
    );
  });

  it('rejeita módulo inválido', async () => {
    await expect(flags.definir(tenantId, 'inexistente', true, staffId)).rejects.toThrow();
  });
});
