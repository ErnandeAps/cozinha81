import { Reflector } from '@nestjs/core';
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { RolesGuard } from '../../core/auth/roles.guard';
import { IntegracoesController } from './integracoes.controller';
import type { AuthPrincipal } from '../../core/auth/jwt-payload';

/**
 * Story 7.2 — AC#4: a tela Integrações é restrita ao Dono/Admin.
 * O controller declara @Papeis('dono_admin'); o RolesGuard real, lendo a
 * metadata real do controller, deve barrar o Operador e liberar o Dono/Admin.
 */
function ctxFor(
  handler: 'list' | 'connect' | 'disconnect',
  user?: AuthPrincipal
): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => IntegracoesController.prototype[handler],
    getClass: () => IntegracoesController,
  } as unknown as ExecutionContext;
}

const dono: AuthPrincipal = {
  sub: 'u1',
  scope: 'tenant',
  papel: 'dono_admin',
  tenantId: '018f4b1a-0000-7000-8000-0000000000a1',
};
const operador: AuthPrincipal = { ...dono, sub: 'u2', papel: 'operador' };

describe('IntegracoesController — AC#4 restrito a Dono/Admin (Story 7.2)', () => {
  const guard = new RolesGuard(new Reflector());

  it('nega o Operador em todos os handlers da tela Integrações', () => {
    expect(() => guard.canActivate(ctxFor('list', operador))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctxFor('connect', operador))).toThrow(ForbiddenException);
    expect(() => guard.canActivate(ctxFor('disconnect', operador))).toThrow(ForbiddenException);
  });

  it('permite o Dono/Admin', () => {
    expect(guard.canActivate(ctxFor('list', dono))).toBe(true);
    expect(guard.canActivate(ctxFor('connect', dono))).toBe(true);
  });

  it('nega quando não há principal autenticado', () => {
    expect(() => guard.canActivate(ctxFor('list', undefined))).toThrow(ForbiddenException);
  });
});
