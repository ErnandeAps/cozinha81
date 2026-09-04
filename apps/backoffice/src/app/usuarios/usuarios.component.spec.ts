import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { PERMISSOES_POR_PAPEL, UsuariosComponent } from './usuarios.component';

describe('PERMISSOES_POR_PAPEL', () => {
  it('deve expor os perfis da regra de acesso do sistema', () => {
    expect(PERMISSOES_POR_PAPEL.admin).toContain('dashboard');
    expect(PERMISSOES_POR_PAPEL.admin).toContain('acessos');

    expect(PERMISSOES_POR_PAPEL.gestor).toContain('dashboard');
    expect(PERMISSOES_POR_PAPEL.gestor).not.toContain('acessos');
    expect(PERMISSOES_POR_PAPEL.gestor).not.toContain('billing');

    expect(PERMISSOES_POR_PAPEL.operador).toContain('pedidos');
    expect(PERMISSOES_POR_PAPEL.operador).not.toContain('billing');

    expect(PERMISSOES_POR_PAPEL.cozinha).toContain('cozinhas');
    expect(PERMISSOES_POR_PAPEL.cozinha).not.toContain('billing');
  });
});

describe('UsuariosComponent', () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsuariosComponent, HttpClientTestingModule],
    });
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('não deve cair em fallback localStorage quando a API falhar', () => {
    const fixture = TestBed.createComponent(UsuariosComponent);
    fixture.detectChanges();

    const req = httpMock.expectOne('http://localhost:3000/api/backoffice/usuarios');
    req.flush([], { status: 500, statusText: 'Server Error' });

    expect(localStorage.getItem('backoffice-usuarios')).toBeNull();
    expect(fixture.componentInstance['usuarios']()).toEqual([]);
  });
});
