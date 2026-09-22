import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, computed, effect, inject, signal, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

interface CozinhaCustoBase {
  id: string;
  nome: string;
  areaM2: number;
  equipamentos: number;
  servicos: number;
  condominio: number;
  seguranca: number;
  manutencao: number;
  outros: number;
}

interface EquipamentoCustoItem {
  id: string;
  nome: string;
  descricao?: string;
  valor: number;
}

interface CentroCustoForm {
  areaM2: number;
  equipamentos: number;
  servicos: number;
  condominio: number;
  seguranca: number;
  manutencao: number;
  outros: number;
  equipamentosDetalhes?: EquipamentoCustoItem[];
}

interface CentroCustoPersistido {
  nomeCozinha?: string;
  investimentoInicial?: number;
  prazoContratoMeses?: number;
  custosFixosMensais?: number;
  roiDesejado?: number;
  reservaManutencao?: number;
  aluguelMensal?: number;
  margem?: number;
  taxaAdministracao?: number;
  form: CentroCustoForm & {
    investimentoInicial?: number;
    prazoContratoMeses?: number;
    custosFixosMensais?: number;
    roiDesejado?: number;
    reservaManutencao?: number;
    aluguelMensal?: number;
  };
}

const COZINHAS_BASE: CozinhaCustoBase[] = [];

@Component({
  selector: 'app-centro-custo',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header style="padding: var(--space-6);">
      <span class="c81-eyebrow">ADMINISTRAÇÃO</span>
      <h1 style="margin: 0; font-size: 2rem;">Centro de custo</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6); display: grid; gap: var(--space-6);">
      <c81-card [pad]="true">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); align-items: end;">
          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
            Nome da Cozinha
            <select class="c81-input" [ngModel]="cozinhaSelecionada()" (ngModelChange)="selecionarCozinha($event)">
              @for (cozinha of cozinhas(); track cozinha.id) {
                <option [value]="cozinha.id">{{ cozinha.nome }}</option>
              }
            </select>
          </label>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
            Investimento inicial
            <input class="c81-input" type="number" min="0" [ngModel]="investimentoInicial()" (ngModelChange)="investimentoInicial.set($event)" name="investimentoInicial" />
          </label>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
            Prazo do contrato (meses)
            <input class="c81-input" type="number" min="1" [ngModel]="prazoContratoMeses()" (ngModelChange)="prazoContratoMeses.set($event)" name="prazoContratoMeses" />
          </label>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
            ROI desejado (%)
            <input class="c81-input" type="number" min="0" [ngModel]="roiDesejado()" (ngModelChange)="roiDesejado.set($event)" name="roiDesejado" />
          </label>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
            Reserva de manutenção
            <input class="c81-input" type="number" min="0" [ngModel]="reservaManutencao()" (ngModelChange)="reservaManutencao.set($event)" name="reservaManutencao" />
          </label>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
            Área (m²)
            <input class="c81-input" type="number" min="0" [ngModel]="form().areaM2" (ngModelChange)="atualizarCampo('areaM2', $event)" name="areaM2" />
          </label>

          <div style="padding: var(--space-3); border-radius: 10px; background: rgba(255,255,255,0.02); border: var(--hairline); display: flex; flex-direction: column; gap: var(--space-1);">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Aluguel mensal</div>
            <input
              class="c81-input"
              type="text"
              inputmode="decimal"
              [ngModel]="formatarValorInput(aluguelMensal())"
              (ngModelChange)="alterarAluguelMensal($event)"
              name="aluguelMensal"
              placeholder="0,00"
              style="font-size: 1.4rem; font-weight: 700; min-height: 2.8rem; border: none; background: transparent; padding: 0; box-shadow: none; color: var(--text-primary); text-align: left;"
            />
          </div>

          <div style="padding: var(--space-3); border-radius: 10px; background: rgba(255,255,255,0.02); border: var(--hairline);">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Custo mensal</div>
            <strong style="font-size: 1.7rem;">{{ formatarMoeda(totalMensal()) }}</strong>
          </div>

          <div style="padding: var(--space-3); border-radius: 10px; background: rgba(255,255,255,0.02); border: var(--hairline);">
            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Aluguel sugerido</div>
            <strong style="font-size: 1.7rem;">{{ formatarMoeda(aluguelSugeridoMensal()) }}</strong>
          </div>
        </div>
      </c81-card>

      <c81-card [pad]="true">
        <h2 style="margin-top: 0; margin-bottom: var(--space-4);">Estrutura de custos da cozinha</h2>

        <div style="display: grid; gap: var(--space-4); align-items: start;">
          <div style="display: flex; flex-direction: column; gap: var(--space-3); min-width: 280px; max-width: 460px; border: var(--hairline); border-radius: 12px; padding: var(--space-4); background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); box-sizing: border-box;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); padding-bottom: var(--space-2); border-bottom: var(--hairline);">
              <span style="font-weight: 700; font-size: 1rem;">Equipamentos</span>
              <c81-button type="button" variant="secondary" (click)="adicionarEquipamento()">+ Equipamento</c81-button>
            </div>

            <div style="display: grid; gap: var(--space-2);">
              @if (form().equipamentosDetalhes?.length) {
                <div style="overflow: hidden; border-radius: 10px; border: var(--hairline); background: rgba(10, 10, 14, 0.2);">
                  <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 0.9rem;">
                    <thead style="background: rgba(255,255,255,0.04);">
                      <tr>
                        <th style="width: 56%; text-align: left; padding: var(--space-2); font-weight: 700;">Descrição</th>
                        <th style="width: 24%; text-align: right; padding: var(--space-2); font-weight: 700;">Valor</th>
                        <th style="width: 20%; text-align: right; padding: var(--space-2); font-weight: 700;">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (equipamento of form().equipamentosDetalhes ?? []; track equipamento.id) {
                        <tr style="border-top: var(--hairline);">
                          <td style="padding: var(--space-2);">
                            <input
                              class="c81-input"
                              type="text"
                              [ngModel]="equipamento.nome || equipamento.descricao || ''"
                              (ngModelChange)="atualizarEquipamento(equipamento.id, 'nome', $event)"
                              [name]="'equipamento-nome-' + equipamento.id"
                              placeholder="Descrição"
                              style="font-size: 0.9rem; width: 100%;"
                            />
                          </td>
                          <td style="padding: var(--space-2); text-align: right;">
                            <input
                              class="c81-input"
                              type="number"
                              min="0"
                              [ngModel]="equipamento.valor"
                              (ngModelChange)="atualizarEquipamento(equipamento.id, 'valor', $event)"
                              [name]="'equipamento-valor-' + equipamento.id"
                              placeholder="0"
                              style="font-size: 0.9rem; width: 100%; text-align: right;"
                            />
                          </td>
                          <td style="padding: var(--space-2); text-align: right;">
                            <c81-button type="button" variant="ghost" (click)="removerEquipamento(equipamento.id)">Remover</c81-button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }

              @if (!(form().equipamentosDetalhes?.length)) {
                <div style="display: grid; gap: var(--space-2); padding: var(--space-2); border: var(--hairline); border-radius: 10px; background: rgba(0,0,0,0.02);">
                  <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; font-size: 0.74rem; color: var(--text-secondary);">
                    Valor total
                    <input class="c81-input" type="number" min="0" [ngModel]="form().equipamentos" (ngModelChange)="atualizarCampo('equipamentos', $event)" name="equipamentos" placeholder="0" />
                  </label>
                </div>
              }

            </div>
          </div>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; max-width: 180px;">
            Serviços
            <input class="c81-input" type="number" min="0" [ngModel]="form().servicos" (ngModelChange)="atualizarCampo('servicos', $event)" name="servicos" />
          </label>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; max-width: 180px;">
            Condomínio
            <input class="c81-input" type="number" min="0" [ngModel]="form().condominio" (ngModelChange)="atualizarCampo('condominio', $event)" name="condominio" />
          </label>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; max-width: 180px;">
            Segurança
            <input class="c81-input" type="number" min="0" [ngModel]="form().seguranca" (ngModelChange)="atualizarCampo('seguranca', $event)" name="seguranca" />
          </label>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; max-width: 180px;">
            Manutenção
            <input class="c81-input" type="number" min="0" [ngModel]="form().manutencao" (ngModelChange)="atualizarCampo('manutencao', $event)" name="manutencao" />
          </label>

          <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; max-width: 180px;">
            Outros
            <input class="c81-input" type="number" min="0" [ngModel]="form().outros" (ngModelChange)="atualizarCampo('outros', $event)" name="outros" />
          </label>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-4);">
          <c81-button type="button" variant="secondary" (click)="resetarBase()">Usar base padrão</c81-button>
          <c81-button type="button" variant="primary" (click)="salvar()">Salvar centro de custo</c81-button>
        </div>
      </c81-card>

    </div>
  `,
})
export class CentroCustoComponent implements OnInit {
  private static readonly STORAGE_KEY = 'cozinha81-centro-custo';
  private readonly http = inject(HttpClient, { optional: true });

  protected readonly cozinhas = signal<CozinhaCustoBase[]>([]);
  protected readonly cozinhaSelecionada = signal('');
  protected readonly nomeCozinha = signal('');
  protected readonly investimentoInicial = signal(0);
  protected readonly prazoContratoMeses = signal(12);
  protected readonly custosFixosMensais = signal(0);
  protected readonly roiDesejado = signal(30);
  protected readonly reservaManutencao = signal(0);
  protected readonly margem = this.roiDesejado;
  protected readonly taxaAdministracao = signal(0);

  protected readonly form = signal<CentroCustoForm>({
    areaM2: 0,
    equipamentos: 0,
    servicos: 0,
    condominio: 0,
    seguranca: 0,
    manutencao: 0,
    outros: 0,
    equipamentosDetalhes: [],
  });

  protected formatarMoeda(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      style: 'currency',
      currency: 'BRL',
    }).format(Number.isFinite(valor) ? valor : 0);
  }

  protected formatarValorInput(valor: number): string {
    return Number.isFinite(valor)
      ? new Intl.NumberFormat('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(valor)
      : '0,00';
  }

  protected valorEquipamento(equipamento: Partial<EquipamentoCustoItem> | null | undefined): number {
    return Number(equipamento?.valor ?? 0);
  }

  protected alterarAluguelMensal(valor: string | number): void {
    const texto = String(valor ?? '').trim();
    if (!texto) {
      this.aluguelMensal.set(0);
      this.aluguelMensalManual.set(true);
      return;
    }

    let normalizado = texto.replace(/\s/g, '');

    if (normalizado.includes(',') && normalizado.includes('.')) {
      normalizado = normalizado.replace(/\./g, '').replace(',', '.');
    } else if (normalizado.includes(',')) {
      normalizado = normalizado.replace(',', '.');
    }

    normalizado = normalizado.replace(/[^\d.]/g, '');
    const partes = normalizado.split('.');
    if (partes.length > 2) {
      normalizado = `${partes.shift()}.${partes.join('')}`;
    }

    const numero = Number(normalizado);
    this.aluguelMensal.set(Number.isFinite(numero) ? numero : 0);
    this.aluguelMensalManual.set(true);
  }

  constructor() {
    effect(() => {
      if (!this.aluguelMensalManual()) {
        this.aluguelMensal.set(this.aluguelSugeridoMensal());
      }
    });

    this.carregarPersistencia();
  }

  ngOnInit(): void {
    this.carregarCozinhas();
  }

  protected readonly equipamentosTotais = computed(() => {
    const detalhes = this.form().equipamentosDetalhes ?? [];
    if (detalhes.length > 0) {
      return detalhes.reduce((total, item) => total + Number(item.valor || 0), 0);
    }

    return Number(this.form().equipamentos || 0);
  });

  protected readonly totalMensal = computed(() => {
    const dados = this.form();
    return (
      Number(dados.areaM2 || 0) +
      Number(this.equipamentosTotais()) +
      Number(dados.servicos || 0) +
      Number(dados.condominio || 0) +
      Number(dados.seguranca || 0) +
      Number(dados.manutencao || 0) +
      Number(dados.outros || 0)
    );
  });

  protected readonly custoPorM2 = computed(() => {
    const area = Number(this.form().areaM2 || 0);
    if (!area) {
      return 0;
    }
    return this.totalMensal() / area;
  });

  protected readonly aluguelSugeridoMensal = computed(() => {
    const custoMensal = this.totalMensal();
    const roi = Number(this.roiDesejado() || 0) / 100;

    return (custoMensal * (1 + roi)) / 12;
  });

  protected readonly aluguelMensal = signal(0);
  protected readonly aluguelMensalManual = signal(false);

  protected readonly aluguelSugeridoPorM2 = computed(() => {
    const area = Number(this.form().areaM2 || 0);
    if (!area) {
      return 0;
    }
    return this.aluguelSugeridoMensal() / area;
  });

  protected atualizarCampo(chave: keyof CentroCustoForm, valor: number | string): void {
    const atual = this.form();
    const numero = Number(valor ?? 0);
    const proximo = {
      ...atual,
      [chave]: numero,
    };

    this.form.set(proximo);

    if (['servicos', 'condominio', 'seguranca', 'manutencao', 'outros'].includes(chave as string)) {
      this.custosFixosMensais.set(
        Number(proximo.servicos || 0) +
          Number(proximo.condominio || 0) +
          Number(proximo.seguranca || 0) +
          Number(proximo.manutencao || 0) +
          Number(proximo.outros || 0)
      );
    }
  }

  protected adicionarEquipamento(): void {
    const atual = this.form();
    const novo: EquipamentoCustoItem = {
      id: `equip-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      nome: '',
      descricao: '',
      valor: 0,
    };

    this.form.set({
      ...atual,
      equipamentosDetalhes: [...(atual.equipamentosDetalhes ?? []), novo],
    });
  }

  protected atualizarEquipamento(id: string, chave: 'nome' | 'valor', valor: string | number): void {
    const atual = this.form();
    const detalhes = [...(atual.equipamentosDetalhes ?? [])];
    const itemIndex = detalhes.findIndex((item) => item.id === id);
    if (itemIndex === -1) {
      return;
    }

    const itemAtual = detalhes[itemIndex];
    detalhes[itemIndex] = {
      ...itemAtual,
      ...(chave === 'valor'
        ? { valor: Number(valor ?? 0) }
        : {
            nome: String(valor ?? ''),
            descricao: String(valor ?? ''),
          }),
    };

    const totalDetalhes = detalhes.reduce((total, item) => total + Number(item.valor || 0), 0);
    this.form.set({
      ...atual,
      equipamentosDetalhes: detalhes,
      equipamentos: detalhes.length > 0 ? totalDetalhes : atual.equipamentos,
    });
  }

  protected removerEquipamento(id: string): void {
    const atual = this.form();
    const detalhes = (atual.equipamentosDetalhes ?? []).filter((item) => item.id !== id);
    const totalDetalhes = detalhes.reduce((total, item) => total + Number(item.valor || 0), 0);

    this.form.set({
      ...atual,
      equipamentosDetalhes: detalhes,
      equipamentos: detalhes.length > 0 ? totalDetalhes : 0,
    });
  }

  protected adicionarCozinhaManual(nome: string, areaM2: number): void {
    const nomeLimpo = nome?.trim();
    const area = Number(areaM2 || 0);

    if (!nomeLimpo || !area) {
      return;
    }

    const baseName = nomeLimpo
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/^cozinha\s+/, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    const tempId = `cozinha-${baseName || Date.now()}`;
    const localCozinha: CozinhaCustoBase = {
      id: tempId,
      nome: nomeLimpo,
      areaM2: area,
      equipamentos: 0,
      servicos: 0,
      condominio: 0,
      seguranca: 0,
      manutencao: 0,
      outros: 0,
    };

    const listaAtual = this.cozinhas();
    const jaExiste = listaAtual.some((item) => item.id === tempId || item.nome.toLowerCase() === nomeLimpo.toLowerCase());
    if (!jaExiste) {
      this.cozinhas.set([...listaAtual, localCozinha]);
    }

    this.cozinhaSelecionada.set(tempId);
    this.nomeCozinha.set(nomeLimpo);
    this.investimentoInicial.set(0);
    this.prazoContratoMeses.set(12);
    this.roiDesejado.set(30);
    this.reservaManutencao.set(0);
    this.custosFixosMensais.set(0);
    this.form.set({ areaM2: localCozinha.areaM2, equipamentos: 0, servicos: 0, condominio: 0, seguranca: 0, manutencao: 0, outros: 0, equipamentosDetalhes: [] });

    if (!this.http) {
      return;
    }

    const payload = { nome: nomeLimpo, equipada: false };
    this.http.post<{ id: string; nome: string; equipada: boolean; criado_em?: string }>(`${API_BASE}/backoffice/cozinhas`, payload).subscribe({
      next: (cozinhaCriada) => {
        const cozinhaAtualizada: CozinhaCustoBase = {
          id: cozinhaCriada.id,
          nome: cozinhaCriada.nome,
          areaM2: area,
          equipamentos: 0,
          servicos: 0,
          condominio: 0,
          seguranca: 0,
          manutencao: 0,
          outros: 0,
        };

        const listaNova = this.cozinhas().map((item) => item.id === tempId ? cozinhaAtualizada : item);
        const jaExisteReal = listaNova.some((item) => item.id === cozinhaCriada.id);
        if (!jaExisteReal && !listaNova.some((item) => item.id === tempId)) {
          listaNova.push(cozinhaAtualizada);
        }

        this.cozinhas.set(listaNova);
        this.cozinhaSelecionada.set(cozinhaCriada.id);
        this.nomeCozinha.set(cozinhaCriada.nome);
      },
      error: () => undefined,
    });
  }

  private carregarCozinhas(): void {
    if (!this.http) {
      this.cozinhas.set(COZINHAS_BASE);
      this.selecionarCozinha(this.cozinhaSelecionada());
      return;
    }

    this.http.get<Array<{ id: string; nome: string; equipada?: boolean; criado_em?: string }>>(`${API_BASE}/backoffice/cozinhas`).subscribe({
      next: (lista) => {
        const listaApi = lista.map((cozinha) => {
          const base = COZINHAS_BASE.find((item) => item.id === cozinha.id || item.nome.toLowerCase() === cozinha.nome.toLowerCase());
          return {
            id: cozinha.id,
            nome: cozinha.nome,
            areaM2: base?.areaM2 ?? 0,
            equipamentos: base?.equipamentos ?? 0,
            servicos: base?.servicos ?? 0,
            condominio: base?.condominio ?? 0,
            seguranca: base?.seguranca ?? 0,
            manutencao: base?.manutencao ?? 0,
            outros: base?.outros ?? 0,
          } satisfies CozinhaCustoBase;
        });

        const extras = COZINHAS_BASE.filter((cozinha) => !listaApi.some((item) => item.id === cozinha.id || item.nome.toLowerCase() === cozinha.nome.toLowerCase()));
        const combinadas = [...listaApi, ...extras];
        const deduplicadas = new Map<string, CozinhaCustoBase>();

        for (const cozinha of combinadas) {
          const chave = cozinha.id || cozinha.nome.trim().toLowerCase();
          if (!deduplicadas.has(chave)) {
            deduplicadas.set(chave, cozinha);
          }
        }

        const listaFinal = [...deduplicadas.values()];
        this.cozinhas.set(listaFinal);

        const idAtual = this.cozinhaSelecionada();
        if (!listaFinal.some((item) => item.id === idAtual)) {
          this.cozinhaSelecionada.set(listaFinal[0]?.id ?? '');
        }

        this.selecionarCozinha(this.cozinhaSelecionada());
      },
      error: () => {
        this.cozinhas.set(COZINHAS_BASE);
        this.selecionarCozinha(this.cozinhaSelecionada());
      },
    });
  }

  protected selecionarCozinha(id: string): void {
    const cozinha = this.cozinhas().find((item) => item.id === id) ?? this.cozinhas()[0] ?? null;
    const idSelecionado = cozinha?.id ?? '';
    this.cozinhaSelecionada.set(idSelecionado);
    this.nomeCozinha.set(cozinha?.nome ?? '');

    if (!cozinha) {
      this.investimentoInicial.set(0);
      this.prazoContratoMeses.set(12);
      this.roiDesejado.set(30);
      this.reservaManutencao.set(0);
      this.custosFixosMensais.set(0);
      this.aluguelMensalManual.set(false);
      this.aluguelMensal.set(0);
      this.form.set({
        areaM2: 0,
        equipamentos: 0,
        servicos: 0,
        condominio: 0,
        seguranca: 0,
        manutencao: 0,
        outros: 0,
        equipamentosDetalhes: [],
      });
      return;
    }

    const persistido = this.obterPersistenciaPorCozinha(idSelecionado);
    if (persistido) {
      this.aplicarPersistencia(persistido as Partial<CentroCustoPersistido> & Record<string, unknown>, cozinha, false);
      return;
    }

    if (this.http && idSelecionado) {
      this.carregarCentroCustoDaApi(idSelecionado, cozinha);
      return;
    }

    this.investimentoInicial.set(0);
    this.prazoContratoMeses.set(12);
    this.roiDesejado.set(30);
    this.reservaManutencao.set(0);
    this.custosFixosMensais.set(0);
    this.aluguelMensalManual.set(false);
    this.aluguelMensal.set(this.aluguelSugeridoMensal());
    this.form.set({
      areaM2: cozinha.areaM2,
      equipamentos: cozinha.equipamentos,
      servicos: cozinha.servicos,
      condominio: cozinha.condominio,
      seguranca: cozinha.seguranca,
      manutencao: cozinha.manutencao,
      outros: cozinha.outros,
    });
  }

  protected resetarBase(): void {
    const id = this.cozinhaSelecionada();
    const cozinha = this.cozinhas().find((item) => item.id === id) ?? this.cozinhas()[0] ?? null;
    this.investimentoInicial.set(0);
    this.prazoContratoMeses.set(12);
    this.custosFixosMensais.set(0);
    this.roiDesejado.set(30);
    this.reservaManutencao.set(0);
    this.aluguelMensalManual.set(false);
    this.aluguelMensal.set(this.aluguelSugeridoMensal());

    if (!cozinha) {
      this.form.set({
        areaM2: 0,
        equipamentos: 0,
        servicos: 0,
        condominio: 0,
        seguranca: 0,
        manutencao: 0,
        outros: 0,
        equipamentosDetalhes: [],
      });
      return;
    }

    this.form.set({
      areaM2: cozinha.areaM2,
      equipamentos: cozinha.equipamentos,
      servicos: cozinha.servicos,
      condominio: cozinha.condominio,
      seguranca: cozinha.seguranca,
      manutencao: cozinha.manutencao,
      outros: cozinha.outros,
      equipamentosDetalhes: [],
    });
    this.salvar();
  }

  protected salvar(): void {
    const id = this.cozinhaSelecionada();
    const aluguelMensal = this.aluguelMensalManual() && Number(this.aluguelMensal() ?? 0) > 0
      ? Number(this.aluguelMensal())
      : Number(this.aluguelSugeridoMensal() ?? 0);

    this.aluguelMensal.set(aluguelMensal);
    this.aluguelMensalManual.set(false);

    const payload = {
      cozinhaId: id,
      nomeCozinha: this.nomeCozinha(),
      investimentoInicial: this.investimentoInicial(),
      prazoContratoMeses: this.prazoContratoMeses(),
      custosFixosMensais: this.custosFixosMensais(),
      roiDesejado: this.roiDesejado(),
      reservaManutencao: this.reservaManutencao(),
      aluguelMensal,
      margem: this.margem(),
      taxaAdministracao: this.taxaAdministracao(),
      areaM2: Number(this.form().areaM2 ?? 0),
      equipamentos: Number(this.form().equipamentos ?? 0),
      servicos: Number(this.form().servicos ?? 0),
      condominio: Number(this.form().condominio ?? 0),
      seguranca: Number(this.form().seguranca ?? 0),
      manutencao: Number(this.form().manutencao ?? 0),
      outros: Number(this.form().outros ?? 0),
      equipamentosDetalhes: this.form().equipamentosDetalhes ?? [],
    };

    const dados = this.lerDadosArmazenados();
    dados[id] = {
      nomeCozinha: payload.nomeCozinha,
      investimentoInicial: payload.investimentoInicial,
      prazoContratoMeses: payload.prazoContratoMeses,
      custosFixosMensais: payload.custosFixosMensais,
      roiDesejado: payload.roiDesejado,
      reservaManutencao: payload.reservaManutencao,
      aluguelMensal: payload.aluguelMensal,
      margem: payload.margem,
      taxaAdministracao: payload.taxaAdministracao,
      form: {
        ...this.form(),
        equipamentosDetalhes: this.form().equipamentosDetalhes ?? [],
      },
    };

    localStorage.setItem(CentroCustoComponent.STORAGE_KEY, JSON.stringify(dados));

    if (this.http && id) {
      this.http.put(`${API_BASE}/backoffice/centro-custo/cozinha/${id}`, payload).subscribe({
        next: () => undefined,
        error: () => undefined,
      });
    }
  }

  private carregarPersistencia(): void {
    try {
      const raw = localStorage.getItem(CentroCustoComponent.STORAGE_KEY);
      if (!raw) {
        return;
      }

      const dados = JSON.parse(raw) as Record<string, CentroCustoPersistido>;
      const idAtual = this.cozinhaSelecionada();
      let persistido: CentroCustoPersistido | null = dados[idAtual] ?? null;

      if (!persistido && !idAtual) {
        const primeiroId = Object.keys(dados)[0];
        if (primeiroId) {
          this.cozinhaSelecionada.set(primeiroId);
          persistido = dados[primeiroId] ?? null;
        }
      }

      if (!persistido) {
        const legacy = this.obterPersistenciaLegacy(raw);
        persistido = legacy ?? null;
      }

      if (!persistido) {
        return;
      }

      this.aplicarPersistencia(persistido as Partial<CentroCustoPersistido> & Record<string, unknown>);
    } catch {
      localStorage.removeItem(CentroCustoComponent.STORAGE_KEY);
    }
  }

  private aplicarPersistencia(
    dados: Partial<CentroCustoPersistido> & Record<string, unknown>,
    cozinha?: CozinhaCustoBase | null,
    converteCentavos = false,
  ): void {
    const paraReais = (valor: unknown): number => {
      const numero = Number(valor ?? 0);
      if (!Number.isFinite(numero)) {
        return 0;
      }

      return converteCentavos ? numero / 100 : numero;
    };

    const formBase = (dados['form'] ?? { ...dados }) as Record<string, unknown>;
    const areaM2 = Number(formBase['areaM2'] ?? formBase['area_m2'] ?? cozinha?.areaM2 ?? 0);
    const equipamentos = paraReais(formBase['equipamentos'] ?? formBase['equipamentos'] ?? cozinha?.equipamentos ?? 0);
    const servicos = paraReais(formBase['servicos'] ?? formBase['servicos'] ?? cozinha?.servicos ?? 0);
    const condominio = paraReais(formBase['condominio'] ?? formBase['condominio'] ?? cozinha?.condominio ?? 0);
    const seguranca = paraReais(formBase['seguranca'] ?? formBase['seguranca'] ?? cozinha?.seguranca ?? 0);
    const manutencao = paraReais(formBase['manutencao'] ?? formBase['manutencao'] ?? cozinha?.manutencao ?? 0);
    const outros = paraReais(formBase['outros'] ?? formBase['outros'] ?? cozinha?.outros ?? 0);

    const equipamentoDetalhesRaw = Array.isArray(formBase['equipamentosDetalhes'])
      ? formBase['equipamentosDetalhes']
      : Array.isArray(formBase['equipamentos_detalhes'])
        ? formBase['equipamentos_detalhes']
        : [];

    const equipamentosDetalhes = (equipamentoDetalhesRaw as Array<Record<string, unknown>>).map((item, index) => {
      const itemRecord = item as Record<string, unknown>;
      const nome = String(itemRecord['nome'] ?? itemRecord['descricao'] ?? '');
      const descricao = String(itemRecord['descricao'] ?? itemRecord['nome'] ?? '');
      return {
        id: String(itemRecord['id'] ?? `eq-${index + 1}`),
        nome,
        descricao,
        valor: paraReais(itemRecord['valor'] ?? 0),
      } as EquipamentoCustoItem;
    });

    const investimentoInicial = paraReais(dados['investimentoInicial'] ?? dados['investimento_inicial'] ?? 0);
    const prazoContratoMeses = Number(dados['prazoContratoMeses'] ?? dados['prazo_contrato_meses'] ?? 12);
    const roiDesejado = Number(dados['roiDesejado'] ?? dados['roi_desejado'] ?? dados['margem'] ?? 30);
    const reservaManutencao = paraReais(dados['reservaManutencao'] ?? dados['reserva_manutencao'] ?? 0);
    const aluguelMensal = paraReais(dados['aluguelMensal'] ?? dados['aluguel_mensal'] ?? 0);
    const custosFixosMensais = paraReais(dados['custosFixosMensais'] ?? dados['custos_fixos_mensais'] ?? servicos + condominio + seguranca + manutencao + outros);
    const taxaAdministracao = paraReais(dados['taxaAdministracao'] ?? dados['taxa_administracao'] ?? 0);

    this.investimentoInicial.set(investimentoInicial);
    this.prazoContratoMeses.set(prazoContratoMeses);
    this.roiDesejado.set(roiDesejado);
    this.reservaManutencao.set(reservaManutencao);
    this.custosFixosMensais.set(custosFixosMensais);
    this.aluguelMensal.set(aluguelMensal || this.aluguelSugeridoMensal());
    this.aluguelMensalManual.set(Boolean(aluguelMensal) || !!dados['aluguelMensal'] || !!dados['aluguel_mensal']);
    this.taxaAdministracao.set(taxaAdministracao);
    this.form.set({
      areaM2,
      equipamentos,
      servicos,
      condominio,
      seguranca,
      manutencao,
      outros,
      equipamentosDetalhes,
    });
  }

  private carregarCentroCustoDaApi(cozinhaId: string, cozinha?: CozinhaCustoBase | null): void {
    if (!this.http || !cozinhaId) {
      return;
    }

    this.http.get<Record<string, unknown>>(`${API_BASE}/backoffice/centro-custo/cozinha/${cozinhaId}`).subscribe({
      next: (dados) => this.aplicarPersistencia(dados, cozinha, false),
      error: () => {
        if (!cozinha) {
          return;
        }

        this.investimentoInicial.set(0);
        this.prazoContratoMeses.set(12);
        this.roiDesejado.set(30);
        this.reservaManutencao.set(0);
        this.custosFixosMensais.set(0);
        this.aluguelMensalManual.set(false);
        this.aluguelMensal.set(this.aluguelSugeridoMensal());
        this.form.set({
          areaM2: cozinha.areaM2,
          equipamentos: cozinha.equipamentos,
          servicos: cozinha.servicos,
          condominio: cozinha.condominio,
          seguranca: cozinha.seguranca,
          manutencao: cozinha.manutencao,
          outros: cozinha.outros,
          equipamentosDetalhes: [],
        });
      },
    });
  }

  private lerDadosArmazenados(): Record<string, CentroCustoPersistido> {
    const raw = localStorage.getItem(CentroCustoComponent.STORAGE_KEY);
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as Record<string, CentroCustoPersistido>;
    } catch {
      return {};
    }
  }

  private obterPersistenciaPorCozinha(id: string): CentroCustoPersistido | null {
    const dados = this.lerDadosArmazenados();
    return dados[id] ?? null;
  }

  private obterPersistenciaLegacy(raw: string): CentroCustoPersistido | null {
    try {
      const payload = JSON.parse(raw) as Partial<CentroCustoPersistido>;

      if (!payload.form) {
        return null;
      }

      return {
        margem: payload.margem ?? 25,
        taxaAdministracao: payload.taxaAdministracao ?? 250,
        form: payload.form,
      };
    } catch {
      return null;
    }
  }
}
