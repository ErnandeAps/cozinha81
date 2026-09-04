import { IntegracoesService } from './integracoes.service';
import { EncryptionService } from '../../core/security/encryption.service';
import { DeliveryProviderFactory } from './ports/delivery-provider.factory';
import { IfoodAdapter } from './adapters/ifood.adapter';
import { NoveNoveFoodAdapter } from './adapters/99food.adapter';
import { FakeDeliveryAdapter } from './adapters/fake-delivery.adapter';
import { startPgHarness, seedInquilino, type PgHarness } from '../../testing/pg-harness';

/**
 * Story 7.2 — integração contra Postgres 18 REAL (RLS não existe em mock).
 * Cobre: AC#1 (conectar/validar), AC#2 (gate de ingestão), AC#3/FR-23
 * (uma marca por Cozinha), AC#5 (segredo cifrado) e isolamento por tenant.
 */
jest.setTimeout(180_000);

describe('IntegracoesService — conexão de contas (Story 7.2)', () => {
  let harness: PgHarness;
  let service: IntegracoesService;
  let tenantA: string;
  let tenantB: string;

  beforeAll(async () => {
    harness = await startPgHarness();
    const factory = new DeliveryProviderFactory(
      new IfoodAdapter(),
      new NoveNoveFoodAdapter(),
      new FakeDeliveryAdapter()
    );
    service = new IntegracoesService(harness.db, new EncryptionService(), factory);
    tenantA = await seedInquilino(harness, 'Cozinha A');
    tenantB = await seedInquilino(harness, 'Cozinha B');
  });

  afterAll(async () => {
    await harness?.stop();
  });

  it('AC#1: conecta conta válida e habilita ingestão', async () => {
    await service.saveIntegration(tenantA, 'ifood', 'loja-A', 'token-A');

    const list = await service.listIntegrations(tenantA);
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ provider: 'ifood', storeId: 'loja-A', status: 'ativo' });
    await expect(service.isProviderConnected(tenantA, 'ifood')).resolves.toBe(true);
  });

  it('AC#2: sem conexão válida, isProviderConnected é false (nada a ingerir)', async () => {
    await expect(service.isProviderConnected(tenantB, 'ifood')).resolves.toBe(false);
    await expect(service.isProviderConnected(tenantA, '99food')).resolves.toBe(false);
  });

  it('AC#1: credenciais inválidas são recusadas (validação via adapter)', async () => {
    await expect(service.saveIntegration(tenantB, 'ifood', 'loja-B', '   ')).rejects.toThrow();
    await expect(service.isProviderConnected(tenantB, 'ifood')).resolves.toBe(false);
  });

  it('AC#3/FR-23: uma marca por Cozinha — segunda marca diferente é barrada', async () => {
    await expect(service.saveIntegration(tenantA, '99food', 'loja-A99', 'token-A99')).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'MARCA_DELIVERY_UNICA' }),
    });

    const list = await service.listIntegrations(tenantA);
    expect(list).toHaveLength(1);
    expect(list[0].provider).toBe('ifood');
  });

  it('AC#3: reconectar o MESMO provider atualiza credenciais sem duplicar', async () => {
    await service.saveIntegration(tenantA, 'ifood', 'loja-A-nova', 'token-A-v2');

    const list = await service.listIntegrations(tenantA);
    expect(list).toHaveLength(1);
    expect(list[0].storeId).toBe('loja-A-nova');
  });

  it('AC#3: trocar de marca após desconectar é permitido', async () => {
    await service.deleteIntegration(tenantA, 'ifood');
    await expect(service.isProviderConnected(tenantA, 'ifood')).resolves.toBe(false);

    await service.saveIntegration(tenantA, '99food', 'loja-A99', 'token-A99');
    const list = await service.listIntegrations(tenantA);
    expect(list).toHaveLength(1);
    expect(list[0].provider).toBe('99food');
  });

  it('AC#5: o segredo é cifrado em repouso (não fica em texto claro)', async () => {
    await service.saveIntegration(tenantB, 'ifood', 'loja-B', 'segredo-cru-B');

    // Lê a coluna crua via adminPool (superuser bypassa RLS legitimamente).
    const { rows } = await harness.adminPool.query<{ credentials_encrypted: string }>(
      `SELECT credentials_encrypted FROM integracoes_delivery WHERE tenant_id = $1`,
      [tenantB]
    );
    expect(rows).toHaveLength(1);
    const stored = rows[0].credentials_encrypted;
    expect(stored).not.toContain('segredo-cru-B');
    expect(stored.split(':')).toHaveLength(3); // iv:authTag:cipher
    expect(new EncryptionService().decrypt(stored)).toBe('segredo-cru-B');
  });

  it('RLS: a conexão de uma Cozinha não vaza para outra (isolamento por tenant)', async () => {
    const listA = await service.listIntegrations(tenantA);
    expect(listA).toHaveLength(1);
    expect(listA[0].provider).toBe('99food');

    const listB = await service.listIntegrations(tenantB);
    expect(listB).toHaveLength(1);
    expect(listB[0].provider).toBe('ifood');
  });
});
