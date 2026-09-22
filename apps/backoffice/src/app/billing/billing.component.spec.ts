import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BillingComponent } from './billing.component';

describe('BillingComponent', () => {
  let fixture: ComponentFixture<BillingComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BillingComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(BillingComponent);
    httpMock = TestBed.inject(HttpTestingController);

    fixture.detectChanges();

    httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos')).flush([
      { id: 'tenant-1', nome: 'Inquilino A' },
    ]);

    httpMock.expectOne((req) => req.url.includes('/backoffice/billing')).flush([
      {
        id: 'fatura-1',
        tenant_id: 'tenant-1',
        periodo_inicio: '2026-09-01T00:00:00Z',
        periodo_fim: '2026-09-30T23:59:59Z',
        status: 'aberta',
        valor_total: 25000,
        criado_em: '2026-09-01T00:00:00Z',
      },
    ]);

    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
  });

  it('deve renderizar um botão para gerar relatório de faturamento para impressão', async () => {
    const printWindow = {
      document: {
        write: jest.fn(),
        close: jest.fn(),
      },
      focus: jest.fn(),
      print: jest.fn(),
    } as unknown as Window;

    const openSpy = jest.spyOn(window, 'open').mockReturnValue(printWindow);

    const button = fixture.nativeElement.querySelector('[data-test="btn-relatorio"]') as HTMLButtonElement | null;

    expect(button).not.toBeNull();

    button!.click();

    const detalheRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/billing/fatura-1'));
    detalheRequest.flush({
      id: 'fatura-1',
      tenant_id: 'tenant-1',
      periodo_inicio: '2026-09-01T00:00:00Z',
      periodo_fim: '2026-09-30T23:59:59Z',
      status: 'aberta',
      valor_total: 25000,
      criado_em: '2026-09-01T00:00:00Z',
      itens: [
        { id: 'item-1', fatura_id: 'fatura-1', tipo: 'aluguel', descricao: 'Aluguel mensal', valor: 25000, origem_id: null, criado_em: '2026-09-01T00:00:00Z' },
      ],
    });

    await fixture.whenStable();

    expect(openSpy).toHaveBeenCalled();
    expect(printWindow.document.write).toHaveBeenCalled();
    expect(printWindow.print).toHaveBeenCalled();
  });
});
