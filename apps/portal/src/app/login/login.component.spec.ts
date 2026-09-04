import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoginComponent } from './login.component';
import { API_BASE } from '../core/api.config';

describe('LoginComponent', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('submete credenciais para a API', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      email: { set: (v: string) => void };
      senha: { set: (v: string) => void };
      restauranteSelecionado: { set: (v: string) => void };
      permissaoSelecionada: { set: (v: string) => void };
      entrar: (e: Event) => void;
    };
    inst.email.set('dono@alfa.com');
    inst.senha.set('segredo');
    inst.restauranteSelecionado.set('pizzaria-sabor');
    inst.permissaoSelecionada.set('admin');
    inst.entrar(new Event('submit'));

    const req = http.expectOne(`${API_BASE}/portal/auth/login`);
    expect(req.request.body).toEqual({ email: 'dono@alfa.com', senha: 'segredo' });
    req.flush({ accessToken: 'h.e30.s', usuario: { id: 'u', papel: 'dono_admin', tenantId: 'T1' } });

    const meReq = http.expectOne(`${API_BASE}/portal/auth/me`);
    expect(meReq.request.method).toBe('GET');
    meReq.flush({
      restauranteId: 'rest-1',
      nomeRestaurante: 'Pizzaria Sabor',
      cozinhaId: 'coz-1',
      nomeCozinha: 'Cozinha principal',
      permissoes: ['inicio', 'estoque', 'pedidos'],
    });
  });

  it('aplica as regras de gestor no contexto do restaurante', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as any;

    inst.restauranteSelecionado.set('rest-pytsburguer');
    inst.permissaoSelecionada.set('gestor');

    const contexto = inst.montarContexto();
    expect(contexto.permissoes).toContain('inicio');
    expect(contexto.permissoes).toContain('dashboard_gerencial');
    expect(contexto.permissoes).toContain('estoque');
    expect(contexto.permissoes).not.toContain('integracoes');
  });

  it('mostra erro em credenciais inválidas', () => {
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const inst = fixture.componentInstance as unknown as {
      restauranteSelecionado: { set: (v: string) => void };
      permissaoSelecionada: { set: (v: string) => void };
      entrar: (e: Event) => void;
    };
    inst.restauranteSelecionado.set('pizzaria-sabor');
    inst.permissaoSelecionada.set('admin');
    inst.entrar(new Event('submit'));

    http.expectOne(`${API_BASE}/portal/auth/login`).flush(
      { code: 'HTTP_EXCEPTION', message: 'Credenciais inválidas.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-test="erro"]')?.textContent).toContain(
      'Credenciais inválidas',
    );
  });
});
