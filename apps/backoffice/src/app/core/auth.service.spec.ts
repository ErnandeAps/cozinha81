import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AuthService],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve considerar tokens JWT em base64url como sessão válida do backoffice', () => {
    const payload = {
      sub: 'ops@cozinha81',
      scope: 'platform',
      papel: 'staff',
      exp: 4102444800,
    };

    const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    localStorage.setItem('c81_backoffice_token', `${header}.${body}.signature`);

    const service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBe(true);
  });

  it('deve autenticar usando a resposta real do backend e não um token demo', () => {
    const service = TestBed.inject(AuthService);
    const payload = {
      sub: 'ops@cozinha81',
      scope: 'platform',
      papel: 'staff',
      exp: 4102444800,
    };

    const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${header}.${body}.real-signature`;

    let response: any;
    service.login('ops@cozinha81', 'SenhaForte!23').subscribe((res) => {
      response = res;
    });

    const req = httpMock.expectOne('http://localhost:3000/api/backoffice/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush({ accessToken: token, staff: { id: 'staff-1', nome: 'Staff Cozinha81', papel: 'staff' } });

    expect(response.accessToken).toBe(token);
    expect(localStorage.getItem('c81_backoffice_token')).toBe(token);
    expect(service.isAuthenticated()).toBe(true);
  });

  it('deve tornar o app autenticado imediatamente após o login sem precisar de F5', () => {
    const service = TestBed.inject(AuthService);
    const payload = {
      sub: 'ops@cozinha81',
      scope: 'platform',
      papel: 'staff',
      exp: 4102444800,
    };

    const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const token = `${header}.${body}.real-signature`;

    expect(service.isAuthenticated()).toBe(false);

    service.login('ops@cozinha81', 'SenhaForte!23').subscribe();
    const req = httpMock.expectOne('http://localhost:3000/api/backoffice/auth/login');
    req.flush({ accessToken: token, staff: { id: 'staff-1', nome: 'Staff Cozinha81', papel: 'staff' } });

    expect(service.isAuthenticated()).toBe(true);
    expect(localStorage.getItem('c81_backoffice_token')).toBe(token);
  });

  it('deve usar a URL pública do backend quando o app estiver acessado via ngrok no celular', async () => {
    const previous = (window as any).__COZINHA81_API_BASE__;
    (window as any).__COZINHA81_API_BASE__ = 'https://abc123.ngrok-free.app/api';

    jest.resetModules();
    const { API_BASE } = await import('./api.config');

    expect(API_BASE).toBe('https://abc123.ngrok-free.app/api');

    if (previous === undefined) {
      delete (window as any).__COZINHA81_API_BASE__;
    } else {
      (window as any).__COZINHA81_API_BASE__ = previous;
    }
    jest.resetModules();
  });

  it('deve rejeitar um token demo legado e limpar o armazenamento', () => {
    const payload = {
      sub: 'ops@cozinha81',
      scope: 'platform',
      papel: 'admin',
      exp: 4102444800,
    };

    const header = Buffer.from(JSON.stringify({ typ: 'JWT', alg: 'HS256' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    localStorage.setItem('c81_backoffice_token', `${header}.${body}.demo`);

    const service = TestBed.inject(AuthService);

    expect(service.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('c81_backoffice_token')).toBeNull();
  });
});
