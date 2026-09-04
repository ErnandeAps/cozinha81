import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProducaoComponent } from './producao.component';
import { AuthService } from '../core/auth.service';
import { API_BASE } from '../core/api.config';

function setup(isDonoAdmin = false, producoes: unknown[] = [
  { id: 'p1', ficha_id: 'f1', quantidade: '3', status_baixa: 'baixado', cause_key: null, criado_em: '2026-06-27T10:00:00Z' },
]) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ProducaoComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: { isDonoAdmin: signal(isDonoAdmin) } },
    ],
  });
  const fixture = TestBed.createComponent(ProducaoComponent);
  fixture.detectChanges(); // ngOnInit → GET fichas (+ config se dono) + GET producoes
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`${API_BASE}/portal/fichas`).flush([{ id: 'f1', nome: 'Molho', rendimento_porcoes: 1 }]);
  if (isDonoAdmin) {
    http.expectOne(`${API_BASE}/portal/producoes/config`).flush({ modoBaixa: 'automatico' });
  }
  http.expectOne(`${API_BASE}/portal/producoes`).flush(producoes);
  fixture.detectChanges();
  return { fixture, http, el: () => fixture.nativeElement as HTMLElement };
}

describe('ProducaoComponent (Story 4.1)', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('lista as produções resolvendo o nome da Ficha', () => {
    const { el } = setup();
    expect(el().querySelector('[data-test="linha-producao"]')?.textContent).toContain('Molho');
    expect(el().querySelector('[data-test="linha-producao"]')?.textContent).toContain('3');
  });

  it('produção sem ficha aparece como "Sem ficha" e dispara o aviso', () => {
    const { el } = setup(false, [
      { id: 'p9', ficha_id: null, quantidade: '2', status_baixa: 'sem_ficha', cause_key: null, criado_em: '2026-06-27T11:00:00Z' },
    ]);
    expect(el().querySelector('[data-test="linha-producao"]')?.textContent).toContain('Sem ficha');
    expect(el().querySelector('[data-test="aviso-sem-ficha"]')).not.toBeNull();
  });

  it('registra produção (POST) com causeKey e recarrega a lista', () => {
    const { fixture, http } = setup();
    const inst = fixture.componentInstance as unknown as { fichaId: string; quantidade: number; salvar: (e: Event) => void };
    inst.fichaId = 'f1';
    inst.quantidade = 5;
    inst.salvar(new Event('submit'));

    const req = http.expectOne(`${API_BASE}/portal/producoes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.fichaId).toBe('f1');
    expect(req.request.body.quantidade).toBe(5);
    expect(typeof req.request.body.causeKey).toBe('string'); // idempotência (AD-6)
    req.flush({ id: 'p2', ficha_id: 'f1', quantidade: '5', status_baixa: 'baixado', cause_key: req.request.body.causeKey, criado_em: '2026-06-27T12:00:00Z' });
    http.expectOne(`${API_BASE}/portal/producoes`).flush([]);
  });

  it('produção avulsa envia fichaId null', () => {
    const { fixture, http } = setup();
    const inst = fixture.componentInstance as unknown as { fichaId: string; quantidade: number; salvar: (e: Event) => void };
    inst.fichaId = '';
    inst.quantidade = 2;
    inst.salvar(new Event('submit'));

    const req = http.expectOne(`${API_BASE}/portal/producoes`);
    expect(req.request.body.fichaId).toBeNull();
    expect(req.request.body.quantidade).toBe(2);
    req.flush({ id: 'p3', ficha_id: null, quantidade: '2', status_baixa: 'sem_ficha', cause_key: req.request.body.causeKey, criado_em: '2026-06-27T12:30:00Z' });
    http.expectOne(`${API_BASE}/portal/producoes`).flush([]);
  });
});

describe('ProducaoComponent — modo de baixa (Story 4.3)', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('Operador NÃO vê o controle de modo de baixa', () => {
    const { el } = setup(false);
    expect(el().querySelector('[data-test="config-modo"]')).toBeNull();
  });

  it('Dono/Admin vê o controle e troca o modo (PUT /config)', () => {
    const { fixture, http, el } = setup(true);
    expect(el().querySelector('[data-test="config-modo"]')).not.toBeNull();

    const inst = fixture.componentInstance as unknown as { trocarModo: (m: 'manual' | 'automatico') => void };
    inst.trocarModo('manual');
    const req = http.expectOne(`${API_BASE}/portal/producoes/config`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ modoBaixa: 'manual' });
    req.flush({ modoBaixa: 'manual' });
  });

  it('produção pendente expõe a ação Baixar (POST :id/baixa) e recarrega', () => {
    const { fixture, http, el } = setup(true, [
      { id: 'pp', ficha_id: 'f1', quantidade: '1', status_baixa: 'pendente', cause_key: null, criado_em: '2026-06-27T13:00:00Z' },
    ]);
    expect(el().querySelector('[data-test="baixar"]')).not.toBeNull();

    const inst = fixture.componentInstance as unknown as { baixar: (id: string) => void };
    inst.baixar('pp');
    const req = http.expectOne(`${API_BASE}/portal/producoes/pp/baixa`);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'pp', ficha_id: 'f1', quantidade: '1', status_baixa: 'baixado', cause_key: null, criado_em: '2026-06-27T13:00:00Z' });
    http.expectOne(`${API_BASE}/portal/producoes`).flush([]);
  });
});
