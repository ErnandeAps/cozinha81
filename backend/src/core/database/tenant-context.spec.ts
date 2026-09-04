import {
  getTenantContext,
  MissingTenantContextError,
  requireTenantId,
  runInTenantContext,
} from './tenant-context';
import { runWithTenant } from './run-with-tenant';

describe('tenant-context', () => {
  it('não há contexto fora de runInTenantContext', () => {
    expect(getTenantContext()).toBeUndefined();
    expect(() => requireTenantId()).toThrow(MissingTenantContextError);
  });

  it('runInTenantContext expõe o tenant ambiente durante a execução', () => {
    runInTenantContext({ scope: 'tenant', tenantId: 't-1' }, () => {
      expect(getTenantContext()).toEqual({ scope: 'tenant', tenantId: 't-1' });
      expect(requireTenantId()).toBe('t-1');
    });
    // e some ao sair
    expect(getTenantContext()).toBeUndefined();
  });

  it('scope platform não resolve tenantId', () => {
    runInTenantContext({ scope: 'platform' }, () => {
      expect(() => requireTenantId()).toThrow(MissingTenantContextError);
    });
  });

  it('o contexto sobrevive a awaits (AsyncLocalStorage)', async () => {
    await runInTenantContext({ scope: 'tenant', tenantId: 't-async' }, async () => {
      await Promise.resolve();
      expect(requireTenantId()).toBe('t-async');
    });
  });

  describe('runWithTenant', () => {
    it('recusa tenantId vazio (AC-4: worker não escreve sem tenant)', () => {
      expect(() => runWithTenant('', async () => undefined)).toThrow(MissingTenantContextError);
    });

    it('estabelece o contexto para o trabalho do worker', async () => {
      const seen = await runWithTenant('t-worker', async () => requireTenantId());
      expect(seen).toBe('t-worker');
    });
  });
});
