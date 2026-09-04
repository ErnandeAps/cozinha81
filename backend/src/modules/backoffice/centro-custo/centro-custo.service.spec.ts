import { CentroCustoService } from './centro-custo.service';

describe('CentroCustoService', () => {
  it('deve converter valores decimais para centavos antes de persistir', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [{ id: 'c1' }] });
    const client = { query } as any;
    const db = {
      withPlatform: jest.fn(async (fn) => fn(client)),
    } as any;

    const service = new CentroCustoService(db);

    await service.salvarPorCozinha('cozinha-1', {
      cozinhaId: 'cozinha-1',
      nomeCozinha: 'Cozinha Teste',
      investimentoInicial: 2361.25,
      prazoContratoMeses: 12,
      custosFixosMensais: 850.5,
      roiDesejado: 30,
      reservaManutencao: 150,
      aluguelMensal: 2361.25,
      margem: 23.5,
      taxaAdministracao: 12,
      areaM2: 120,
      equipamentos: 500.5,
      servicos: 300,
      condominio: 200,
      seguranca: 100,
      manutencao: 75,
      outros: 50,
      equipamentosDetalhes: [
        { id: 'eq-1', nome: 'Geladeira', valor: 345.5 },
        { id: 'eq-2', nome: 'Forno', valor: 210.25 },
      ],
    });

    expect(query).toHaveBeenCalledTimes(1);
    const args = query.mock.calls[0][1];
    expect(args[2]).toBe(236125);
    expect(args[7]).toBe(236125);
    expect(args[10]).toBe(120);
    expect(args[11]).toBe(50050);
    expect(args[17]).toBe(JSON.stringify([
      { id: 'eq-1', nome: 'Geladeira', valor: 34550 },
      { id: 'eq-2', nome: 'Forno', valor: 21025 },
    ]));
  });
});
