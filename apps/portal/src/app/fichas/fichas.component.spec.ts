import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { FichasComponent } from './fichas.component';
import { AuthService } from '../core/auth.service';
import { API_BASE } from '../core/api.config';

function setup(isDonoAdmin: boolean) {
  TestBed.configureTestingModule({
    imports: [FichasComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: { isDonoAdmin: signal(isDonoAdmin) } },
    ],
  });
  const fixture = TestBed.createComponent(FichasComponent);
  fixture.detectChanges(); // ngOnInit → GET insumos + GET fichas
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`${API_BASE}/portal/insumos`).flush([
    { id: 'ins1', nome: 'Tomate', unidade_base: 'kg', estoque_minimo: null, lote_validade: false, unidade_uso: 'g', fator_conversao: '1000', quantidade_atual: '0' },
  ]);
  http.expectOne(`${API_BASE}/portal/fichas`).flush([{ id: 'f1', nome: 'Molho', rendimento_porcoes: 1 }]);
  fixture.detectChanges();
  return { fixture, http, el: () => fixture.nativeElement as HTMLElement };
}

describe('FichasComponent (Story 3.2)', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('Dono/Admin: lista fichas e busca o custo/porção on-read', () => {
    const { fixture, http, el } = setup(true);
    http.expectOne(`${API_BASE}/portal/fichas/f1/custo`).flush({ custoPorcaoCentavos: '162', metodo: 'ultimo_preco', versao: 1 });
    fixture.detectChanges();
    expect(el().textContent).toContain('Molho');
    expect(el().querySelector('[data-test="custo"]')?.textContent).toContain('1,62'); // R$ 1,62
  });

  it('Operador: vê fichas mas NÃO busca custo (coluna ausente)', () => {
    const { el } = setup(false);
    // nenhuma chamada a /custo deve ocorrer (verify() no afterEach garante)
    expect(el().textContent).toContain('Molho');
    expect(el().querySelector('[data-test="custo"]')).toBeNull();
    expect(el().querySelector('[data-test="nova-ficha"]')).toBeNull();
  });

  it('AC-4 (3.3): detalhe mostra sub-receita indentada com └─', () => {
    const { fixture, http, el } = setup(true);
    http.expectOne(`${API_BASE}/portal/fichas/f1/custo`).flush({ custoPorcaoCentavos: '162' });

    const inst = fixture.componentInstance as unknown as { verDetalhe: (id: string) => void };
    inst.verDetalhe('f1');
    http.expectOne(`${API_BASE}/portal/fichas/f1`).flush({
      id: 'f1',
      nome: 'Molho',
      rendimento_porcoes: 1,
      itens: [{ id: 'it1', insumo_id: null, sub_ficha_id: 'f0', quantidade: '2' }],
    });
    fixture.detectChanges();

    const det = el().querySelector('[data-test="detalhe"]');
    expect(det?.textContent).toContain('└─');
    expect(det?.textContent).toContain('SUB-RECEITA');
  });

  it('cria ficha convertendo a quantidade de uso → base (180 g → 0.18)', () => {
    const { fixture, http, el } = setup(true);
    http.expectOne(`${API_BASE}/portal/fichas/f1/custo`).flush({ custoPorcaoCentavos: '162' });
    fixture.detectChanges();

    const inst = fixture.componentInstance as unknown as {
      abrir: () => void;
      nome: string;
      linhas: { set: (v: { insumoId: string; quantidadeUso: number }[]) => void };
      salvar: (e: Event) => void;
    };
    inst.abrir();
    inst.nome = 'Vinagrete';
    inst.linhas.set([{ insumoId: 'ins1', quantidadeUso: 180 }]);
    inst.salvar(new Event('submit'));

    const req = http.expectOne(`${API_BASE}/portal/fichas`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.itens).toEqual([{ insumoId: 'ins1', quantidade: 0.18 }]); // 180g / 1000 = 0.18 kg
    req.flush({ id: 'f2', nome: 'Vinagrete', rendimento_porcoes: 1, itens: [] });
    // carregar() após salvar só re-busca as fichas (lista vazia → sem chamadas de custo)
    void el;
    http.expectOne(`${API_BASE}/portal/fichas`).flush([]);
  });
});
