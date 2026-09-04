import { randomUUID } from 'crypto';
import { PedidosService } from './pedidos.service';
import { OutboxWorkerService } from './outbox-worker.service';
import { DeliveryProviderFactory } from './ports/delivery-provider.factory';
import type { NormalizedOrder } from './ports/delivery-types';
import { startPgHarness, seedInquilino, type PgHarness } from '../../testing/pg-harness';

/**
 * Story 7.4 — sincronização de saída via outbox (Postgres 18 REAL).
 * Cobre: AC#1 (transição enfileira e é enviada via adapter), AC#3 (enfileiramento
 * idempotente por dedup_key), AC#4 (falha mantém no outbox p/ retry).
 */
jest.setTimeout(180_000);

function makeOrder(id: string): NormalizedOrder {
  return {
    id,
    provider: 'ifood',
    status: 'pendente',
    criadoEm: new Date(),
    clienteNome: 'Cliente',
    itens: [{ id: 'i1', nome: 'Item', quantidade: 1, precoUnitario: 1000 }],
    total: 1000,
    pagamentoStatus: 'pago',
  };
}

describe('Sincronização de saída — outbox (Story 7.4)', () => {
  let harness: PgHarness;
  let pedidos: PedidosService;
  let outbox: OutboxWorkerService;
  let syncStatus: jest.Mock;
  let tenantId: string;
  let pedidoId: string;

  beforeAll(async () => {
    harness = await startPgHarness();
    const eventEmitter = { emit: jest.fn() } as any;
    const kdsGateway = { server: { emit: jest.fn() } } as any;
    pedidos = new PedidosService(harness.db, eventEmitter, kdsGateway);

    syncStatus = jest.fn().mockResolvedValue(undefined);
    const factory = { getAdapter: () => ({ syncStatus }) } as unknown as DeliveryProviderFactory;
    outbox = new OutboxWorkerService(harness.db, factory);

    tenantId = await seedInquilino(harness, 'Cozinha Sync');
    const pedido: any = await pedidos.processarPedidoDelivery(tenantId, makeOrder('ext-200'));
    pedidoId = pedido.id;
  });

  afterAll(async () => {
    await harness?.stop();
  });

  async function countOutbox(status: string): Promise<number> {
    const { rows } = await harness.db.withTenant(tenantId, (c) =>
      c.query(
        `SELECT count(*)::int AS n FROM delivery_outbox WHERE pedido_id = $1 AND status = $2`,
        [pedidoId, status]
      )
    );
    return rows[0].n;
  }

  it('AC#1: uma transição de Pedido de delivery enfileira no outbox (PENDING)', async () => {
    await pedidos.mudarStatus(tenantId, pedidoId, { status: 'em_preparo', cause_key: randomUUID() });

    const { rows } = await harness.db.withTenant(tenantId, (c) =>
      c.query(
        `SELECT provider, origem_id, status, status_envio FROM delivery_outbox WHERE pedido_id = $1`,
        [pedidoId]
      )
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      provider: 'ifood',
      origem_id: 'ext-200',
      status: 'em_preparo',
      status_envio: 'PENDING',
    });
  });

  it('AC#3: re-enfileirar a mesma transição (dedup_key) não duplica', async () => {
    // Mesma transição com outro cause_key: pedido_status grava, mas o outbox dedup.
    await pedidos.mudarStatus(tenantId, pedidoId, { status: 'em_preparo', cause_key: randomUUID() });
    expect(await countOutbox('em_preparo')).toBe(1);
  });

  it('AC#1: o worker drena o outbox e envia a transição ao provedor (SENT)', async () => {
    syncStatus.mockClear();
    await outbox.drainOutbox();

    expect(syncStatus).toHaveBeenCalledWith('ext-200', tenantId, 'em_preparo');
    const { rows } = await harness.db.withTenant(tenantId, (c) =>
      c.query(`SELECT status_envio, sent_at FROM delivery_outbox WHERE pedido_id = $1`, [pedidoId])
    );
    expect(rows[0].status_envio).toBe('SENT');
    expect(rows[0].sent_at).not.toBeNull();
  });

  it('AC#4: falha de envio mantém a mensagem no outbox (PENDING, attempts++)', async () => {
    await pedidos.mudarStatus(tenantId, pedidoId, { status: 'pronto', cause_key: randomUUID() });
    syncStatus.mockRejectedValueOnce(new Error('provedor offline'));

    await outbox.drainOutbox();

    const { rows } = await harness.db.withTenant(tenantId, (c) =>
      c.query(
        `SELECT status_envio, attempts FROM delivery_outbox WHERE pedido_id = $1 AND status = 'pronto'`,
        [pedidoId]
      )
    );
    expect(rows[0].status_envio).toBe('PENDING');
    expect(rows[0].attempts).toBe(1);
  });
});
