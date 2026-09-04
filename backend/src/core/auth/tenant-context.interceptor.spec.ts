import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { defer, firstValueFrom, of } from 'rxjs';
import { TenantContextInterceptor } from './tenant-context.interceptor';
import { getTenantContext, type TenantContext } from '../database/tenant-context';
import type { AuthPrincipal } from './jwt-payload';

function ctxWith(user: AuthPrincipal | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

// O handler lê o contexto no momento da subscrição (dentro do run() do ALS).
const handlerReadingContext: CallHandler = {
  handle: () => defer(() => of(getTenantContext())),
};

describe('TenantContextInterceptor (Story 1.4 AC-2/AC-3)', () => {
  const interceptor = new TenantContextInterceptor();
  const tenantId = '018f4b1a-0000-7000-8000-0000000000a1';

  it('resolve (tenant_id, role) do principal de Inquilino e marca noCost para Operador', async () => {
    const user: AuthPrincipal = { sub: 'u1', scope: 'tenant', tenantId, papel: 'operador' };
    const seen = (await firstValueFrom(
      interceptor.intercept(ctxWith(user), handlerReadingContext),
    )) as TenantContext;

    expect(seen).toMatchObject({ scope: 'tenant', tenantId, papel: 'operador', noCost: true });
  });

  it('Dono/Admin não é marcado noCost', async () => {
    const user: AuthPrincipal = { sub: 'u2', scope: 'tenant', tenantId, papel: 'dono_admin' };
    const seen = (await firstValueFrom(
      interceptor.intercept(ctxWith(user), handlerReadingContext),
    )) as TenantContext;

    expect(seen).toMatchObject({ scope: 'tenant', papel: 'dono_admin', noCost: false });
  });

  it('principal de plataforma => scope platform, sem tenantId', async () => {
    const user: AuthPrincipal = { sub: 's1', scope: 'platform', papel: 'staff' };
    const seen = (await firstValueFrom(
      interceptor.intercept(ctxWith(user), handlerReadingContext),
    )) as TenantContext;

    expect(seen).toMatchObject({ scope: 'platform' });
    expect(seen.tenantId).toBeUndefined();
  });

  it('sem principal => passa adiante sem contexto', async () => {
    const seen = await firstValueFrom(
      interceptor.intercept(ctxWith(undefined), handlerReadingContext),
    );
    expect(seen).toBeUndefined();
  });
});
