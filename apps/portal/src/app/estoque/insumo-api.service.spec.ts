import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { InsumoApiService } from './insumo-api.service';
import { API_BASE } from '../core/api.config';

describe('InsumoApiService', () => {
  let api: InsumoApiService;
  let http: HttpTestingController;
  const base = `${API_BASE}/portal/insumos`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(InsumoApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('listar: GET na base', () => {
    api.listar().subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('criar: POST na base', () => {
    api.criar({ nome: 'X', unidade_base: 'kg' }).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('registrarEntrada: POST em /entradas', () => {
    api.registrarEntrada({ insumoId: 'i1', quantidade: 10, precoCentavos: 5, causeKey: 'k' }).subscribe();
    const req = http.expectOne(`${base}/entradas`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('registrarPerda: POST em /:id/perdas', () => {
    api.registrarPerda('i1', { quantidade: 3, motivo: 'quebra', causeKey: 'k' }).subscribe();
    const req = http.expectOne(`${base}/i1/perdas`);
    expect(req.request.method).toBe('POST');
    req.flush({});
  });

  it('alertasAtivos: GET em /alertas/ativos', () => {
    api.alertasAtivos().subscribe();
    const req = http.expectOne(`${base}/alertas/ativos`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('novaCauseKey gera UUID', () => {
    expect(api.novaCauseKey()).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
