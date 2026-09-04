import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CmvComponent } from './cmv.component';
import { API_BASE } from '../core/api.config';

const PERIODO = {
  competencia: '2026-06', de: '', ate: '', metodo: 'ultimo_preco', versao: 1, asOf: '',
  cmvValorCentavos: '12345', faturamentoCentavos: '50000', faturamentoOrigem: 'manual', cmvPercentual: '24.69',
};

describe('CmvComponent (Stories 5.1/5.2/5.3)', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  function setup(periodo: Record<string, unknown> = PERIODO) {
    TestBed.configureTestingModule({
      imports: [CmvComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const fixture = TestBed.createComponent(CmvComponent);
    fixture.detectChanges(); // ngOnInit → GET fichas + GET periodo
    const http = TestBed.inject(HttpTestingController);
    http.expectOne(`${API_BASE}/portal/fichas`).flush([{ id: 'f1', nome: 'Molho', rendimento_porcoes: 1 }]);
    http.expectOne((r) => r.url === `${API_BASE}/portal/cmv/periodo`).flush(periodo);
    http.expectOne(`${API_BASE}/portal/cmv/fichas/f1/unitario`).flush({
      fichaId: 'f1', metodo: 'ultimo_preco', versao: 1, asOf: '', cmvUnitarioCentavos: '775',
    });
    fixture.detectChanges();
    return { fixture, http, el: () => fixture.nativeElement as HTMLElement };
  }

  it('5.1: mostra o CMV unitário por ficha', () => {
    const { el } = setup();
    expect(el().querySelector('[data-test="cmv-unitario"]')?.textContent).toContain('7,75');
  });

  it('5.2: mostra o CMV em valor do período', () => {
    const { el } = setup();
    expect(el().querySelector('[data-test="cmv-valor"]')?.textContent).toContain('123,45');
  });

  it('5.3: mostra o CMV% na métrica-herói accent (ink+flame)', () => {
    const { el } = setup();
    const card = el().querySelector('[data-test="cmv-percentual"]');
    expect(card?.getAttribute('data-accent')).toBe('ink-flame');
    expect(card?.textContent).toContain('24.69%');
  });

  it('5.3: faturamento de Pedidos é sinalizado', () => {
    const { el } = setup({ ...PERIODO, faturamentoOrigem: 'pedidos' });
    expect(el().querySelector('[data-test="cmv-percentual"]')?.textContent).toContain('AUTOMÁTICO');
  });

  it('5.3: salva o faturamento (PUT) e recarrega o período', () => {
    const { fixture, http } = setup();
    const inst = fixture.componentInstance as unknown as { faturamento: number; salvarFaturamento: () => void };
    inst.faturamento = 60000;
    inst.salvarFaturamento();

    const req = http.expectOne(`${API_BASE}/portal/cmv/faturamento`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ competencia: new Date().toISOString().slice(0, 7), valorCentavos: 60000 });
    req.flush({});
    // carregarPeriodo() re-busca período (e os custos unitários das fichas)
    http.expectOne((r) => r.url === `${API_BASE}/portal/cmv/periodo`).flush(PERIODO);
  });
});
