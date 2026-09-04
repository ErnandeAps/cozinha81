import { type PgHarness, startPgHarness } from '../../../testing/pg-harness';
import { CozinhaService } from '../cozinhas/cozinha.service';
import { DocumentoService } from './documento.service';
import { NotFoundException } from '@nestjs/common';

jest.setTimeout(180_000);

describe('Repositório de Documentos por Cozinha (Story 8.4)', () => {
  let h: PgHarness;
  let cozinhaSvc: CozinhaService;
  let service: DocumentoService;
  let cozinhaId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    cozinhaSvc = new CozinhaService(h.db);
    service = new DocumentoService(h.db);

    const coz = await cozinhaSvc.criar({ nome: 'Cozinha Compliance', equipada: true });
    cozinhaId = coz.id;
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('permite anexar, listar e remover documentos para uma cozinha (AC-1, AC-2)', async () => {
    const fileMock = {
      originalname: 'alvara.pdf',
      buffer: Buffer.from('conteudo-do-pdf-mock'),
    };

    // 1) Anexar documento
    const doc = await service.anexar(cozinhaId, 'Alvará de Funcionamento', '2026-12-31T23:59:59Z', fileMock);
    expect(doc.id).toBeTruthy();
    expect(doc.cozinha_id).toBe(cozinhaId);
    expect(doc.tipo).toBe('Alvará de Funcionamento');
    expect(doc.arquivo).toContain('alvara.pdf');
    expect(new Date(doc.validade).toISOString()).toBe('2026-12-31T23:59:59.000Z');

    // 2) Listar por cozinha
    const lista = await service.listarPorCozinha(cozinhaId);
    expect(lista).toHaveLength(1);
    expect(lista[0].id).toBe(doc.id);

    // 3) Remover documento
    await service.remover(doc.id);
    const listaVazia = await service.listarPorCozinha(cozinhaId);
    expect(listaVazia).toHaveLength(0);

    // 4) Remover inexistente falha
    await expect(service.remover(doc.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
