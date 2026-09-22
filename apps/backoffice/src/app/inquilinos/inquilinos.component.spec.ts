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

    const documentosRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/documentos/inquilino/'));
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

  it('deve usar inquilino em vez de cozinha no campo do repositório de documentos', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    const campo = compiled.querySelector('select[name="inquilinoDocumentos"]') as HTMLSelectElement | null;

    expect(campo).not.toBeNull();
    expect(compiled.textContent).toContain('Inquilino');
    expect(compiled.textContent).not.toContain('Selecione uma cozinha');
  });

  it('deve carregar os documentos do inquilino selecionado', () => {
    const component = fixture.componentInstance as any;
    component.inquilinos.set([
      { id: 'tenant-1', nome: 'Inquilino A', cozinhaId: 'cozinha-1' },
      { id: 'tenant-2', nome: 'Inquilino B', cozinhaId: 'cozinha-2' },
    ]);

    component.selecionarInquilinoDocumentos('tenant-2');

    const documentoRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/documentos/inquilino/tenant-2'));
    documentoRequest.flush([]);

    expect(component.inquilinoDocumentosId).toBe('tenant-2');
    expect(component.cozinhaDocumentosId).toBe('cozinha-2');
  });

  it('deve preservar a seleção do inquilino mesmo quando ele não tem cozinha vinculada', () => {
    const component = fixture.componentInstance as any;
    component.inquilinos.set([
      { id: 'tenant-1', nome: 'Inquilino A' },
      { id: 'tenant-2', nome: 'Inquilino B', cozinhaId: 'cozinha-2' },
    ]);

    component['selecionarPrimeiroInquilinoComCozinha']();

    const documentoRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/documentos/inquilino/tenant-1'));
    documentoRequest.flush([]);

    expect(component.inquilinoDocumentosId).toBe('tenant-1');
    expect(component.cozinhaDocumentosId).toBe('');
  });

  it('deve manter o formulário de documentos visível para inquilinos sem cozinha vinculada', () => {
    const component = fixture.componentInstance as any;
    component.inquilinos.set([{ id: 'tenant-sem-cozinha', nome: 'Inquilino sem cozinha' }]);
    component.selecionarInquilinoDocumentos('tenant-sem-cozinha');
    fixture.detectChanges();

    const documentoRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/documentos/inquilino/tenant-sem-cozinha'));
    documentoRequest.flush([]);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(component.inquilinoDocumentosId).toBe('tenant-sem-cozinha');
    expect(component.cozinhaDocumentosId).toBe('');
    expect(compiled.textContent).toContain('Tipo de Documento');
    expect(compiled.textContent).toContain('Inquilino sem cozinha');
    expect(compiled.textContent).not.toContain('ainda não possui cozinha vinculada');
  });

  it('deve exibir apenas os campos principais do cadastro do inquilino', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.textContent).toContain('Nome do restaurante');
    expect(compiled.textContent).toContain('Nome do dono/admin');
    expect(compiled.textContent).not.toContain('Cozinha vinculada');
    expect(compiled.textContent).not.toContain('Aluguel sugerido');
    expect(compiled.textContent).not.toContain('Valor do contrato');
  });

  it('deve transportar o aluguel sugerido do centro de custo ao selecionar a cozinha vinculada', () => {
    const component = fixture.componentInstance as any;
    component.selecionarCozinha('cozinha-1');

    const centroCustoRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/centro-custo/cozinha/cozinha-1'));
    centroCustoRequest.flush({
      aluguel_sugerido: 4200,
      aluguel_mensal: 3500,
    });

    expect(component.formulario.cozinhaId).toBe('cozinha-1');
    expect(component.formulario.aluguelSugerido).toBeCloseTo(4200, 2);
    expect(component.formulario.valorContrato).toBeGreaterThan(0);
  });

  it('não deve expor o campo de cozinha no cadastro do inquilino', () => {
    const forms = Array.from(fixture.nativeElement.querySelectorAll('form')) as HTMLFormElement[];
    const formularioCadastroTemCozinha = forms.some((form) => form.querySelector('select[name="cozinhaId"]') !== null);

    expect(formularioCadastroTemCozinha).toBeFalsy();
  });

  it('não deve disparar duas vezes o cadastro enquanto a primeira requisição ainda está pendente', () => {
    const component = fixture.componentInstance as any;
    component.formulario = {
      id: null,
      cozinhaId: 'cozinha-1',
      nome: 'Restaurante Z',
      razaoSocial: 'Restaurante Z Ltda',
      nomeFantasia: 'Z',
      cnpj: '00.000.000/0001-00',
      telefone: '(11) 99999-0000',
      email: 'contato@z.com',
      segmento: 'food',
      cep: '01000-000',
      logradouro: 'Rua A',
      numero: '123',
      bairro: 'Centro',
      cidade: 'São Paulo',
      estado: 'SP',
      observacoes: '',
      donoNome: 'Dono Z',
      donoEmail: 'dono@z.com',
      modulos: ['gestao_cozinha'],
    };

    component.salvar(new Event('submit'));
    component.salvar(new Event('submit'));

    const postRequests = httpMock.match((req) => req.method === 'POST' && req.url.includes('/backoffice/inquilinos'));
    expect(postRequests).toHaveLength(1);

    postRequests[0].flush({ ok: true });

    const reloadRequest = httpMock.expectOne((req) => req.method === 'GET' && req.url.includes('/backoffice/inquilinos'));
    reloadRequest.flush([]);
  });

  it('deve usar PUT ao atualizar um inquilino existente em vez de criar um novo registro', () => {
    const component = fixture.componentInstance as any;
    component.formulario = {
      id: 'tenant-1',
      cozinhaId: 'cozinha-1',
      nome: 'Inquilino A atualizado',
      razaoSocial: 'A',
      nomeFantasia: 'A',
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
      donoNome: 'Dono A',
      donoEmail: 'dono@x.com',
      modulos: ['gestao_cozinha'],
    };

    component.salvar(new Event('submit'));

    const request = httpMock.expectOne((req) => req.method === 'PUT' && req.url.includes('/backoffice/inquilinos/tenant-1'));
    expect(request.request.body).toMatchObject({ nome: 'Inquilino A atualizado', cozinhaId: 'cozinha-1' });
    request.flush({ ok: true });

    const reloadRequest = httpMock.expectOne((req) => req.method === 'GET' && req.url.includes('/backoffice/inquilinos'));
    reloadRequest.flush([]);
  });
});
