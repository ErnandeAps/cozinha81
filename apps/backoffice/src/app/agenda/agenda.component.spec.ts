import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgendaComponent } from './agenda.component';

describe('AgendaComponent', () => {
  let fixture: ComponentFixture<AgendaComponent>;
  let component: AgendaComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgendaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(AgendaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('deve ignorar a própria reserva ao editar e usar a data final no cálculo do intervalo', () => {
    const reservaAtual = {
      id: 'res-1',
      tenant_id: 'tenant-1',
      cozinha_id: 'cozinha-1',
      inicio: '2026-09-02T08:00:00Z',
      fim: '2026-09-03T12:00:00Z',
      modalidade: 'turno' as const,
    };

    (component as any).reservas.set([reservaAtual]);
    component['reservaEditandoId'].set('res-1');
    component['form'] = {
      cozinhaId: 'cozinha-1',
      tenantId: 'tenant-1',
      modalidade: 'turno',
      data: '2026-09-02',
      dataFim: '2026-09-03',
      turno: 'manha',
      inicioManual: '06:00',
      fimManual: '10:00',
    };

    component['verificarConflitos']();

    expect(component['temConflito']()).toBe(false);
    expect(component['calcularHorarios']()).toEqual({
      inicio: '2026-09-02T08:00:00Z',
      fim: '2026-09-03T12:00:00Z',
    });
  });
});
