import { Component, inject, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { AuthService } from '../core/auth.service';
import { type Insumo, InsumoApiService } from '../estoque/insumo-api.service';
import {
  type FichaDetalhe,
  type FichaResumo,
  FichaApiService,
  type ItemInput,
} from './ficha-api.service';

interface LinhaItem {
  insumoId: string;
  quantidadeUso: number;
}

interface LinhaSub {
  subFichaId: string;
  porcoes: number;
}

function reais(centavos?: string): string {
  if (centavos === undefined) return '—';
  return (Number(centavos) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Converte quantidade em unidade de uso → base (fronteira da Ficha, AC-5). */
function usoParaBase(qUso: number, ins: Insumo): number {
  const fator = ins.fator_conversao ? Number(ins.fator_conversao) : null;
  return fator ? qUso / fator : qUso;
}

@Component({
  selector: 'app-fichas',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span class="c81-eyebrow">GESTÃO DE COZINHA</span>
        <h1 style="margin-top: var(--space-1);">Fichas Técnicas</h1>
      </div>
      @if (isDonoAdmin()) {
        <c81-button variant="primary" (click)="abrir()" data-test="nova-ficha">+ Nova ficha</c81-button>
      }
    </header>

    @if (erro()) { <p role="alert" style="color: var(--status-stop);" data-test="erro">{{ erro() }}</p> }

    @if (mostrandoForm()) {
      <c81-card [raised]="true" [pad]="true" style="max-width: 680px;">
        <h2>Nova ficha</h2>
        <form (submit)="salvar($event)" style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-3);">
          <label>Nome<input class="c81-input" [(ngModel)]="nome" name="nome" data-test="f-nome" /></label>
          <label>Rende (porções)<input class="c81-input" type="number" [(ngModel)]="rendimento" name="rend" /></label>

          <h3>Insumos</h3>
          @for (linha of linhas(); track $index) {
            <div style="display: flex; gap: var(--space-2);" data-test="linha-item">
              <select class="c81-select" [(ngModel)]="linha.insumoId" [name]="'ins' + $index" data-test="sel-insumo">
                <option value="">Selecione…</option>
                @for (i of insumos(); track i.id) { <option [value]="i.id">{{ i.nome }} ({{ i.unidade_uso || i.unidade_base }})</option> }
              </select>
              <input class="c81-input" type="number" step="any" [(ngModel)]="linha.quantidadeUso" [name]="'q' + $index" placeholder="qtd" data-test="q-item" />
              <c81-button type="button" variant="ghost" size="sm" (click)="removerLinha($index)">×</c81-button>
            </div>
          }
          <c81-button type="button" variant="secondary" size="sm" (click)="addLinha()" data-test="add-item">+ Insumo</c81-button>

          <h3>Sub-receitas</h3>
          @for (sl of subLinhas(); track $index) {
            <div style="display: flex; gap: var(--space-2);" data-test="linha-sub">
              <select class="c81-select" [(ngModel)]="sl.subFichaId" [name]="'sub' + $index" data-test="sel-sub">
                <option value="">Selecione uma ficha…</option>
                @for (f of fichas(); track f.id) { <option [value]="f.id">{{ f.nome }}</option> }
              </select>
              <input class="c81-input" type="number" step="any" [(ngModel)]="sl.porcoes" [name]="'sp' + $index" placeholder="porções" data-test="sp-item" />
              <c81-button type="button" variant="ghost" size="sm" (click)="removerSub($index)">×</c81-button>
            </div>
          }
          <c81-button type="button" variant="secondary" size="sm" (click)="addSub()" data-test="add-sub">+ Sub-receita</c81-button>

          <div style="display: flex; gap: var(--space-3); margin-top: var(--space-3);">
            <c81-button type="submit" variant="primary" data-test="f-salvar">Salvar ficha</c81-button>
            <c81-button type="button" variant="ghost" (click)="mostrandoForm.set(false)">Cancelar</c81-button>
          </div>
        </form>
      </c81-card>
    }

    <c81-card [pad]="true">
      @if (fichas().length === 0) {
        <p>Nenhuma ficha cadastrada.</p>
      } @else {
        <table style="width: 100%; border-collapse: collapse;" data-test="tabela">
          <thead>
            <tr style="text-align: left; border-bottom: var(--hairline);">
              <th style="padding: var(--space-2);">Ficha</th>
              <th>Rende</th>
              @if (isDonoAdmin()) { <th>Custo/porção</th> }
            </tr>
          </thead>
          <tbody>
            @for (f of fichas(); track f.id) {
              <tr style="border-bottom: var(--hairline);" data-test="linha-ficha">
                <td style="padding: var(--space-2);">
                  {{ f.nome }}
                  <c81-button size="sm" variant="ghost" (click)="verDetalhe(f.id)" data-test="ver">ver</c81-button>
                </td>
                <td>{{ f.rendimento_porcoes }}</td>
                @if (isDonoAdmin()) {
                  <td data-test="custo" style="font-variant-numeric: tabular-nums;">{{ reais(custos()[f.id]) }}</td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </c81-card>

    <!-- Composição (Story 3.3 AC-4: sub-receita indentada com └─ + nível) -->
    @if (detalhe(); as d) {
      <c81-card [pad]="true" data-test="detalhe">
        <h2>Composição — {{ d.nome }}</h2>
        <ul style="list-style: none; padding: 0; font-variant-numeric: tabular-nums;">
          @for (it of d.itens; track it.id) {
            <li data-test="item-detalhe">
              @if (it.sub_ficha_id) {
                <span style="color: var(--steel-500);">└─</span>
                <strong>{{ nomeDe(it.sub_ficha_id) }}</strong>
                <span class="c81-badge c81-badge--neutral">SUB-RECEITA</span>
                — {{ it.quantidade }} porção(ões)
              } @else {
                {{ nomeInsumo(it.insumo_id) }} — {{ it.quantidade }} (base)
              }
            </li>
          }
        </ul>
      </c81-card>
    }
  `,
})
export class FichasComponent implements OnInit {
  private readonly api = inject(FichaApiService);
  private readonly insumoApi = inject(InsumoApiService);
  private readonly auth = inject(AuthService);

  protected readonly isDonoAdmin = this.auth.isDonoAdmin;
  protected readonly fichas = signal<FichaResumo[]>([]);
  protected readonly insumos = signal<Insumo[]>([]);
  protected readonly custos = signal<Record<string, string | undefined>>({});
  protected readonly erro = signal<string | null>(null);

  protected readonly mostrandoForm = signal(false);
  protected nome = '';
  protected rendimento = 1;
  protected readonly linhas = signal<LinhaItem[]>([{ insumoId: '', quantidadeUso: 0 }]);
  protected readonly subLinhas = signal<LinhaSub[]>([]);
  protected readonly detalhe = signal<FichaDetalhe | null>(null);

  protected reais = reais;

  ngOnInit(): void {
    this.insumoApi.listar().subscribe({ next: (l) => this.insumos.set(l), error: () => undefined });
    this.carregar();
  }

  protected carregar(): void {
    this.api.listar().subscribe({
      next: (fs) => {
        this.fichas.set(fs);
        if (this.isDonoAdmin()) {
          for (const f of fs) {
            this.api.custo(f.id).subscribe({
              next: (c) => this.custos.update((m) => ({ ...m, [f.id]: c.custoPorcaoCentavos })),
              error: () => undefined,
            });
          }
        }
      },
      error: () => this.erro.set('Falha ao carregar fichas.'),
    });
  }

  protected abrir(): void {
    this.nome = '';
    this.rendimento = 1;
    this.linhas.set([{ insumoId: '', quantidadeUso: 0 }]);
    this.subLinhas.set([]);
    this.mostrandoForm.set(true);
  }

  protected addLinha(): void {
    this.linhas.update((l) => [...l, { insumoId: '', quantidadeUso: 0 }]);
  }

  protected removerLinha(i: number): void {
    this.linhas.update((l) => l.filter((_, idx) => idx !== i));
  }

  protected addSub(): void {
    this.subLinhas.update((l) => [...l, { subFichaId: '', porcoes: 1 }]);
  }

  protected removerSub(i: number): void {
    this.subLinhas.update((l) => l.filter((_, idx) => idx !== i));
  }

  protected verDetalhe(id: string): void {
    this.api.obter(id).subscribe({ next: (d) => this.detalhe.set(d), error: () => this.detalhe.set(null) });
  }

  protected nomeDe(id: string): string {
    return this.fichas().find((f) => f.id === id)?.nome ?? '(ficha)';
  }

  protected nomeInsumo(id: string | null): string {
    if (!id) return '(insumo)';
    return this.insumos().find((i) => i.id === id)?.nome ?? '(insumo)';
  }

  protected salvar(event: Event): void {
    event.preventDefault();
    this.erro.set(null);
    const itens: ItemInput[] = [];
    for (const linha of this.linhas()) {
      const ins = this.insumos().find((i) => i.id === linha.insumoId);
      if (!ins || !(linha.quantidadeUso > 0)) continue;
      itens.push({ insumoId: ins.id, quantidade: usoParaBase(Number(linha.quantidadeUso), ins) });
    }
    for (const sl of this.subLinhas()) {
      if (!sl.subFichaId || !(sl.porcoes > 0)) continue;
      // sub-ficha: nº de porções directly.
      itens.push({ subFichaId: sl.subFichaId, quantidade: Number(sl.porcoes) });
    }
    if (itens.length === 0) {
      this.erro.set('Adicione ao menos um insumo ou sub-receita.');
      return;
    }
    this.api.criar({ nome: this.nome, rendimentoPorcoes: Number(this.rendimento) || 1, itens }).subscribe({
      next: () => {
        this.mostrandoForm.set(false);
        this.carregar();
      },
      error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao salvar ficha.'),
    });
  }
}
