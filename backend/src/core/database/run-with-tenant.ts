import { MissingTenantContextError, runInTenantContext } from './tenant-context';

/**
 * Estabelece o contexto de tenant para trabalho **fora de request**
 * (workers, subscribers, jobs) e executa `fn` dentro dele (AD-1, AC-4).
 *
 * Exige `tenantId` explícito: não há escrita sem tenant. Qualquer acesso a
 * dados dentro de `fn` deve passar por `DatabaseService.withAmbient`, que lerá
 * este contexto — sem ele, a operação é recusada.
 */
export function runWithTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
  if (!tenantId) {
    throw new MissingTenantContextError(
      'runWithTenant exige tenantId explícito; worker/subscriber não escreve sem tenant.',
    );
  }
  return runInTenantContext({ scope: 'tenant', tenantId }, fn);
}
