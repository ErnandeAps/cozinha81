import { Test, TestingModule } from '@nestjs/testing';
import { OutboxWorkerService } from './outbox-worker.service';
import { DatabaseService } from '../../core/database/database.service';
import { DeliveryProviderFactory } from './ports/delivery-provider.factory';

type QueryCall = { sql: string; params?: any[] };

describe('OutboxWorkerService (Story 7.4)', () => {
  let service: OutboxWorkerService;
  let queries: QueryCall[];
  let syncStatus: jest.Mock;

  function buildDb() {
    queries = [];
    return {
      withPlatform: jest.fn().mockImplementation(async (cb) => {
        const client = {
          query: jest.fn().mockImplementation((sql: string, params?: any[]) => {
            queries.push({ sql, params });
            if (sql.includes('FOR UPDATE SKIP LOCKED')) {
              return Promise.resolve({
                rows: [
                  {
                    id: 'o1',
                    tenant_id: 'tenant-1',
                    provider: 'ifood',
                    origem_id: 'ext-9',
                    status: 'em_preparo',
                    attempts: 0,
                    created_at: new Date(),
                  },
                ],
              });
            }
            return Promise.resolve({ rows: [] });
          }),
        };
        return cb(client);
      }),
    };
  }

  async function buildService(): Promise<void> {
    const db = buildDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxWorkerService,
        { provide: DatabaseService, useValue: db },
        {
          provide: DeliveryProviderFactory,
          useValue: { getAdapter: jest.fn().mockReturnValue({ syncStatus }) },
        },
      ],
    }).compile();
    service = module.get<OutboxWorkerService>(OutboxWorkerService);
  }

  it('AC#1: envia a transição ao provedor via adapter e marca SENT', async () => {
    syncStatus = jest.fn().mockResolvedValue(undefined);
    await buildService();

    await service.drainOutbox();

    expect(syncStatus).toHaveBeenCalledWith('ext-9', 'tenant-1', 'em_preparo');
    expect(queries.some((q) => q.sql.includes("status_envio = 'SENT'"))).toBe(true);
  });

  it('AC#4: falha no envio mantém PENDING para retry com teto de tentativas', async () => {
    syncStatus = jest.fn().mockRejectedValue(new Error('provedor offline'));
    await buildService();

    await service.drainOutbox();

    expect(queries.some((q) => q.sql.includes("status_envio = 'SENT'"))).toBe(false);
    const retry = queries.find((q) => q.sql.includes('attempts = attempts + 1'));
    expect(retry).toBeDefined();
    expect(retry!.sql).toContain("CASE WHEN attempts + 1 >= $1 THEN 'FAILED' ELSE 'PENDING' END");
    expect(retry!.params?.[0]).toBe(OutboxWorkerService.MAX_ATTEMPTS);
  });
});
