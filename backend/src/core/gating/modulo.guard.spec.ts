import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModuloGuard } from './modulo.guard';
import type { Modulo } from './modulos';
import { type PgHarness, seedInquilino, startPgHarness } from '../../testing/pg-harness';
import type { AuthPrincipal } from '../auth/jwt-payload';

jest.setTimeout(180_000);

function ctxWith(user: AuthPrincipal | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function reflectorReturning(modulo: Modulo | undefined): Reflector {
  return { getAllAndOverride: () => modulo } as unknown as Reflector;
}

describe('ModuloGuard (Story 1.6 AC-3) — gating server-side', () => {
  let h: PgHarness;
  let tenantId: string;
  let user: AuthPrincipal;

  beforeAll(async () => {
    h = await startPgHarness();
    tenantId = await seedInquilino(h, 'Alfa');
    user = { sub: 'u1', scope: 'tenant', tenantId, papel: 'dono_admin' };
    // gestao_cozinha habilitado; pedidos_kds NÃO.
    await h.adminPool.query(
      `INSERT INTO modulo_flag (tenant_id, modulo, habilitado) VALUES ($1,'gestao_cozinha',true), ($1,'pedidos_kds',false)`,
      [tenantId],
    );
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('libera quando o handler não exige Módulo', async () => {
    const guard = new ModuloGuard(reflectorReturning(undefined), h.db);
    await expect(guard.canActivate(ctxWith(user))).resolves.toBe(true);
  });

  it('libera Módulo habilitado', async () => {
    const guard = new ModuloGuard(reflectorReturning('gestao_cozinha'), h.db);
    await expect(guard.canActivate(ctxWith(user))).resolves.toBe(true);
  });

  it('rejeita Módulo não habilitado (com sinal de upsell)', async () => {
    const guard = new ModuloGuard(reflectorReturning('pedidos_kds'), h.db);
    await expect(guard.canActivate(ctxWith(user))).rejects.toBeInstanceOf(ForbiddenException);
    try {
      await guard.canActivate(ctxWith(user));
    } catch (e) {
      const resp = (e as ForbiddenException).getResponse() as { code: string; details: { upsell: boolean } };
      expect(resp.code).toBe('MODULO_NAO_HABILITADO');
      expect(resp.details.upsell).toBe(true);
    }
  });

  it('rejeita principal sem tenant (ex.: plataforma)', async () => {
    const guard = new ModuloGuard(reflectorReturning('gestao_cozinha'), h.db);
    const staff: AuthPrincipal = { sub: 's1', scope: 'platform', papel: 'staff' };
    await expect(guard.canActivate(ctxWith(staff))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
