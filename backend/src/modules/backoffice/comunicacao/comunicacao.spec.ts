import { type PgHarness, seedInquilino, startPgHarness } from '../../../testing/pg-harness';
import { ComunicacaoService } from './comunicacao.service';
import { BadRequestException } from '@nestjs/common';

jest.setTimeout(180_000);

describe('ComunicacaoService', () => {
  let h: PgHarness;
  let service: ComunicacaoService;
  let tenantId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    service = new ComunicacaoService(h.db);
    tenantId = await seedInquilino(h, 'Tenant Comunicação');
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('cria, lista e valida comunicação para todos ou para um inquilino específico', async () => {
    const geral = await service.criar({
      titulo: 'Manutenção do sistema',
      mensagem: 'Haverá manutenção às 23h.',
      tipo: 'Urgente',
      destinatario: 'todos',
    });

    expect(geral.id).toBeTruthy();
    expect(geral.destinatario).toBe('todos');
    expect(geral.tenant_id).toBeNull();

    const porTenant = await service.criar({
      titulo: 'Atualização de regras',
      mensagem: 'Novas regras entram em vigor a partir de amanhã.',
      tipo: 'Informativo',
      destinatario: 'inquilino',
      tenantId,
    });

    expect(porTenant.destinatario).toBe('inquilino');
    expect(porTenant.tenant_id).toBe(tenantId);

    const lista = await service.listar();
    expect(lista.some((item) => item.id === geral.id)).toBe(true);
    expect(lista.some((item) => item.id === porTenant.id)).toBe(true);

    await expect(service.criar({
      titulo: '',
      mensagem: 'faltou título',
      tipo: 'Informativo',
      destinatario: 'todos',
    })).rejects.toBeInstanceOf(BadRequestException);
  });
});
