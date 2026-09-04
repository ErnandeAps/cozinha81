import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InquilinosComponent } from './inquilinos.component';

describe('InquilinosComponent', () => {
  let fixture: ComponentFixture<InquilinosComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InquilinosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InquilinosComponent);
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    const cozinhasRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/cozinhas'));
    cozinhasRequest.flush([{ id: 'cozinha-1', nome: 'Cozinha A' }]);

    const inquilinosRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos'));
    inquilinosRequest.flush([
      {
        id: 'tenant-1',
        nome: 'Inquilino A',
        cozinhaId: 'cozinha-1',
        nomeFantasia: 'A',
        razaoSocial: 'A',
        cnpj: '00',
        telefone: '11',
        email: 'a@x.com',
        segmento: 'food',
        cep: '',
        logradouro: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        observacoes: '',
        dono: { nome: 'Dono A', email: 'dono@x.com', papel: 'dono_admin', status: 'pendente' },
        modulos: [{ modulo: 'gestao_cozinha', habilitado: true }],
      },
    ]);

    const documentosRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/documentos/cozinha/'));
    documentosRequest.flush([]);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve exibir o repositório de documentos na tela de inquilinos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Repositório de Documentos');
  });
});
