import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { CostRedactionInterceptor, redactCostFields } from './cost-redaction.interceptor';
import type { AuthPrincipal } from '../auth/jwt-payload';

function ctxWith(user: AuthPrincipal | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const tenantId = '018f4b1a-0000-7000-8000-0000000000a1';
const operador: AuthPrincipal = { sub: 'u1', scope: 'tenant', tenantId, papel: 'operador' };
const dono: AuthPrincipal = { sub: 'u2', scope: 'tenant', tenantId, papel: 'dono_admin' };

describe('redactCostFields', () => {
  it('remove campos de custo recursivamente (objeto, arrays, aninhado)', () => {
    const entrada = {
      nome: 'Insumo',
      precoCompra: 10,
      custo_insumo: 5,
      itens: [{ nome: 'A', cmvUnitario: 2 }, { nome: 'B', faturamento: 99 }],
      ficha: { nome: 'F', custeio: 'peps', rendimento: 3 },
    };
    expect(redactCostFields(entrada)).toEqual({
      nome: 'Insumo',
      itens: [{ nome: 'A' }, { nome: 'B' }],
      ficha: { nome: 'F', rendimento: 3 },
    });
  });

  it('preserva primitivos, null e Date', () => {
    const d = new Date('2026-06-25T00:00:00Z');
    expect(redactCostFields({ n: 1, s: 'x', z: null, d })).toEqual({ n: 1, s: 'x', z: null, d });
  });
});

describe('CostRedactionInterceptor (AD-4 / FR-3)', () => {
  const interceptor = new CostRedactionInterceptor();
  const handler = (data: unknown): CallHandler => ({ handle: () => of(data) });

  it('Operador: resposta sem campos de custo', async () => {
    const out = await firstValueFrom(
      interceptor.intercept(ctxWith(operador), handler({ nome: 'X', precoCompra: 10 })),
    );
    expect(out).toEqual({ nome: 'X' });
  });

  it('Dono/Admin: resposta intacta', async () => {
    const out = await firstValueFrom(
      interceptor.intercept(ctxWith(dono), handler({ nome: 'X', precoCompra: 10 })),
    );
    expect(out).toEqual({ nome: 'X', precoCompra: 10 });
  });

  it('Sem principal (platform/anônimo): não redige', async () => {
    const out = await firstValueFrom(
      interceptor.intercept(ctxWith(undefined), handler({ faturamento: 1 })),
    );
    expect(out).toEqual({ faturamento: 1 });
  });
});
