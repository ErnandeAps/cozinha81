import { type PgHarness, startPgHarness, seedInquilino } from '../../../testing/pg-harness';
import { CozinhaService } from '../cozinhas/cozinha.service';
import { DocumentoService } from '../documentos/documento.service';
import { AlertaService } from './alerta.service';
import { ReservaService } from '../reservas/reserva.service';

jest.setTimeout(180_000);

describe('Alerta de Vencimento de Documento (Story 8.5)', () => {
  let h: PgHarness;
  let cozinhaSvc: CozinhaService;
  let documentoSvc: DocumentoService;
  let service: AlertaService;
  let reservaSvc: ReservaService;
  let cozinhaId: string;
  let tenantId: string;

  beforeAll(async () => {
    h = await startPgHarness();
    cozinhaSvc = new CozinhaService(h.db);
    documentoSvc = new DocumentoService(h.db);
    service = new AlertaService(h.db);
    reservaSvc = new ReservaService(h.db);

    tenantId = await seedInquilino(h, 'Tenant');
    const coz = await cozinhaSvc.criar({ nome: 'Cozinha Alertas', equipada: true });
    cozinhaId = coz.id;
  });

  afterAll(async () => {
    await h?.stop();
  });

  it('ignora documentos sem cozinha_id ao sincronizar alertas', async () => {
    const validadeProxima = new Date();
    validadeProxima.setDate(validadeProxima.getDate() + 5);

    await documentoSvc.anexarParaInquilino(
      tenantId,
      'Documento sem cozinha',
      validadeProxima.toISOString(),
      { originalname: 'sem-cozinha.pdf', buffer: Buffer.from('mock') }
    );

    await expect(service.sincronizarAlertas()).resolves.toBeUndefined();

    const alertas = await service.obterAlertasAtivos();
    expect(alertas.some((a) => a.documento_tipo === 'Documento sem cozinha')).toBe(false);
  });

  it('gera alerta para documento vencendo em < 30 dias, mas não para documento válido por mais tempo (AC-1)', async () => {
    // 1. Criar um documento válido por 60 dias (não deve gerar alerta)
    const validadeFutura = new Date();
    validadeFutura.setDate(validadeFutura.getDate() + 60);

    const docValido = await documentoSvc.anexar(
      cozinhaId,
      'Alvará Valido',
      validadeFutura.toISOString(),
      { originalname: 'valido.pdf', buffer: Buffer.from('mock') }
    );

    // Sincronizar e verificar: sem alertas
    await service.sincronizarAlertas();
    let alertas = await service.obterAlertasAtivos();
    expect(alertas.some((a) => a.documento_id === docValido.id)).toBe(false);

    // 2. Criar um documento vencendo em 10 dias (deve gerar alerta)
    const validadeProxima = new Date();
    validadeProxima.setDate(validadeProxima.getDate() + 10);

    const docExpirando = await documentoSvc.anexar(
      cozinhaId,
      'Alvará Expirando',
      validadeProxima.toISOString(),
      { originalname: 'expirando.pdf', buffer: Buffer.from('mock') }
    );

    // Sincronizar e verificar: deve ter o alerta do expirando
    await service.sincronizarAlertas();
    alertas = await service.obterAlertasAtivos();
    expect(alertas.some((a) => a.documento_id === docExpirando.id)).toBe(true);

    // 3. Renovar o documento (mudar validade para +60 dias) e verificar que o alerta some
    const validadeNova = new Date();
    validadeNova.setDate(validadeNova.getDate() + 60);

    // Mock update: deleta o antigo e adiciona novo renovado (ou atualiza na tabela)
    await h.adminPool.query('UPDATE documento SET validade = $1 WHERE id = $2', [
      validadeNova.toISOString(),
      docExpirando.id,
    ]);

    await service.sincronizarAlertas();
    alertas = await service.obterAlertasAtivos();
    expect(alertas.some((a) => a.documento_id === docExpirando.id)).toBe(false);
  });

  it('documento vencido ou expirando NÃO bloqueia reservas/operações (AC-2)', async () => {
    // 1. Forçar documento expirado no banco
    const vencido = new Date();
    vencido.setDate(vencido.getDate() - 5);

    const docVencido = await documentoSvc.anexar(
      cozinhaId,
      'Alvará Vencido',
      vencido.toISOString(),
      { originalname: 'vencido.pdf', buffer: Buffer.from('mock') }
    );

    // Sincronizar e verificar alerta ativo
    await service.sincronizarAlertas();
    const alertas = await service.obterAlertasAtivos();
    expect(alertas.some((a) => a.documento_id === docVencido.id)).toBe(true);

    // 2. Tentar efetuar uma reserva na cozinha com documento vencido
    const res = await reservaSvc.criar(cozinhaId, {
      inicio: '2026-08-01T08:00:00Z',
      fim: '2026-08-01T12:00:00Z',
      modalidade: 'turno',
      tenantId,
    });

    expect(res.id).toBeTruthy();
    expect(res.cozinha_id).toBe(cozinhaId);
  });
});
