import { RecebimentoService } from './recebimento.service';
import { OutboxWorkerService } from './outbox-worker.service';
import { IntegracoesService } from './integracoes.service';
import { DeliveryProviderFactory } from './ports/delivery-provider.factory';
import { startPgHarness, seedInquilino, type PgHarness } from '../../testing/pg-harness';

/**
 * Story 7.5 — pausar/reativar recebimento (Postgres 18 REAL).
 * AC#1 (pausa interrompe ingestão + reflete na origem), AC#4 (reativar retoma).
 */
jest.setTimeout(180_000);

describe('Recebimento — pausar/reativar (Story 7.5)', () => {
  let harness: PgHarness;
  let recebimento: RecebimentoService;
  let integracoes: IntegracoesService;
  let outbox: OutboxWorkerService;
  let pauseReceiving: jest.Mock;
  let resumeReceiving: jest.Mock;
  let tenantId: string;

  beforeAll(async () => {
    harness = await startPgHarness();
    recebimento = new RecebimentoService(harness.db);
    // isProviderConnected só usa o db — encryption/factory não são exercitados aqui.
    integracoes = new IntegracoesService(harness.db, {} as any, {} as any);
    pauseReceiving = jest.fn().mockResolvedValue(undefined);
    resumeReceiving = jest.fn().mockResolvedValue(undefined);
    const factory = {
      getAdapter: () => ({ pauseReceiving, resumeReceiving, syncStatus: jest.fn() }),
    } as unknown as DeliveryProviderFactory;
    outbox = new OutboxWorkerService(harness.db, factory);

    tenantId = await seedInquilino(harness, 'Cozinha Pausa');
    await harness.db.withTenant(tenantId, (c) =>
      c.query(
        `INSERT INTO integracoes_delivery (tenant_id, provider, store_id, credentials_encrypted, status)
         VALUES ($1, 'ifood', 'loja-pausa', 'enc', 'ativo')`,
        [tenantId]
      )
    );
  });

  afterAll(async () => {
    await harness?.stop();
  });

  it('AC#1: pausar interrompe a ingestão e enfileira indisponibilidade na origem', async () => {
    await expect(integracoes.isProviderConnected(tenantId, 'ifood')).resolves.toBe(true);

    await recebimento.pausar(tenantId);

    expect((await recebimento.estado(tenantId)).status).toBe('pausado');
    // O gate de ingestão da 7.2 passa a barrar (sem conexão "ativa").
    await expect(integracoes.isProviderConnected(tenantId, 'ifood')).resolves.toBe(false);

    const { rows } = await harness.db.withTenant(tenantId, (c) =>
      c.query(`SELECT tipo, status_envio, origem_id FROM delivery_outbox WHERE tipo = 'pausa'`)
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ tipo: 'pausa', status_envio: 'PENDING', origem_id: 'loja-pausa' });
  });

  it('AC#1: o worker reflete a pausa na origem (adapter.pauseReceiving)', async () => {
    await outbox.drainOutbox();
    expect(pauseReceiving).toHaveBeenCalledWith('loja-pausa');
  });

  it('AC#4: reativar retoma a ingestão e reflete a retomada na origem', async () => {
    await recebimento.reativar(tenantId);

    expect((await recebimento.estado(tenantId)).status).toBe('ativo');
    await expect(integracoes.isProviderConnected(tenantId, 'ifood')).resolves.toBe(true);

    await outbox.drainOutbox();
    expect(resumeReceiving).toHaveBeenCalledWith('loja-pausa');
  });

  it('pausar sem conexão ativa é rejeitado', async () => {
    const outroTenant = await seedInquilino(harness, 'Sem conexão');
    await expect(recebimento.pausar(outroTenant)).rejects.toThrow();
  });
});
