import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import type { AuthPrincipal } from './jwt-payload';

function ctxWith(user: AuthPrincipal | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

function reflectorReturning(papeis: string[] | undefined): Reflector {
  return { getAllAndOverride: () => papeis } as unknown as Reflector;
}

const donoAdmin: AuthPrincipal = {
  sub: 'u1',
  scope: 'tenant',
  papel: 'dono_admin',
  tenantId: '018f4b1a-0000-7000-8000-0000000000a1',
};
const operador: AuthPrincipal = { ...donoAdmin, sub: 'u2', papel: 'operador' };

describe('RolesGuard (Story 1.5 AC-3)', () => {
  it('permite quando o papel do principal está entre os exigidos', () => {
    const guard = new RolesGuard(reflectorReturning(['dono_admin']));
    expect(guard.canActivate(ctxWith(donoAdmin))).toBe(true);
  });

  it('nega Operador quando exige Dono/Admin', () => {
    const guard = new RolesGuard(reflectorReturning(['dono_admin']));
    expect(() => guard.canActivate(ctxWith(operador))).toThrow(ForbiddenException);
  });

  it('libera quando não há papéis exigidos', () => {
    const guard = new RolesGuard(reflectorReturning(undefined));
    expect(guard.canActivate(ctxWith(operador))).toBe(true);
  });

  it('nega quando não há principal', () => {
    const guard = new RolesGuard(reflectorReturning(['dono_admin']));
    expect(() => guard.canActivate(ctxWith(undefined))).toThrow(ForbiddenException);
  });
});
