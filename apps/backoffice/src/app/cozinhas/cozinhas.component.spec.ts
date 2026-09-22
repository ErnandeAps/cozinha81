import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CozinhasComponent } from './cozinhas.component';

describe('CozinhasComponent', () => {
  let fixture: ComponentFixture<CozinhasComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CozinhasComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(CozinhasComponent);
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    const cozinhasRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/cozinhas'));
    cozinhasRequest.flush([
      { id: 'cozinha-1', nome: 'Cozinha A', equipada: true, status: 'liberada', area_m2: 120, criado_em: '2024-01-01', inquilino_id: 'tenant-1', inquilino_nome: 'Inquilino A' },
    ]);

    const reservasRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/reservas/cozinha/cozinha-1'));
    reservasRequest.flush([{ id: 'res-1', cozinha_id: 'cozinha-1', modalidade: 'turno' }]);

    const inquilinosRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos'));
    inquilinosRequest.flush([{ id: 'tenant-1', nome: 'Inquilino A' }]);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve exibir o novo layout da tabela com nome, tamanho, equipamentos e status', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nome');
    expect(compiled.textContent).toContain('Tamanho');
    expect(compiled.textContent).toContain('Equipamentos');
    expect(compiled.textContent).toContain('Status');
    expect(compiled.textContent).not.toContain('Modalidade de Reserva');
    expect(compiled.textContent).toContain('Equipada');
    expect(compiled.textContent).toContain('120 m²');
    expect(compiled.textContent).not.toContain('Inquilino');
    expect(compiled.textContent).toContain('Liberada');
  });

  it('deve indicar corretamente o equipamento e o status da cozinha', () => {
    const component = fixture.componentInstance as any;

    expect(component.obterEquipamentosCozinha({ id: 'cozinha-1', nome: 'Cozinha A', equipada: true, criado_em: '2024-01-01' })).toBe('Equipada');
    expect(component.obterTamanhoCozinha({ id: 'cozinha-1', nome: 'Cozinha A', equipada: false, criado_em: '2024-01-01' })).toBe('—');
  });
});
