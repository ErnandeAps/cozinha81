import { signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EstoqueComponent } from './estoque.component';
import { AuthService } from '../core/auth.service';
import { type Insumo, InsumoApiService } from './insumo-api.service';
import { API_BASE } from '../core/api.config';

const INSUMO_BASE: Insumo = {
  id: 'i1',
  nome: 'Tomate',
  unidade_base: 'kg',
  estoque_minimo: '5',
  lote_validade: false,
  unidade_uso: null,
  fator_conversao: null,
  quantidade_atual: '6',
};

function montar(isDonoAdmin: boolean, lista: Insumo[]): { fixture: ComponentFixture<EstoqueComponent>; el: HTMLElement } {
  TestBed.configureTestingModule({
    imports: [EstoqueComponent],
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: AuthService, useValue: { isDonoAdmin: signal(isDonoAdmin) } },
    ],
  });
  const fixture = TestBed.createComponent(EstoqueComponent);
  fixture.detectChanges(); // ngOnInit → GET /portal/insumos
  const http = TestBed.inject(HttpTestingController);
  http.expectOne(`${API_BASE}/portal/insumos`).flush(lista);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('EstoqueComponent (API-backed)', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('carrega e lista insumos da API', () => {
    const { el } = montar(true, [INSUMO_BASE]);
    expect(el.querySelector('[data-test="tabela"]')).toBeTruthy();
    expect(el.textContent).toContain('Tomate');
  });

  it('Dono/Admin vê ações de escrita (cadastrar, entrada, perda)', () => {
    const { el } = montar(true, [INSUMO_BASE]);
    expect(el.querySelector('[data-test="novo-insumo"]')).toBeTruthy();
    expect(el.querySelector('[data-test="b-entrada"]')).toBeTruthy();
    expect(el.querySelector('[data-test="b-perda"]')).toBeTruthy();
  });

  it('Operador não vê ações de escrita (apenas leitura)', () => {
    const { el } = montar(false, [INSUMO_BASE]);
    expect(el.querySelector('[data-test="novo-insumo"]')).toBeNull();
    expect(el.querySelector('[data-test="b-entrada"]')).toBeNull();
    expect(el.querySelector('[data-test="b-perda"]')).toBeNull();
    expect(el.textContent).toContain('Tomate'); // mas vê o insumo
  });

  it('mostra linha de alerta quando o saldo está no/abaixo do mínimo e permite expansão', () => {
    const abaixo: Insumo = { ...INSUMO_BASE, quantidade_atual: '4' };
    const { fixture, el } = montar(true, [abaixo]);
    expect(el.querySelector('[data-test="alerta-linha"]')).toBeTruthy();
    expect(el.querySelector('[data-test="alertas"]')?.textContent).toContain('ABAIXO DO MÍNIMO');
    
    // Inicialmente o conteúdo com ações está oculto
    expect(el.querySelector('[data-test="alerta-conteudo"]')).toBeNull();

    // Clica no cabeçalho para expandir
    const cabecalho = el.querySelector('[data-test="alerta-cabecalho"]') as HTMLElement;
    cabecalho.click();
    fixture.detectChanges();

    // Conteúdo e botões de ação devem aparecer
    expect(el.querySelector('[data-test="alerta-conteudo"]')).toBeTruthy();
    expect(el.querySelector('[data-test="b-entrada"]')).toBeTruthy();
  });
});
