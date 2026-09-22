import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { CentroCustoComponent } from './centro-custo.component';

describe('CentroCustoComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CentroCustoComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should calculate the monthly rent using equipment value plus 10% and ROI', () => {
    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;

    component.form.set({
      areaM2: 100,
      equipamentos: 2000,
      servicos: 1500,
      condominio: 1200,
      seguranca: 400,
      manutencao: 800,
      outros: 300,
      equipamentosDetalhes: [
        { id: 'eq-1', nome: 'Forno', valor: 1200 },
        { id: 'eq-2', nome: 'Copa', valor: 800 },
      ],
    });

    component.investimentoInicial.set(20000);
    component.prazoContratoMeses.set(12);
    component.custosFixosMensais.set(0);
    component.roiDesejado.set(30);
    component.reservaManutencao.set(150);

    expect(component.totalMensal()).toBe(6300);
    expect(component.custoPorM2()).toBe(63);
    expect(component.aluguelSugeridoMensal()).toBeCloseTo(682.5, 2);
    expect(component.aluguelSugeridoPorM2()).toBeCloseTo(6.83, 2);
  });

  it('should format and parse BRL input without moving decimal separator', () => {
    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;

    component.alterarAluguelMensal('2.241.790,00');

    expect(component.aluguelMensal()).toBe(2241790);
    expect(component.formatarValorInput(2241790)).toBe('2.241.790,00');
  });

  it('should convert API-cent values back to reais when loading persisted centro de custo', () => {
    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;

    component.aplicarPersistencia({
      aluguelMensal: 135010,
      investimentoInicial: 250000,
      custosFixosMensais: 210000,
      reservaManutencao: 35000,
      taxaAdministracao: 9000,
      form: {
        areaM2: 120,
        equipamentos: 200000,
        servicos: 150000,
        condominio: 120000,
        seguranca: 40000,
        manutencao: 80000,
        outros: 30000,
        equipamentosDetalhes: [{ id: 'eq-1', nome: 'Forno', valor: 130000 }],
      },
    }, null, true);

    expect(component.aluguelMensal()).toBe(1350.1);
    expect(component.investimentoInicial()).toBe(2500);
    expect(component.form().equipamentos).toBe(2000);
    expect(component.form().equipamentosDetalhes?.[0]?.valor).toBe(1300);
  });

  it('should sum all equipment rows with values', () => {
    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;

    component.form.set({
      areaM2: 100,
      equipamentos: 0,
      servicos: 1500,
      condominio: 1200,
      seguranca: 400,
      manutencao: 800,
      outros: 300,
      equipamentosDetalhes: [
        { id: 'eq-1', nome: 'Forno', valor: 1200 },
        { id: 'eq-2', nome: 'Freezer', valor: 900 },
        { id: 'eq-3', nome: 'Exaustor', valor: 300 },
      ],
    });

    expect(component.equipamentosTotais()).toBe(2400);
    expect(component.totalMensal()).toBe(6700);
  });

  it('should persist and reload the base values in localStorage', () => {
    localStorage.clear();

    const firstFixture = TestBed.createComponent(CentroCustoComponent);
    const firstComponent = firstFixture.componentInstance as any;

    firstComponent.form.set({
      areaM2: 120,
      equipamentos: 2200,
      servicos: 1300,
      condominio: 980,
      seguranca: 450,
      manutencao: 700,
      outros: 250,
    });
    firstComponent.investimentoInicial.set(20000);
    firstComponent.prazoContratoMeses.set(12);
    firstComponent.custosFixosMensais.set(350);
    firstComponent.roiDesejado.set(30);
    firstComponent.reservaManutencao.set(150);
    firstComponent.cozinhaSelecionada.set('cozinha-ativa');
    firstComponent.salvar();

    expect(localStorage.getItem('cozinha81-centro-custo')).toContain('"areaM2":120');

    const secondFixture = TestBed.createComponent(CentroCustoComponent);
    const secondComponent = secondFixture.componentInstance as any;
    secondComponent.cozinhaSelecionada.set('cozinha-ativa');

    expect(secondComponent.form().areaM2).toBe(120);
    expect(secondComponent.investimentoInicial()).toBe(20000);
    expect(secondComponent.prazoContratoMeses()).toBe(12);
    expect(secondComponent.custosFixosMensais()).toBe(350);
    expect(secondComponent.roiDesejado()).toBe(30);
    expect(secondComponent.reservaManutencao()).toBe(150);
  });

  it('should persist the cost center through the backend api for the selected kitchen', () => {
    localStorage.clear();

    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;
    const httpMock = TestBed.inject(HttpTestingController);

    component.cozinhas.set([{ id: 'cozinha-1', nome: 'Cozinha 1', areaM2: 120, equipamentos: 1500, servicos: 1200, condominio: 600, seguranca: 250, manutencao: 400, outros: 200 }]);
    component.cozinhaSelecionada.set('cozinha-1');
    component.nomeCozinha.set('Cozinha 1');
    component.form.set({ areaM2: 120, equipamentos: 1500, servicos: 1200, condominio: 600, seguranca: 250, manutencao: 400, outros: 200, equipamentosDetalhes: [] });
    component.investimentoInicial.set(20000);
    component.prazoContratoMeses.set(12);
    component.roiDesejado.set(20);
    component.aluguelMensal.set(4200);
    component.salvar();

    const req = httpMock.expectOne('http://localhost:3000/api/backoffice/centro-custo/cozinha/cozinha-1');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toMatchObject({
      cozinhaId: 'cozinha-1',
      investimentoInicial: 20000,
      prazoContratoMeses: 12,
      roiDesejado: 20,
      aluguelMensal: 4200,
      areaM2: 120,
      equipamentos: 1500,
      servicos: 1200,
      condominio: 600,
      seguranca: 250,
      manutencao: 400,
      outros: 200,
    });

    req.flush({ ok: true });
  });

  it('should load the persisted cost center from the backend when selecting a kitchen', () => {
    localStorage.clear();

    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;
    const httpMock = TestBed.inject(HttpTestingController);

    component.cozinhas.set([{ id: 'cozinha-1', nome: 'Cozinha 1', areaM2: 120, equipamentos: 1500, servicos: 1200, condominio: 600, seguranca: 250, manutencao: 400, outros: 200 }]);
    component.selecionarCozinha('cozinha-1');

    const req = httpMock.expectOne('http://localhost:3000/api/backoffice/centro-custo/cozinha/cozinha-1');
    expect(req.request.method).toBe('GET');

    req.flush({
      cozinha_id: 'cozinha-1',
      nome_cozinha: 'Cozinha 1',
      investimento_inicial: '20000',
      prazo_contrato_meses: 12,
      roi_desejado: '20.00',
      reserva_manutencao: '150',
      aluguel_mensal: '4200',
      area_m2: '120',
      equipamentos: '1500',
      servicos: '1200',
      condominio: '600',
      seguranca: '250',
      manutencao: '400',
      outros: '200',
      equipamentos_detalhes: [],
    });

    expect(component.investimentoInicial()).toBe(20000);
    expect(component.roiDesejado()).toBe(20);
    expect(component.aluguelMensal()).toBe(4200);
    expect(component.form().areaM2).toBe(120);
  });

  it('should deduplicate kitchen names when the list includes repeated entries', () => {
    localStorage.clear();

    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;
    const httpMock = TestBed.inject(HttpTestingController);

    component.cozinhas.set([
      { id: 'cozinha-1', nome: 'Cozinha 1', areaM2: 120, equipamentos: 1500, servicos: 1200, condominio: 600, seguranca: 250, manutencao: 400, outros: 200 },
      { id: 'cozinha-1', nome: 'Cozinha 1', areaM2: 120, equipamentos: 1500, servicos: 1200, condominio: 600, seguranca: 250, manutencao: 400, outros: 200 },
      { id: 'cozinha-2', nome: 'Cozinha 2', areaM2: 80, equipamentos: 900, servicos: 800, condominio: 500, seguranca: 200, manutencao: 300, outros: 100 },
    ]);

    component.carregarCozinhas();
    const req = httpMock.expectOne('http://localhost:3000/api/backoffice/cozinhas');
    req.flush([
      { id: 'cozinha-1', nome: 'Cozinha 1' },
      { id: 'cozinha-2', nome: 'Cozinha 2' },
      { id: 'cozinha-1', nome: 'Cozinha 1' },
    ]);

    expect(component.cozinhas().filter((item: any) => item.nome === 'Cozinha 1')).toHaveLength(1);
    expect(component.cozinhas().map((item: any) => item.nome)).toEqual(['Cozinha 1', 'Cozinha 2']);
  });

  it('should load equipment details from the backend response using snake_case field names', () => {
    localStorage.clear();

    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;
    const httpMock = TestBed.inject(HttpTestingController);

    component.cozinhas.set([{ id: 'cozinha-1', nome: 'Cozinha 1', areaM2: 120, equipamentos: 1500, servicos: 1200, condominio: 600, seguranca: 250, manutencao: 400, outros: 200 }]);
    component.selecionarCozinha('cozinha-1');

    const req = httpMock.expectOne('http://localhost:3000/api/backoffice/centro-custo/cozinha/cozinha-1');
    req.flush({
      cozinha_id: 'cozinha-1',
      nome_cozinha: 'Cozinha 1',
      investimento_inicial: '20000',
      prazo_contrato_meses: 12,
      roi_desejado: '20.00',
      reserva_manutencao: '150',
      aluguel_mensal: '4200',
      area_m2: '120',
      equipamentos: '1500',
      servicos: '1200',
      condominio: '600',
      seguranca: '250',
      manutencao: '400',
      outros: '200',
      equipamentos_detalhes: [
        { id: 'eq-1', nome: 'Forno', valor: 3500 },
        { id: 'eq-2', nome: 'Freezer', valor: 2600 },
      ],
    });

    expect(component.form().equipamentosDetalhes).toEqual([
      { id: 'eq-1', nome: 'Forno', descricao: 'Forno', valor: 3500 },
      { id: 'eq-2', nome: 'Freezer', descricao: 'Freezer', valor: 2600 },
    ]);
    expect(component.equipamentosTotais()).toBe(6100);
  });

  it('should create a real kitchen id in the backend before saving the cost center structure', () => {
    localStorage.clear();

    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;
    const httpMock = TestBed.inject(HttpTestingController);

    component.adicionarCozinhaManual('Cozinha Nova', 160);

    const createKitchenRequest = httpMock.expectOne('http://localhost:3000/api/backoffice/cozinhas');
    expect(createKitchenRequest.request.method).toBe('POST');
    expect(createKitchenRequest.request.body).toMatchObject({ nome: 'Cozinha Nova', equipada: false });

    createKitchenRequest.flush({
      id: '11111111-1111-4111-8111-111111111111',
      nome: 'Cozinha Nova',
      equipada: false,
      criado_em: '2026-09-04T00:00:00.000Z',
    });

    expect(component.cozinhaSelecionada()).toBe('11111111-1111-4111-8111-111111111111');

    component.form.set({
      areaM2: 160,
      equipamentos: 3000,
      servicos: 900,
      condominio: 450,
      seguranca: 250,
      manutencao: 300,
      outros: 150,
      equipamentosDetalhes: [],
    });
    component.investimentoInicial.set(18000);
    component.prazoContratoMeses.set(12);
    component.roiDesejado.set(25);
    component.aluguelMensal.set(3500);
    component.salvar();

    const saveRequest = httpMock.expectOne('http://localhost:3000/api/backoffice/centro-custo/cozinha/11111111-1111-4111-8111-111111111111');
    expect(saveRequest.request.method).toBe('PUT');
    expect(saveRequest.request.body).toMatchObject({
      cozinhaId: '11111111-1111-4111-8111-111111111111',
      nomeCozinha: 'Cozinha Nova',
      areaM2: 160,
      equipamentos: 3000,
    });

    saveRequest.flush({ ok: true });
  });

  it('should keep saved values separate for each kitchen', () => {
    localStorage.clear();

    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;

    component.adicionarCozinhaManual('Cozinha A', 180);
    component.form.set({
      areaM2: 180,
      equipamentos: 4500,
      servicos: 1800,
      condominio: 2600,
      seguranca: 900,
      manutencao: 1200,
      outros: 500,
    });
    component.investimentoInicial.set(15000);
    component.prazoContratoMeses.set(18);
    component.roiDesejado.set(20);
    component.reservaManutencao.set(180);
    component.form.set({
      areaM2: 180,
      equipamentos: 4500,
      servicos: 1800,
      condominio: 2600,
      seguranca: 900,
      manutencao: 1200,
      outros: 500,
      equipamentosDetalhes: [],
    });
    component.custosFixosMensais.set(7000);
    component.salvar();

    component.adicionarCozinhaManual('Cozinha B', 240);
    component.form.set({
      areaM2: 240,
      equipamentos: 6200,
      servicos: 2500,
      condominio: 3100,
      seguranca: 1100,
      manutencao: 1450,
      outros: 700,
    });
    component.investimentoInicial.set(25000);
    component.prazoContratoMeses.set(12);
    component.roiDesejado.set(25);
    component.reservaManutencao.set(200);
    component.form.set({
      areaM2: 240,
      equipamentos: 6200,
      servicos: 2500,
      condominio: 3100,
      seguranca: 1100,
      manutencao: 1450,
      outros: 700,
      equipamentosDetalhes: [],
    });
    component.custosFixosMensais.set(8850);
    component.salvar();

    component.selecionarCozinha('cozinha-a');
    expect(component.form().areaM2).toBe(180);
    expect(component.investimentoInicial()).toBe(15000);
    expect(component.prazoContratoMeses()).toBe(18);
    expect(component.custosFixosMensais()).toBe(7000);
    expect(component.roiDesejado()).toBe(20);
    expect(component.reservaManutencao()).toBe(180);

    component.selecionarCozinha('cozinha-b');
    expect(component.form().areaM2).toBe(240);
    expect(component.investimentoInicial()).toBe(25000);
    expect(component.prazoContratoMeses()).toBe(12);
    expect(component.custosFixosMensais()).toBe(8850);
    expect(component.roiDesejado()).toBe(25);
    expect(component.reservaManutencao()).toBe(200);
  });

  it('should add a new custom kitchen directly from the cost-center screen', () => {
    localStorage.clear();

    const fixture = TestBed.createComponent(CentroCustoComponent);
    const component = fixture.componentInstance as any;

    component.adicionarCozinhaManual('Cozinha Nova', 160);

    expect(component.cozinhas().some((item: any) => item.nome === 'Cozinha Nova')).toBe(true);
    expect(component.cozinhaSelecionada()).toBe('cozinha-nova');
    expect(component.form().areaM2).toBe(160);
  });
});
