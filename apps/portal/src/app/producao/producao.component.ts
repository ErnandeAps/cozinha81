import { Component, inject, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { AuthService } from '../core/auth.service';
import { type FichaResumo, FichaApiService } from '../fichas/ficha-api.service';
import { type ModoBaixa, type Producao, ProducaoApiService, type StatusBaixa } from './producao-api.service';

/** Registro de Produção (Story 4.1) — histórico de produção por Ficha. */
@Component({
  selector: 'app-producao',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span class="c81-eyebrow">GESTÃO DE COZINHA</span>
        <h1 style="margin-top: var(--space-1);">Produção</h1>
      </div>
    </header>

    @if (erro()) { <p role="alert" style="color: var(--status-stop);" data-test="erro">{{ erro() }}</p> }

    @if (isDonoAdmin()) {
      <c81-card [pad]="true" data-test="config-modo">
        <span class="c81-eyebrow">MODO DE BAIXA</span>
        <div style="display: flex; gap: var(--space-3); align-items: center; margin-top: var(--space-2);">
          <label><input type="radio" name="modo" value="automatico" [checked]="modo() === 'automatico'" (change)="trocarModo('automatico')" data-test="modo-auto" /> Automático</label>
          <label><input type="radio" name="modo" value="manual" [checked]="modo() === 'manual'" (change)="trocarModo('manual')" data-test="modo-manual" /> Manual</label>
        </div>
      </c81-card>
    }

    @if (semFicha().length > 0) {
      <c81-card [pad]="true" data-test="aviso-sem-ficha" style="border-left: 3px solid var(--status-stop);">
        <strong>{{ semFicha().length }} produção(ões) sem ficha</strong> não baixaram estoque — vincule uma Ficha para corrigir.
      </c81-card>
    }

    <c81-card [raised]="true" [pad]="true" style="max-width: 560px;">
      <h2>Registrar produção</h2>
      <form (submit)="salvar($event)" style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-3);">
        <label>Ficha
          <select class="c81-select" [(ngModel)]="fichaId" name="ficha" data-test="sel-ficha">
            <option value="">Selecione uma ficha…</option>
            @for (f of fichas(); track f.id) { <option [value]="f.id">{{ f.nome }}</option> }
          </select>
        </label>
        <label>Quantidade (porções)
          <input class="c81-input" type="number" [(ngModel)]="quantidade" name="qtd" data-test="qtd" />
        </label>
        <c81-button type="submit" variant="primary" data-test="registrar">Registrar</c81-button>
      </form>
    </c81-card>

    <c81-card [pad]="true">
      @if (producoes().length === 0) {
        <p>Nenhuma produção registrada.</p>
      } @else {
        <table style="width: 100%; border-collapse: collapse;" data-test="tabela">
          <thead>
            <tr style="text-align: left; border-bottom: var(--hairline);">
              <th style="padding: var(--space-2);">Data</th>
              <th>Ficha</th>
              <th>Qtd</th>
              <th>Baixa</th>
            </tr>
          </thead>
          <tbody>
            @for (p of producoes(); track p.id) {
              <tr style="border-bottom: var(--hairline);" data-test="linha-producao">
                <td style="padding: var(--space-2);">{{ p.criado_em | date: 'short' }}</td>
                <td>{{ nomeFicha(p.ficha_id) }}</td>
                <td style="font-variant-numeric: tabular-nums;">{{ p.quantidade }}</td>
                <td data-test="status">
                  {{ rotuloStatus(p.status_baixa) }}
                  @if (p.status_baixa === 'pendente') {
                    <c81-button size="sm" variant="secondary" (click)="baixar(p.id)" data-test="baixar">Baixar</c81-button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </c81-card>
  `,
})
export class ProducaoComponent implements OnInit {
  private readonly api = inject(ProducaoApiService);
  private readonly fichaApi = inject(FichaApiService);
  private readonly auth = inject(AuthService);

  protected readonly isDonoAdmin = this.auth.isDonoAdmin;
  protected readonly producoes = signal<Producao[]>([]);
  protected readonly fichas = signal<FichaResumo[]>([]);
  protected readonly modo = signal<ModoBaixa>('automatico');
  protected readonly erro = signal<string | null>(null);
  protected fichaId = '';
  protected quantidade = 1;

  protected semFicha = () => this.producoes().filter((p) => p.status_baixa === 'sem_ficha');

  protected rotuloStatus(s: StatusBaixa): string {
    return s === 'baixado' ? 'Baixado' : s === 'sem_ficha' ? 'Sem ficha' : 'Pendente';
  }

  ngOnInit(): void {
    this.fichaApi.listar().subscribe({ next: (l) => this.fichas.set(l), error: () => undefined });
    if (this.isDonoAdmin()) {
      this.api.obterConfig().subscribe({ next: (c) => this.modo.set(c.modoBaixa), error: () => undefined });
    }
    this.carregar();
  }

  protected trocarModo(modo: ModoBaixa): void {
    this.api.definirConfig(modo).subscribe({
      next: (c) => this.modo.set(c.modoBaixa),
      error: () => this.erro.set('Falha ao alterar o modo de baixa.'),
    });
  }

  protected baixar(id: string): void {
    this.erro.set(null);
    this.api.baixarManual(id).subscribe({
      next: () => this.carregar(),
      error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao baixar a produção.'),
    });
  }

  protected carregar(): void {
    this.api.listar().subscribe({
      next: (ps) => this.producoes.set(ps),
      error: () => this.erro.set('Falha ao carregar produções.'),
    });
  }

  protected nomeFicha(id: string | null): string {
    if (!id) return 'Sem ficha';
    return this.fichas().find((f) => f.id === id)?.nome ?? '(ficha)';
  }

  protected salvar(event: Event): void {
    event.preventDefault();
    this.erro.set(null);
    if (!(this.quantidade > 0)) {
      this.erro.set('Informe uma quantidade maior que zero.');
      return;
    }
    const dto = {
      fichaId: this.fichaId || null,
      quantidade: Number(this.quantidade),
      causeKey: this.api.novaCauseKey(),
    };
    this.api.registrar(dto).subscribe({
      next: () => {
        this.quantidade = 1;
        this.fichaId = '';
        this.carregar();
      },
      error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao registrar produção.'),
    });
  }
}
