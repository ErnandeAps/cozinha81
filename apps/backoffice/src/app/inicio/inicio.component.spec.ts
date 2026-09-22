import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_BASE } from '../core/api.config';
import { InicioComponent } from './inicio.component';

describe('InicioComponent', () => {
  let fixture: ComponentFixture<InicioComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve contar cozinhas liberadas sem duplicar o mesmo cadastro', () => {
    fixture.detectChanges();

    const cozinhasRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/cozinhas'));
    cozinhasRequest.flush([
      { id: 'cozinha-1', nome: 'Cozinha 1', equipada: true, status: 'liberada' },
      { id: 'cozinha-1', nome: 'Cozinha 1', equipada: true, status: 'liberada' },
      { id: 'cozinha-2', nome: 'Cozinha 2', equipada: false, status: 'interditada' },
      { id: 'cozinha-3', nome: 'Cozinha 3', equipada: true, status: 'liberada' },
    ]);

    httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos')).flush([]);
    httpMock.expectOne((req) => req.url.includes('/backoffice/reservas')).flush([]);
    httpMock.expectOne((req) => req.url.includes('/backoffice/billing')).flush([]);

    expect((fixture.componentInstance as any).summary().cozinhasLiberadas).toBe(2);
    expect((fixture.componentInstance as any).summary().ocupacao).toBe(67);
    expect((fixture.componentInstance as any).cards()[0].value).toBe('3');
  });
});
