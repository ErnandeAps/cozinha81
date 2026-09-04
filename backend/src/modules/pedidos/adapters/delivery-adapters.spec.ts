import { Logger } from '@nestjs/common';
import { IfoodAdapter } from './ifood.adapter';
import { NoveNoveFoodAdapter } from './99food.adapter';

/**
 * Story 7.2 — Task 1 (AC #1, #5).
 * Os adapters concretos validam credenciais via porta única (ACL) e NUNCA
 * expõem o segredo em logs.
 */
describe('Delivery adapters — validateCredentials (Story 7.2)', () => {
  const cases: Array<[string, () => { validateCredentials: (s: string, c: string) => Promise<boolean> }]> = [
    ['IfoodAdapter', () => new IfoodAdapter()],
    ['NoveNoveFoodAdapter', () => new NoveNoveFoodAdapter()],
  ];

  describe.each(cases)('%s', (_name, make) => {
    it('AC#1: aceita storeId + credenciais válidas', async () => {
      const adapter = make();
      await expect(adapter.validateCredentials('loja-123', 'token-secreto')).resolves.toBe(true);
    });

    it('AC#1: rejeita quando faltam credenciais ou storeId', async () => {
      const adapter = make();
      await expect(adapter.validateCredentials('loja-123', '')).resolves.toBe(false);
      await expect(adapter.validateCredentials('', 'token-secreto')).resolves.toBe(false);
    });

    it('AC#1: rejeita credenciais/loja só com espaços em branco', async () => {
      const adapter = make();
      await expect(adapter.validateCredentials('loja-123', '   ')).resolves.toBe(false);
      await expect(adapter.validateCredentials('   ', 'token-secreto')).resolves.toBe(false);
    });

    it('AC#5: nunca registra o segredo bruto em log', async () => {
      const adapter = make();
      const spy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
      try {
        await adapter.validateCredentials('loja-123', 'super-segredo-99');
        for (const call of spy.mock.calls) {
          expect(JSON.stringify(call)).not.toContain('super-segredo-99');
        }
      } finally {
        spy.mockRestore();
      }
    });
  });
});
