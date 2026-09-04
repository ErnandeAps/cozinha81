import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { API_BASE } from './api.config';

function fakeToken(payload: object): string {
  return `h.${btoa(JSON.stringify(payload))}.s`;
}

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('login: POST, guarda o token e decodifica o principal (papel/tenant)', () => {
    const token = fakeToken({ sub: 'u1', scope: 'tenant', tenantId: 'T1', papel: 'operador' });
    let emitido = false;
    service.login('a@b.com', 'segredo').subscribe(() => (emitido = true));

    const req = http.expectOne(`${API_BASE}/portal/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com', senha: 'segredo' });
    req.flush({ accessToken: token, usuario: { id: 'u1', papel: 'operador', tenantId: 'T1' } });

    const meReq = http.expectOne(`${API_BASE}/portal/auth/me`);
    expect(meReq.request.method).toBe('GET');
    meReq.flush({
      restauranteId: 'rest-1',
      nomeRestaurante: 'Pizzaria Sabor',
      cozinhaId: 'coz-1',
      nomeCozinha: 'Cozinha principal',
      permissoes: ['estoque', 'pedidos', 'custeio'],
    });

    expect(emitido).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.isOperador()).toBe(true);
    expect(service.user()?.tenantId).toBe('T1');
    expect(service.token()).toBe(token);
  });

  it('login: carrega o contexto do restaurante e permissões do backend', () => {
    const token = fakeToken({ sub: 'u1', scope: 'tenant', tenantId: 'T1', papel: 'dono_admin' });

    service.login('a@b.com', 'segredo').subscribe();

    const loginReq = http.expectOne(`${API_BASE}/portal/auth/login`);
    expect(loginReq.request.method).toBe('POST');
    loginReq.flush({ accessToken: token, usuario: { id: 'u1', papel: 'dono_admin', tenantId: 'T1' } });

    const meReq = http.expectOne(`${API_BASE}/portal/auth/me`);
    expect(meReq.request.method).toBe('GET');
    meReq.flush({
      restauranteId: 'rest-1',
      nomeRestaurante: 'Pizzaria Sabor',
      cozinhaId: 'coz-1',
      nomeCozinha: 'Cozinha principal',
      permissoes: ['estoque', 'pedidos', 'custeio'],
    });

    expect(service.restauranteAtivo()?.nomeRestaurante).toBe('Pizzaria Sabor');
    expect(service.temPermissao('estoque')).toBe(true);
    expect(service.temPermissao('integracoes')).toBe(false);
  });

  it('login: POST, guarda o token e decodifica o principal (papel/tenant)', () => {
    const token = fakeToken({ sub: 'u1', scope: 'tenant', tenantId: 'T1', papel: 'operador' });
    let emitido = false;
    service.login('a@b.com', 'segredo').subscribe(() => (emitido = true));

    const req = http.expectOne(`${API_BASE}/portal/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'a@b.com', senha: 'segredo' });
    req.flush({ accessToken: token, usuario: { id: 'u1', papel: 'operador', tenantId: 'T1' } });

    const meReq = http.expectOne(`${API_BASE}/portal/auth/me`);
    expect(meReq.request.method).toBe('GET');
    meReq.flush({
      restauranteId: 'rest-1',
      nomeRestaurante: 'Pizzaria Sabor',
      cozinhaId: 'coz-1',
      nomeCozinha: 'Cozinha principal',
      permissoes: ['estoque', 'pedidos', 'custeio'],
    });

    expect(emitido).toBe(true);
    expect(service.isAuthenticated()).toBe(true);
    expect(service.isOperador()).toBe(true);
    expect(service.user()?.tenantId).toBe('T1');
    expect(service.token()).toBe(token);
  });

  it('seleciona restaurante e permissões da sessão atual', () => {
    const token = fakeToken({ sub: 'u1', scope: 'tenant', tenantId: 'T1', papel: 'dono_admin' });
    service.login('a@b.com', 'x').subscribe();
    http.expectOne(`${API_BASE}/portal/auth/login`).flush({
      accessToken: token,
      usuario: { id: 'u1', papel: 'dono_admin', tenantId: 'T1' },
    });
    http.expectOne(`${API_BASE}/portal/auth/me`).flush({
      restauranteId: 'rest-1',
      nomeRestaurante: 'Pizzaria Sabor',
      cozinhaId: 'coz-1',
      nomeCozinha: 'Cozinha principal',
      permissoes: ['estoque', 'pedidos', 'custeio'],
    });

    service.selecionarRestaurante({
      restauranteId: 'rest-1',
      nomeRestaurante: 'Pizzaria Sabor',
      cozinhaId: 'coz-1',
      nomeCozinha: 'Cozinha principal',
      permissoes: ['estoque', 'pedidos', 'custeio'],
    });

    expect(service.restauranteAtivo()?.nomeRestaurante).toBe('Pizzaria Sabor');
    expect(service.temPermissao('estoque')).toBe(true);
    expect(service.temPermissao('integracoes')).toBe(false);
  });

  it('logout limpa a sessão', () => {
    const token = fakeToken({ sub: 'u1', scope: 'tenant', tenantId: 'T1', papel: 'dono_admin' });
    service.login('a@b.com', 'x').subscribe();
    http.expectOne(`${API_BASE}/portal/auth/login`).flush({
      accessToken: token,
      usuario: { id: 'u1', papel: 'dono_admin', tenantId: 'T1' },
    });
    http.expectOne(`${API_BASE}/portal/auth/me`).flush({
      restauranteId: 'rest-1',
      nomeRestaurante: 'Pizzaria Sabor',
      cozinhaId: 'coz-1',
      nomeCozinha: 'Cozinha principal',
      permissoes: ['estoque', 'pedidos', 'custeio'],
    });
    expect(service.isDonoAdmin()).toBe(true);

    service.logout();
    expect(service.isAuthenticated()).toBe(false);
    expect(service.token()).toBeNull();
  });
});
