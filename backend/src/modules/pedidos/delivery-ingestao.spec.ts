import { PedidosService } from './pedidos.service';
import type { NormalizedOrder } from './ports/delivery-types';
import { startPgHarness, seedInquilino, type PgHarness } from '../../testing/pg-harness';

/**
 * Story 7.3 — ingestão automática via inbox (Postgres 18 REAL).
 * Cobre: AC#1 (webhook persiste no inbox via withTenant — prova a RLS canônica),
 * AC#2 (emite ao KDS), AC#4 (idempotência: reentrega/reprocesso não duplica Pedido).
 */
jest.setTimeout(180_000);

function makeOrder(id: string, provider = 'ifood'): NormalizedOrder {
  return {
    id,
    provider,
    status: 'pendente',
    criadoEm: new Date(),
    clienteNome: 'Cliente Teste',
    itens: [{ id: 'i1', nome: 'Item', quantidade: 2, precoUnitario: 1000 }],
    total: 2000,
    pagamentoStatus: 'pago',
  };
}

describe('Ingestão de delivery — inbox/idempotência (Story 7.3)', () => {
  let harness: PgHarness;
  let pedidos: PedidosService;
  let kdsEmit: jest.Mock;
  let tenantId: string;

  beforeAll(async () => {
    harness = await startPgHarness();
    kdsEmit = jest.fn();
    const eventEmitter = { emit: jest.fn() } as any;
    const kdsGateway = { server: { emit: kdsEmit } } as any;
    pedidos = new PedidosService(harness.db, eventEmitter, kdsGateway);
    tenantId = await seedInquilino(harness, 'Cozinha Inbox');
  });

  afterAll(async () => {
    await harness?.stop();
  });

  it('AC#1: o webhook persiste no inbox via withTenant (RLS canônica permite a escrita)', async () => {
    // Caminho do DeliveryWebhookController: withTenant + ON CONFLICT DO NOTHING.
    const inserir = (eventId: string) =>
      harness.db.withTenant(tenantId, (c) =>
        c.query(
          `INSERT INTO delivery_inbox (tenant_id, provider, provider_event_id, payload)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (tenant_id, provider, provider_event_id) DO NOTHING`,
          [tenantId, 'ifood', eventId, { code: 'PLC' }]
        )
      );

    await inserir('evt-1');
    await inserir('evt-1'); // reentrega do mesmo evento — dedup no inbox (AC#4)

    const { rows } = await harness.db.withTenant(tenantId, (c) =>
      c.query(`SELECT status, attempts FROM delivery_inbox WHERE provider_event_id = 'evt-1'`)
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('PENDING');
    expect(rows[0].attempts).toBe(0);
  });

  it('AC#2: processar um pedido de delivery cria o Pedido e emite ao KDS', async () => {
    kdsEmit.mockClear();
    const result: any = await pedidos.processarPedidoDelivery(tenantId, makeOrder('ext-100'));

    expect(result.deduplicated).toBeUndefined();
    expect(result.id).toBeTruthy();
    expect(kdsEmit).toHaveBeenCalledWith('newOrder', expect.objectContaining({ origin: 'ifood' }));

    const { rows } = await harness.db.withTenant(tenantId, (c) =>
      c.query(`SELECT count(*)::int AS n FROM pedido WHERE origem = 'ifood' AND origem_id = 'ext-100'`)
    );
    expect(rows[0].n).toBe(1);
  });

  it('AC#4: reprocessar o mesmo pedido externo é idempotente (não duplica nem reemite)', async () => {
    kdsEmit.mockClear();
    const result: any = await pedidos.processarPedidoDelivery(tenantId, makeOrder('ext-100'));

    expect(result.deduplicated).toBe(true);
    expect(kdsEmit).not.toHaveBeenCalled();

    const { rows } = await harness.db.withTenant(tenantId, (c) =>
      c.query(`SELECT count(*)::int AS n FROM pedido WHERE origem = 'ifood' AND origem_id = 'ext-100'`)
    );
    expect(rows[0].n).toBe(1);
  });
});
