import { BadRequestException } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { TenantContextMiddleware } from './tenant-context.middleware';
import { getTenantContext } from '../database/tenant-context';

function mockReq(headers: Record<string, string>): Request {
  return {
    header: (name: string) => headers[name.toLowerCase()],
  } as unknown as Request;
}

describe('TenantContextMiddleware', () => {
  const middleware = new TenantContextMiddleware();
  const res = {} as Response;

  it('estabelece o contexto de tenant a partir do header x-tenant-id (AC-2)', () => {
    const tenantId = '018f4b1a-0000-7000-8000-000000000001';
    let seen: string | undefined;
    const next: NextFunction = () => {
      seen = getTenantContext()?.tenantId;
    };

    middleware.use(mockReq({ 'x-tenant-id': tenantId }), res, next);

    expect(seen).toBe(tenantId);
  });

  it('segue sem contexto quando não há header (queries tenant-scoped serão recusadas)', () => {
    let ctx: unknown = 'sentinel';
    const next: NextFunction = () => {
      ctx = getTenantContext();
    };

    middleware.use(mockReq({}), res, next);

    expect(ctx).toBeUndefined();
  });

  it('ignora x-tenant-id quando há Authorization (JWT é a fonte de verdade)', () => {
    let ctx: unknown = 'sentinel';
    const next: NextFunction = () => {
      ctx = getTenantContext();
    };

    middleware.use(
      mockReq({ 'x-tenant-id': '018f4b1a-0000-7000-8000-000000000001', authorization: 'Bearer x' }),
      res,
      next,
    );

    expect(ctx).toBeUndefined();
  });

  it('rejeita header com formato inválido', () => {
    const next: NextFunction = jest.fn();
    expect(() => middleware.use(mockReq({ 'x-tenant-id': 'não-é-uuid' }), res, next)).toThrow(
      BadRequestException,
    );
    expect(next).not.toHaveBeenCalled();
  });
});
