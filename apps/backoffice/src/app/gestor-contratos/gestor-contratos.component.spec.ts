import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GestorContratosComponent } from './gestor-contratos.component';

describe('GestorContratosComponent', () => {
  let fixture: ComponentFixture<GestorContratosComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GestorContratosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(GestorContratosComponent);
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    const inquilinosRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos'));
    inquilinosRequest.flush([
      { id: 'tenant-1', nome: 'Inquilino A' },
      { id: 'tenant-2', nome: 'Inquilino B' },
    ]);

    const cozinhasRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/cozinhas'));
    cozinhasRequest.flush([
      { id: 'cozinha-1', nome: 'Cozinha Central' },
      { id: 'cozinha-2', nome: 'Cozinha Leste' },
    ]);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve renderizar o gestor de contratos com os campos principais do contrato', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Gestor de contratos');
    expect(compiled.textContent).toContain('Selecione o inquilino');
    expect(compiled.textContent).toContain('Selecione a cozinha');
    expect(compiled.textContent).toContain('Valor custo da cozinha por hora');
    expect(compiled.textContent).toContain('Permanência em horas por dia');
    expect(compiled.textContent).toContain('Período');
    expect(compiled.textContent).not.toContain('Repositório de Documentos');
    expect(compiled.textContent).toContain('Gestão da cozinha');
    expect(compiled.textContent).toContain('Pedidos KDS');
  });
});
