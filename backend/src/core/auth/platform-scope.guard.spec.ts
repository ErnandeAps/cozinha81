import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PlatformScopeGuard } from './platform-scope.guard';
import type { AuthPrincipal } from './jwt-payload';

function ctxWith(user: AuthPrincipal | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('PlatformScopeGuard (AC-5)', () => {
  const guard = new PlatformScopeGuard();

  it('permite principal de plataforma', () => {
    expect(guard.canActivate(ctxWith({ sub: 's1', scope: 'platform', papel: 'staff' }))).toBe(true);
  });

  it('nega token de Inquilino (Dono/Admin) no backoffice', () => {
    const tenantUser: AuthPrincipal = {
      sub: 'u1',
      scope: 'tenant',
      papel: 'dono_admin',
      tenantId: '018f4b1a-0000-7000-8000-0000000000a1',
    };
    expect(() => guard.canActivate(ctxWith(tenantUser))).toThrow(ForbiddenException);
  });

  it('nega request sem principal', () => {
    expect(() => guard.canActivate(ctxWith(undefined))).toThrow(ForbiddenException);
  });
});
