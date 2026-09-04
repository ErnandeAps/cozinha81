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
      { id: 'cozinha-1', nome: 'Cozinha A', equipada: true, criado_em: '2024-01-01', inquilino_id: 'tenant-1', inquilino_nome: 'Inquilino A' },
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

  it('deve remover o botão de detalhes e exibir a modalidade de reserva', async () => {
    await fixture.whenStable();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Modalidade de Reserva');
    expect(compiled.textContent).toContain('Turno');
    expect(compiled.textContent).not.toContain('Ver Detalhes');
  });

  it('deve usar a reserva ativa em andamento antes da próxima reserva futura', async () => {
    const component = fixture.componentInstance as any;
    const originalDateNow = Date.now;
    Date.now = () => new Date('2026-01-08T13:00:00Z').getTime();

    try {
      component.carregarModalidadesReserva(['cozinha-1']);

      const reservasRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/reservas/cozinha/cozinha-1'));
      reservasRequest.flush([
        { id: 'almoco', cozinha_id: 'cozinha-1', modalidade: 'almoco', inicio: '2026-01-08T10:00:00Z', fim: '2026-01-08T15:00:00Z' },
        { id: 'jantar', cozinha_id: 'cozinha-1', modalidade: 'jantar', inicio: '2026-01-08T16:00:00Z', fim: '2026-01-08T23:00:00Z' },
      ]);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.obterModalidadeReserva('cozinha-1')).toBe('almoco');
      expect(component.formatarModalidadeReserva(component.obterModalidadeReserva('cozinha-1'))).toBe('Almoço');
    } finally {
      Date.now = originalDateNow;
    }
  });

  it('deve considerar uma cozinha com múltiplas reservas em turnos como disponibilidade por turno', async () => {
    const component = fixture.componentInstance as any;
    const originalDateNow = Date.now;
    Date.now = () => new Date('2026-01-07T12:00:00Z').getTime();

    try {
      component.carregarModalidadesReserva(['cozinha-1']);

      const reservasRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/reservas/cozinha/cozinha-1'));
      reservasRequest.flush([
        { id: 'almoco', cozinha_id: 'cozinha-1', modalidade: 'almoco', inicio: '2026-01-08T10:00:00Z', fim: '2026-01-08T15:00:00Z' },
        { id: 'jantar', cozinha_id: 'cozinha-1', modalidade: 'jantar', inicio: '2026-01-08T16:00:00Z', fim: '2026-01-08T23:00:00Z' },
      ]);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.obterModalidadeReserva('cozinha-1')).toBe('turno');
      expect(component.formatarModalidadeReserva(component.obterModalidadeReserva('cozinha-1'))).toBe('Turno');
    } finally {
      Date.now = originalDateNow;
    }
  });

  it('deve usar a reserva mais recente para a modalidade da cozinha quando não houver intervalo ativo nem futuro', async () => {
    const component = fixture.componentInstance as any;
    const originalDateNow = Date.now;
    Date.now = () => new Date('2026-01-09T08:00:00Z').getTime();

    try {
      component.carregarModalidadesReserva(['cozinha-1']);

      const reservasRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/reservas/cozinha/cozinha-1'));
      reservasRequest.flush([
        { id: 'almoco', cozinha_id: 'cozinha-1', modalidade: 'almoco', inicio: '2026-01-08T10:00:00Z', fim: '2026-01-08T15:00:00Z' },
        { id: 'jantar', cozinha_id: 'cozinha-1', modalidade: 'jantar', inicio: '2026-01-08T16:00:00Z', fim: '2026-01-08T23:00:00Z' },
      ]);

      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.obterModalidadeReserva('cozinha-1')).toBe('jantar');
      expect(component.formatarModalidadeReserva(component.obterModalidadeReserva('cozinha-1'))).toBe('Jantar');
    } finally {
      Date.now = originalDateNow;
    }
  });
});
