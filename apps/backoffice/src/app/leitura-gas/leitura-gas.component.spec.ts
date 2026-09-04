import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LeituraGasComponent } from './leitura-gas.component';
import { API_BASE } from '../core/api.config';

describe('LeituraGasComponent', () => {
  let fixture: ComponentFixture<LeituraGasComponent>;
  let component: LeituraGasComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeituraGasComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { gasMode: 'abastecimento' } } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LeituraGasComponent);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve renderizar o estado vazio quando a API retorna payload nulo em abastecimento', () => {
    fixture.detectChanges();

    const inquilinosRequest = httpMock.expectOne(`${API_BASE}/backoffice/inquilinos`);
    inquilinosRequest.flush(null);

    const dashboardRequest = httpMock.expectOne(`${API_BASE}/backoffice/gas/dashboard?dataInicio=2026-09-01&dataFim=2026-09-30`);
    dashboardRequest.flush(null);

    expect(component.modoAbastecimento()).toBe(true);
    expect(component.leiturasDoPeriodo()).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Lançar abastecimento no sistema de gás');
  });
});
