import { Component, computed, inject, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { AuthService } from '../core/auth.service';
import { type Insumo, InsumoApiService } from './insumo-api.service';

/** Converte quantidade decimal para exibição de até 3 casas decimais. */
function formatar(valor: string | number | null): string {
  if (valor === null) return '—';
  const n = Number(valor);
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
}

@Component({
  selector: 'app-estoque',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header class="c81-page-header">
      <div>
        <span class="c81-eyebrow">GESTÃO DE COZINHA</span>
        <h1 class="c81-page-title">Estoque e Insumos</h1>
      </div>
      @if (isDonoAdmin()) {
        <c81-button variant="primary" (click)="abrirCadastro()" data-test="novo-insumo">+ Cadastrar insumo</c81-button>
      }
    </header>

    @if (erro()) {
      <p role="alert" class="c81-alert-danger" data-test="erro">{{ erro() }}</p>
    }

    <!-- Alertas de estoque mínimo (Story 2.4) -->
    @if (abaixoDoMinimo().length > 0) {
      <section style="display: flex; flex-direction: column; gap: var(--space-2);" data-test="alertas">
        @for (i of abaixoDoMinimo(); track i.id) {
          <div class="c81-card" style="border-left: 4px solid var(--status-stop); display: flex; flex-direction: column;" data-test="alerta-linha">
            <!-- Cabeçalho do alerta -->
            <div 
              (click)="toggleAlerta(i.id)" 
              style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); cursor: pointer;"
              data-test="alerta-cabecalho"
            >
              <div class="c81-flex-gap-3" style="align-items: center;">
                <span class="c81-badge c81-badge--stop"><span class="c81-badge__dot"></span> ABAIXO DO MÍNIMO</span>
                <span><strong>{{ i.nome }}</strong> — saldo {{ fmt(i.quantidade_atual) }} {{ i.unidade_base }} (mín. {{ fmt(i.estoque_minimo) }})</span>
              </div>
              
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
                style="transition: transform var(--dur-base) var(--ease-out);"
                [style.transform]="alertasExpandidos()[i.id] ? 'rotate(90deg)' : 'rotate(0deg)'"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>

            <!-- Conteúdo expandido -->
            @if (alertasExpandidos()[i.id]) {
              <div 
                style="border-top: 1px solid var(--border-subtle); padding: var(--space-4); display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle);"
                data-test="alerta-conteudo"
              >
                <div>
                  <span style="font-size: var(--text-sm); color: var(--text-secondary);">
                    Saldo atual: <strong>{{ fmt(i.quantidade_atual) }} {{ i.unidade_base }}</strong> | Estoque mínimo ideal: <strong>{{ fmt(i.estoque_minimo) }} {{ i.unidade_base }}</strong>
                  </span>
                </div>
                @if (isDonoAdmin()) {
                  <div class="c81-flex-gap-2">
                    <c81-button size="sm" variant="secondary" (click)="abrirEntrada(i)" data-test="b-entrada">Entrada</c81-button>
                    <c81-button size="sm" variant="danger" (click)="pedirPerda(i)" data-test="b-perda">Perda</c81-button>
                    <c81-button size="sm" variant="ghost" (click)="editar(i)">Editar</c81-button>
                  </div>
                }
              </div>
            }
          </div>
        }
      </section>
    }

    <!-- Formulário de cadastro/edição em modal -->
    @if (mostrandoForm()) {
      <div 
        class="c81-modal-overlay" 
        (click)="fecharForm()" 
        data-test="modal-cadastro"
        style="animation: fadeIn var(--dur-fast) var(--ease-out);"
      >
        <c81-card 
          [raised]="true" 
          [pad]="true" 
          style="max-width: 640px; width: 100%; margin: var(--space-4); max-height: 90vh; overflow-y: auto;"
          (click)="$event.stopPropagation()"
        >
          <h2>{{ editandoId() ? 'Editar' : 'Cadastrar' }} insumo</h2>
          <form (submit)="salvar($event)" class="c81-grid-2col" style="margin-top: var(--space-4);">
            <label class="c81-col-full">Nome<input class="c81-input" [(ngModel)]="form.nome" name="nome" data-test="f-nome" /></label>
            <label>Tipo de Medida
              <select class="c81-input" [(ngModel)]="form.tipo_medida" name="tipo_medida" data-test="f-tipo-medida">
                <option value="peso">Peso (kg / g)</option>
                <option value="volume">Volume (L / ml)</option>
                <option value="unidade">Unidade (un)</option>
              </select>
            </label>
            <label>Estoque mínimo<input class="c81-input" type="number" step="any" [(ngModel)]="form.estoque_minimo" name="min" data-test="f-estoque-minimo" /></label>
            <label class="c81-col-full"><input type="checkbox" [(ngModel)]="form.lote_validade" name="lote" /> Controla lote/validade</label>
            <div class="c81-col-full c81-flex-gap-3" style="margin-top: var(--space-2); border-top: 1px solid var(--border-subtle); padding-top: var(--space-4);">
              <c81-button type="submit" variant="primary" data-test="f-salvar">Salvar</c81-button>
              <c81-button type="button" variant="ghost" (click)="fecharForm()">Cancelar</c81-button>
            </div>
          </form>
        </c81-card>
      </div>
    }

    <!-- Lista -->
    <c81-card [pad]="true">
      @if (carregando()) {
        <p>Carregando…</p>
      } @else if (insumos().length === 0) {
        <p>Nenhum insumo cadastrado.</p>
      } @else {
        <table class="c81-table" data-test="tabela">
          <thead>
            <tr>
              <th>Insumo</th>
              <th>Saldo</th>
              <th>Mínimo</th>
              @if (isDonoAdmin()) { <th>Ações</th> }
            </tr>
          </thead>
          <tbody>
            @for (i of insumos(); track i.id) {
              <tr data-test="linha-insumo">
                <td>{{ i.nome }}</td>
                <td>{{ fmt(i.quantidade_atual) }} {{ i.unidade_base }}</td>
                <td>{{ i.estoque_minimo ? fmt(i.estoque_minimo) : '—' }}</td>
                @if (isDonoAdmin()) {
                  <td class="c81-flex-gap-2">
                    <c81-button size="sm" variant="secondary" (click)="abrirEntrada(i)" data-test="b-entrada">Entrada</c81-button>
                    <c81-button size="sm" variant="danger" (click)="pedirPerda(i)" data-test="b-perda">Perda</c81-button>
                    <c81-button size="sm" variant="ghost" (click)="editar(i)">Editar</c81-button>
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      }
    </c81-card>

    <!-- Entrada (Dono/Admin — envolve preço, campo de custo) -->
    @if (entradaPara(); as alvo) {
      <c81-card [raised]="true" [pad]="true" style="max-width: 520px;" data-test="form-entrada">
        <h2>Entrada — {{ alvo.nome }}</h2>
        <form (submit)="confirmarEntrada($event)" style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-3);">
          <label>Quantidade (base)<input class="c81-input" type="number" step="any" [(ngModel)]="entrada.quantidade" name="q" data-test="e-qtd" /></label>
          <label>Preço pago (centavos)<input class="c81-input" type="number" [(ngModel)]="entrada.precoCentavos" name="p" data-test="e-preco" /></label>
          @if (alvo.lote_validade) {
            <label>Lote<input class="c81-input" [(ngModel)]="entrada.lote" name="l" /></label>
            <label>Validade<input class="c81-input" type="date" [(ngModel)]="entrada.validade" name="v" /></label>
          }
          <div class="c81-flex-gap-3">
            <c81-button type="submit" variant="primary" data-test="e-salvar">Registrar entrada</c81-button>
            <c81-button type="button" variant="ghost" (click)="entradaPara.set(null)">Cancelar</c81-button>
          </div>
        </form>
      </c81-card>
    }

    <!-- Confirmação destrutiva de perda (Story 2.3 AC-2) -->
    @if (perdaPara(); as alvo) {
      <div class="c81-modal-overlay" data-test="confirma-perda">
        <c81-card [raised]="true" [pad]="true" style="max-width: 440px;">
          <h2>⚠️ Confirmar perda</h2>
          <form (submit)="confirmarPerda($event)" style="display: flex; flex-direction: column; gap: var(--space-3);">
            <label>Quantidade (base)<input class="c81-input" type="number" step="any" [(ngModel)]="perda.quantidade" name="pq" data-test="p-qtd" /></label>
            <label>Motivo<input class="c81-input" [(ngModel)]="perda.motivo" name="pm" placeholder="quebra, vencimento" data-test="p-motivo" /></label>
            <p>Registrar perda de <strong>{{ alvo.nome }}</strong>? Esta ação é irreversível (gera movimento no ledger).</p>
            <div class="c81-flex-gap-3">
              <c81-button type="button" variant="ghost" (click)="perdaPara.set(null)">Voltar</c81-button>
              <c81-button type="submit" variant="danger" data-test="p-confirmar">Confirmar perda</c81-button>
            </div>
          </form>
        </c81-card>
      </div>
    }
  `,
})
export class EstoqueComponent implements OnInit {
  private readonly api = inject(InsumoApiService);
  private readonly auth = inject(AuthService);

  protected readonly insumos = signal<Insumo[]>([]);
  protected readonly carregando = signal(true);
  protected readonly erro = signal<string | null>(null);

  protected readonly isDonoAdmin = this.auth.isDonoAdmin;

  protected readonly mostrandoForm = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected form = this.formVazio();

  protected readonly alertasExpandidos = signal<Record<string, boolean>>({});

  protected toggleAlerta(id: string): void {
    this.alertasExpandidos.update(map => ({
      ...map,
      [id]: !map[id]
    }));
  }

  protected readonly entradaPara = signal<Insumo | null>(null);
  protected entrada = { quantidade: 0, precoCentavos: 0, lote: '', validade: '' };

  protected readonly perdaPara = signal<Insumo | null>(null);
  protected perda = { quantidade: 0, motivo: '' };

  protected readonly abaixoDoMinimo = computed(() =>
    this.insumos().filter(
      (i) => i.estoque_minimo !== null && Number(i.quantidade_atual) <= Number(i.estoque_minimo),
    ),
  );

  protected fmt = formatar;

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.api.listar().subscribe({
      next: (lista) => {
        this.insumos.set(lista);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Falha ao carregar insumos.');
        this.carregando.set(false);
      },
    });
  }

  protected abrirCadastro(): void {
    this.editandoId.set(null);
    this.form = this.formVazio();
    this.mostrandoForm.set(true);
  }

  protected editar(i: Insumo): void {
    this.editandoId.set(i.id);
    let tipo_medida: 'peso' | 'volume' | 'unidade' = 'unidade';
    if (i.unidade_base === 'kg') tipo_medida = 'peso';
    else if (i.unidade_base === 'L') tipo_medida = 'volume';

    this.form = {
      nome: i.nome,
      tipo_medida,
      estoque_minimo: i.estoque_minimo ? Number(i.estoque_minimo) : null,
      lote_validade: i.lote_validade,
    };
    this.mostrandoForm.set(true);
  }

  protected fecharForm(): void {
    this.mostrandoForm.set(false);
  }

  protected salvar(event: Event): void {
    event.preventDefault();
    this.erro.set(null);

    let unidade_base = 'un';
    let unidade_uso = 'un';
    let fator_conversao = 1;

    if (this.form.tipo_medida === 'peso') {
      unidade_base = 'kg';
      unidade_uso = 'g';
      fator_conversao = 1000;
    } else if (this.form.tipo_medida === 'volume') {
      unidade_base = 'L';
      unidade_uso = 'ml';
      fator_conversao = 1000;
    }

    const dto = {
      nome: this.form.nome,
      unidade_base,
      estoque_minimo: this.form.estoque_minimo === null ? null : Number(this.form.estoque_minimo),
      lote_validade: this.form.lote_validade,
      unidade_uso,
      fator_conversao,
    };
    const id = this.editandoId();
    const req = id ? this.api.atualizar(id, dto) : this.api.criar(dto);
    req.subscribe({
      next: () => {
        this.mostrandoForm.set(false);
        this.carregar();
      },
      error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao salvar.'),
    });
  }

  protected abrirEntrada(i: Insumo): void {
    this.entrada = { quantidade: 0, precoCentavos: 0, lote: '', validade: '' };
    this.entradaPara.set(i);
  }

  protected confirmarEntrada(event: Event): void {
    event.preventDefault();
    const alvo = this.entradaPara();
    if (!alvo) return;
    this.api
      .registrarEntrada({
        insumoId: alvo.id,
        quantidade: Number(this.entrada.quantidade),
        precoCentavos: Number(this.entrada.precoCentavos),
        causeKey: this.api.novaCauseKey(),
        lote: this.entrada.lote || null,
        validade: this.entrada.validade || null,
      })
      .subscribe({
        next: () => {
          this.entradaPara.set(null);
          this.carregar();
        },
        error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao registrar entrada.'),
      });
  }

  protected pedirPerda(i: Insumo): void {
    this.perda = { quantidade: 0, motivo: '' };
    this.perdaPara.set(i);
  }

  protected confirmarPerda(event: Event): void {
    event.preventDefault();
    const alvo = this.perdaPara();
    if (!alvo) return;
    this.api
      .registrarPerda(alvo.id, {
        quantidade: Number(this.perda.quantidade),
        motivo: this.perda.motivo,
        causeKey: this.api.novaCauseKey(),
      })
      .subscribe({
        next: () => {
          this.perdaPara.set(null);
          this.carregar();
        },
        error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao registrar perda.'),
      });
  }

  private formVazio() {
    return {
      nome: '',
      tipo_medida: 'peso' as 'peso' | 'volume' | 'unidade',
      estoque_minimo: null as number | null,
      lote_validade: false,
    };
  }
}
