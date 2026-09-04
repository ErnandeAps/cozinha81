import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { CentralGlpComponent } from './central-glp.component';

describe('CentralGlpComponent', () => {
  let fixture: ComponentFixture<CentralGlpComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-15T12:00:00Z'));

    await TestBed.configureTestingModule({
      imports: [CentralGlpComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { data: of({ section: 'fechamento' }) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CentralGlpComponent);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.useRealTimers();
  });

  it('deve manter a visão global de relatórios sem fixar o primeiro inquilino automaticamente', () => {
    const component = fixture.componentInstance as any;

    const inquilinosRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos'));
    inquilinosRequest.flush([
      { id: 'tenant-1', nome: 'Fae Colônia' },
      { id: 'tenant-2', nome: 'Inquilino B' },
    ]);

    const gasRequest = httpMock.match((req) => req.url.includes('/backoffice/central-glp/leituras/dashboard'));
    gasRequest.forEach((request) => request.flush([]));

    const fechamentoRequest = httpMock.match((req) => req.url.includes('/backoffice/central-glp/fechamento') && req.params.get('tenantId'));
    fechamentoRequest.forEach((request) => request.flush([]));

    component.tenantId.set('');
    component.gasFiltroTenant.set('');
    component.formFechamento.inquilinoId = '';

    expect(component.tenantId()).toBe('');
    expect(component.gasFiltroTenant()).toBe('');
    expect(component.formFechamento.inquilinoId).toBe('');
  });

  it('deve exibir um estado de seleção quando a tela de abastecimentos abrir sem inquilino', () => {
    const staleRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos'));
    staleRequest.flush([
      { id: 'tenant-1', nome: 'Inquilino A' },
      { id: 'tenant-2', nome: 'Inquilino B' },
    ]);

    httpMock.match((req) => req.url.includes('/backoffice/central-glp/fechamento')).forEach((request) => request.flush([]));
    httpMock.match((req) => req.url.includes('/backoffice/central-glp/leituras/dashboard')).forEach((request) => request.flush([]));

    fixture.destroy();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [CentralGlpComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { data: of({ section: 'abastecimentos' }) } },
      ],
    });

    const localFixture = TestBed.createComponent(CentralGlpComponent);
    const localHttpMock = TestBed.inject(HttpTestingController);
    const localComponent = localFixture.componentInstance as any;

    const inquilinosRequest = localHttpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos'));
    inquilinosRequest.flush([
      { id: 'tenant-1', nome: 'Inquilino A' },
      { id: 'tenant-2', nome: 'Inquilino B' },
    ]);

    const gasDashboardRequest = localHttpMock.expectOne((req) => req.url.includes('/backoffice/central-glp/leituras/dashboard'));
    gasDashboardRequest.flush([]);

    const centralRequest = localHttpMock.expectOne((req) => req.url.includes('/backoffice/central-glp/central') && req.params.get('tenantId') === 'tenant-1');
    centralRequest.flush(null);

    const abastecimentosRequest = localHttpMock.expectOne((req) => req.url.includes('/backoffice/central-glp/abastecimentos') && req.params.get('tenantId') === 'tenant-1');
    abastecimentosRequest.flush([]);

    localFixture.detectChanges();

    expect(localComponent.tenantId()).toBe('tenant-1');
    expect(localFixture.nativeElement.textContent).toContain('Registrar abastecimento da central');
    expect(localFixture.nativeElement.textContent).not.toContain('Selecione a central do inquilino para registrar o abastecimento.');

    localHttpMock.verify();
  });

  it('deve usar o valor unitário do inquilino no resumo financeiro', () => {
    const inquilinosRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos'));
    inquilinosRequest.flush([
      { id: 'tenant-1', nome: 'Inquilino A' },
      { id: 'tenant-2', nome: 'Inquilino B' },
    ]);

    const component = fixture.componentInstance as any;

    const fechamentoRequests = httpMock.match((req) => req.url.includes('/backoffice/central-glp/fechamento') && req.params.get('tenantId'));
    fechamentoRequests.forEach((request) => request.flush([]));

    const gasDashboardRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/central-glp/leituras/dashboard'));
    gasDashboardRequest.flush([]);

    component.gasDashboard.set([
      { id: 'l-1', tenantId: 'tenant-1', nomeInquilino: 'Inquilino A', dataLeitura: '2026-06-01', leituraInicial: 10, leituraFinal: 20, consumoKg: 10 },
      { id: 'l-2', tenantId: 'tenant-2', nomeInquilino: 'Inquilino B', dataLeitura: '2026-06-02', leituraInicial: 25, leituraFinal: 35, consumoKg: 10 },
    ]);
    component.central.set({ valorUnitarioKgInquilino: 0 } as any);
    component.precosPorTenant.set({
      'tenant-1': 12.5,
      'tenant-2': 9.75,
    });

    expect(component.relatorioFinanceiro()).toEqual([
      { nome: 'Inquilino A', totalKg: 10, valorUnitarioKg: 12.5, valorCobrado: 125 },
      { nome: 'Inquilino B', totalKg: 10, valorUnitarioKg: 9.75, valorCobrado: 97.5 },
    ]);
  });

  it('deve mostrar todos os fechamentos mais recentes primeiro e separar leituras pendentes por inquilino', () => {
    const inquilinosRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos'));
    inquilinosRequest.flush([
      { id: 'tenant-1', nome: 'Inquilino A' },
      { id: 'tenant-2', nome: 'Inquilino B' },
    ]);

    const component = fixture.componentInstance as any;

    component.fechamentosGlobais.set([
      { id: 'f-2', tenantId: 'tenant-1', nomeInquilino: 'Inquilino A', mes: '2026-06', consumoTotalKg: 20, custoPeriodo: 120, valorFaturado: 120, perdasKg: 0, saldoFinalKg: 140, criadoEm: '2026-06-10T00:00:00Z' },
      { id: 'f-1', tenantId: 'tenant-2', nomeInquilino: 'Inquilino B', mes: '2026-05', consumoTotalKg: 30, custoPeriodo: 180, valorFaturado: 180, perdasKg: 0, saldoFinalKg: 100, criadoEm: '2026-05-10T00:00:00Z' },
    ]);
    component.fechamentos.set([
      { id: 'f-2', tenantId: 'tenant-1', nomeInquilino: 'Inquilino A', mes: '2026-06', consumoTotalKg: 20, custoPeriodo: 120, valorFaturado: 120, perdasKg: 0, saldoFinalKg: 140, criadoEm: '2026-06-10T00:00:00Z' },
    ]);

    component.formFechamento.inquilinoId = 'tenant-1';
    component.leiturasCentral.set([
      { id: 'l-1', tenantId: 'tenant-1', nomeInquilino: 'Inquilino A', dataLeitura: '2026-06-10', leituraInicial: 10, leituraFinal: 25, consumoM3: 15, consumoKg: 20, observacao: '' },
      { id: 'l-2', tenantId: 'tenant-2', nomeInquilino: 'Inquilino B', dataLeitura: '2026-05-12', leituraInicial: 8, leituraFinal: 18, consumoM3: 10, consumoKg: 18, observacao: '' },
    ]);

    const tenantFechamentoRequests = httpMock.match((req) => req.url.includes('/backoffice/central-glp/fechamento') && req.params.get('tenantId') === 'tenant-1');
    tenantFechamentoRequests.forEach((request) => request.flush([{ id: 'f-2', tenantId: 'tenant-1', nomeInquilino: 'Inquilino A', mes: '2026-06', consumoTotalKg: 20, custoPeriodo: 120, valorFaturado: 120, perdasKg: 0, saldoFinalKg: 140, criadoEm: '2026-06-10T00:00:00Z' }]));

    const globalFechamentoRequests = httpMock.match((req) => req.url.includes('/backoffice/central-glp/fechamento') && req.params.get('tenantId') === 'tenant-2');
    globalFechamentoRequests.forEach((request) => request.flush([{ id: 'f-1', tenantId: 'tenant-2', nomeInquilino: 'Inquilino B', mes: '2026-05', consumoTotalKg: 30, custoPeriodo: 180, valorFaturado: 180, perdasKg: 0, saldoFinalKg: 100, criadoEm: '2026-05-10T00:00:00Z' }]));

    httpMock.match((req) => req.url.includes('/backoffice/central-glp/leituras/dashboard')).forEach((request) => request.flush([]));

    const remaining = httpMock.match((req) => req.url.includes('/backoffice/central-glp/fechamento') && req.params.get('tenantId') === 'tenant-1');
    remaining.forEach((request) => request.flush([{ id: 'f-2', tenantId: 'tenant-1', nomeInquilino: 'Inquilino A', mes: '2026-06', consumoTotalKg: 20, custoPeriodo: 120, valorFaturado: 120, perdasKg: 0, saldoFinalKg: 140, criadoEm: '2026-06-10T00:00:00Z' }]));

    expect(component.fechamentosGlobais().map((item: any) => item.mes)).toEqual(['2026-06', '2026-05']);
    expect(component.leiturasAguardandoFechamento().map((item: any) => item.id)).toEqual(['l-1']);
    expect(component.fechamentosDoInquilino().map((item: any) => item.id)).toEqual(['f-2']);
  });

  it('deve ignorar a central em cache ao trocar de inquilino antes do fechamento', () => {
    fixture.detectChanges();

    const inquilinosRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos'));
    inquilinosRequest.flush([
      { id: 'tenant-1', nome: 'Inquilino A' },
      { id: 'tenant-2', nome: 'Inquilino B' },
    ]);

    const component = fixture.componentInstance as any;
    component.central.set({
      id: 'central-antiga',
      nomeCentral: 'Central antiga',
      capacidadeTotalKg: 100,
      capacidadeCilindrosKg: 2,
      capacidadePorCilindroKg: 50,
      estoqueAtualKg: 10,
      estoqueMinimoKg: 5,
      estoqueCriticoKg: 2,
      valorUnitarioKgFornecedor: 5,
      valorUnitarioKgInquilino: 9,
      unidadeCompra: 'kg',
      unidadeMedicao: 'm3',
      fatorConversao: 1,
      statusCentral: 'ativa',
      atualizadoEm: '2026-06-01T00:00:00Z',
    });
    component.formFechamento.inquilinoId = 'tenant-2';
    component.leiturasCentral.set([
      { id: 'l-2', tenantId: 'tenant-2', nomeInquilino: 'Inquilino B', dataLeitura: '2026-06-11', leituraInicial: 20, leituraFinal: 25, consumoM3: 5, consumoKg: 5, observacao: '' },
    ]);

    component.salvarFechamento();

    const centralRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/central-glp/central') && req.params.get('tenantId') === 'tenant-2');
    centralRequest.flush({
      id: 'central-nova',
      nomeCentral: 'Central nova',
      capacidadeTotalKg: 500,
      capacidadeCilindrosKg: 5,
      capacidadePorCilindroKg: 100,
      estoqueAtualKg: 150,
      estoqueMinimoKg: 20,
      estoqueCriticoKg: 10,
      valorUnitarioKgFornecedor: 8,
      valorUnitarioKgInquilino: 12,
      unidadeCompra: 'kg',
      unidadeMedicao: 'm3',
      fatorConversao: 1,
      statusCentral: 'ativa',
      atualizadoEm: '2026-06-15T12:00:00Z',
    });

    const postRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/central-glp/fechamento') && req.method === 'POST');
    expect(postRequest.request.body).toEqual({
      tenantId: 'tenant-2',
      mes: '2026-06',
      custoPorKg: 12,
      valorFaturado: 60,
    });

    postRequest.flush({
      id: 'fechamento-2',
      mes: '2026-06',
      consumoTotalKg: 5,
      custoPeriodo: 60,
      valorFaturado: 60,
      perdasKg: 0,
      saldoFinalKg: 150,
      criadoEm: '2026-06-15T12:00:00Z',
    });

    const reloadFechamentos = httpMock.match((req) => req.url.includes('/backoffice/central-glp/fechamento') && req.method === 'GET');
    reloadFechamentos.forEach((request) => request.flush([]));
    const gasDashboardRequest = httpMock.match((req) => req.url.includes('/backoffice/central-glp/leituras/dashboard'));
    gasDashboardRequest.forEach((request) => request.flush([]));

    expect(component.erro()).toBeNull();
  });

  it('deve fechar o mês usando o mês atual e o payload real do backend', () => {
    fixture.detectChanges();

    const inquilinosRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/inquilinos'));
    inquilinosRequest.flush([{ id: 'tenant-1', nome: 'Inquilino A' }]);

    const gasDashboardRequests = httpMock.match((req) => req.url.includes('/backoffice/central-glp/leituras/dashboard'));
    gasDashboardRequests.forEach((request) => request.flush([]));

    const component = fixture.componentInstance as any;
    component.selecionarInquilino('tenant-1');

    const centralRequests = httpMock.match((req) => req.url.includes('/backoffice/central-glp/central') && req.params.get('tenantId') === 'tenant-1');
    centralRequests.forEach((request) => request.flush({
      id: 'central-1',
      nomeCentral: 'Central do GLP',
      capacidadeTotalKg: 500,
      capacidadeCilindrosKg: 5,
      capacidadePorCilindroKg: 100,
      estoqueAtualKg: 150,
      estoqueMinimoKg: 20,
      estoqueCriticoKg: 10,
      valorUnitarioKgFornecedor: 8,
      valorUnitarioKgInquilino: 12,
      unidadeCompra: 'kg',
      unidadeMedicao: 'm3',
      fatorConversao: 1,
      statusCentral: 'ativa',
      atualizadoEm: '2026-06-15T12:00:00Z',
    }));

    const abastecimentosRequests = httpMock.match((req) => req.url.includes('/backoffice/central-glp/abastecimentos') && req.params.get('tenantId') === 'tenant-1');
    abastecimentosRequests.forEach((request) => request.flush([]));

    const leiturasRequests = httpMock.match((req) => req.url.includes('/backoffice/central-glp/leituras') && req.params.get('tenantId') === 'tenant-1');
    leiturasRequests.forEach((request) => request.flush([
      { id: 'leitura-1', data: '2026-06-10', leituraAnterior: 20, leituraAtual: 25, consumoM3: 5, consumoKg: 5, unidade: 'm3', fatorConversao: 1 },
    ]));

    const dashboardRequests = httpMock.match((req) => req.url.includes('/backoffice/central-glp/dashboard'));
    dashboardRequests.forEach((request) => request.flush({
      estoqueAtualKg: 150,
      percentualCapacidade: 30,
      consumoTotalKg: 5,
      totalAbastecimentosKg: 100,
      custoMedioKg: 10,
      valorFaturado: 50,
      previsaoAutonomiaDias: 14,
      alertaEstoque: 'baixo',
      movimentos: [],
    }));

    const fechamentosRequests = httpMock.match((req) => req.url.includes('/backoffice/central-glp/fechamento') && req.params.get('tenantId') === 'tenant-1');
    fechamentosRequests.forEach((request) => request.flush([]));

    component.central.set({
      id: 'central-1',
      nomeCentral: 'Central do GLP',
      capacidadeTotalKg: 500,
      capacidadeCilindrosKg: 5,
      capacidadePorCilindroKg: 100,
      estoqueAtualKg: 150,
      estoqueMinimoKg: 20,
      estoqueCriticoKg: 10,
      valorUnitarioKgFornecedor: 8,
      valorUnitarioKgInquilino: 12,
      unidadeCompra: 'kg',
      unidadeMedicao: 'm3',
      fatorConversao: 1,
      statusCentral: 'ativa',
      atualizadoEm: '2026-06-15T12:00:00Z',
    });
    component.leiturasCentral.set([
      { id: 'leitura-1', tenantId: 'tenant-1', nomeInquilino: 'Inquilino A', dataLeitura: '2026-06-10', leituraInicial: 20, leituraFinal: 25, consumoM3: 5, consumoKg: 5, observacao: '' },
    ]);

    component.formFechamento = {
      inquilinoId: 'tenant-1',
      periodoInicio: '',
      periodoFim: '',
      dataFechamento: '',
    } as any;

    component.salvarFechamento();

    const postRequest = httpMock.expectOne((req) => req.url.includes('/backoffice/central-glp/fechamento') && req.method === 'POST');
    expect(postRequest.request.body).toEqual({
      tenantId: 'tenant-1',
      mes: '2026-06',
      custoPorKg: 12,
      valorFaturado: 60,
    });

    postRequest.flush({
      id: 'fechamento-1',
      mes: '2026-06',
      consumoTotalKg: 5,
      custoPeriodo: 60,
      valorFaturado: 60,
      perdasKg: 0,
      saldoFinalKg: 150,
      criadoEm: '2026-06-15T12:00:00Z',
    });

    const fechamentosReloadRequests = httpMock.match((req) => req.url.includes('/backoffice/central-glp/fechamento') && req.params.get('tenantId') === 'tenant-1' && req.method === 'GET');
    expect(fechamentosReloadRequests.length).toBeGreaterThan(0);
    fechamentosReloadRequests[0].flush([{ id: 'fechamento-1', mes: '2026-06', consumoTotalKg: 5, custoPeriodo: 60, valorFaturado: 60, perdasKg: 0, saldoFinalKg: 150, criadoEm: '2026-06-15T12:00:00Z' }]);

    expect(component.fechamentoSalvo()).toContain('2026-06');
    expect(component.fechamentoSalvo()).toContain('60,00');
  });

});
