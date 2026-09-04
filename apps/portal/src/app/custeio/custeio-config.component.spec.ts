import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CusteioConfigComponent } from './custeio-config.component';
import { API_BASE } from '../core/api.config';

describe('CusteioConfigComponent (Story 3.1)', () => {
  let http: HttpTestingController;
  const url = `${API_BASE}/portal/custeio`;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CusteioConfigComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('quando não definido, exige escolha explícita (sem default)', () => {
    const fixture = TestBed.createComponent(CusteioConfigComponent);
    fixture.detectChanges();
    http.expectOne(url).flush(null);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-test="nao-definido"]')).toBeTruthy();
  });

  it('salvar envia PUT com o método escolhido', () => {
    const fixture = TestBed.createComponent(CusteioConfigComponent);
    fixture.detectChanges();
    http.expectOne(url).flush(null);

    const inst = fixture.componentInstance as unknown as { escolha: string; salvar: (e: Event) => void };
    inst.escolha = 'medio_ponderado';
    inst.salvar(new Event('submit'));

    const req = http.expectOne(url);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ metodo: 'medio_ponderado' });
    req.flush({ metodo: 'medio_ponderado', versao: 1 });
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[data-test="atual"]')?.textContent).toContain('versão 1');
  });
});
