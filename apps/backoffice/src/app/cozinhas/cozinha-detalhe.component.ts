import { Component, inject, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

interface Cozinha {
  id: string;
  nome: string;
  equipada: boolean;
  criado_em: string;
  inquilino_id?: string | null;
  inquilino_nome?: string | null;
}

interface InquilinoOption {
  id: string;
  nome: string;
}

interface Documento {
  id: string;
  tipo: string;
  arquivo: string;
  validade: string;
}

interface Alerta {
  id: string;
  documento_id: string;
}

@Component({
  selector: 'app-cozinha-detalhe',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, CardComponent, ButtonComponent],
  template: `
    <div style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      <!-- Back link -->
      <a routerLink="/cozinhas" style="color: var(--text-secondary); text-decoration: none; font-size: 0.9rem; display: flex; align-items: center; gap: var(--space-1);">
        ← Voltar para a lista
      </a>

      @if (carregando()) {
        <p>Carregando especificações da cozinha...</p>
      } @else if (cozinha(); as c) {
        <header>
          <span class="c81-eyebrow">// DETALHES DA COZINHA</span>
          <h1 style="margin-top: var(--space-1); margin-bottom: var(--space-2);">{{ c.nome }}</h1>
          @if (c.equipada) {
            <span style="font-size: 0.85rem; padding: 4px 10px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #3b82f6; font-weight: 600;">COZINHA EQUIPADA</span>
          } @else {
            <span style="font-size: 0.85rem; padding: 4px 10px; border-radius: 4px; background: rgba(107, 114, 128, 0.2); color: #9ca3af; font-weight: 600;">COZINHA SIMPLES (NÃO EQUIPADA)</span>
          }
        </header>

        <div style="display: flex; justify-content: flex-end;">
          <c81-button type="button" variant="secondary" (click)="abrirEdicao()">Editar dados da cozinha</c81-button>
        </div>

        @if (editando()) {
          <c81-card [raised]="true" [pad]="true" style="max-width: 520px;">
            <h2 style="margin-bottom: var(--space-4);">Editar Cozinha</h2>
            <form (submit)="salvarDadosCozinha($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Nome da Cozinha
                <input class="c81-input" [(ngModel)]="form.nome" name="nome-cozinha" required />
              </label>

              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Inquilino
                <select class="c81-input" [(ngModel)]="form.inquilinoId" name="inquilino-cozinha">
                  <option value="">Sem inquilino</option>
                  @for (inquilino of inquilinos(); track inquilino.id) {
                    <option [value]="inquilino.id">{{ inquilino.nome }}</option>
                  }
                </select>
              </label>

              <div style="display: flex; align-items: center; gap: var(--space-2);">
                <input type="checkbox" [(ngModel)]="form.equipada" name="equipada-cozinha" id="equipada-cozinha" style="width: 18px; height: 18px;" />
                <label for="equipada-cozinha" style="font-weight: 500; cursor: pointer;">Esta cozinha é equipada?</label>
              </div>

              <div style="display: flex; gap: var(--space-3);">
                <c81-button type="submit" variant="primary">Salvar alterações</c81-button>
                <c81-button type="button" variant="ghost" (click)="cancelarEdicao()">Cancelar</c81-button>
              </div>
            </form>
          </c81-card>
        }

        <!-- Compliance Warnings -->
        @if (alertasAtivos().length > 0) {
          <c81-card [pad]="true" style="border-left: 4px solid var(--status-warn);">
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--status-warn);"></div>
              <span style="color: var(--status-warn); font-weight: 600;">Atenção: Esta cozinha possui pendências de validade de documentos!</span>
            </div>
          </c81-card>
        }

        <div style="display: grid; grid-template-columns: 1fr; gap: var(--space-6); align-items: start;">
          <c81-card [pad]="true" style="max-width: 720px;">
            <h2 style="margin-bottom: var(--space-2);">Conformidade da cozinha</h2>
            <p style="margin: 0; color: var(--text-secondary);">Os documentos desta cozinha continuam disponíveis na tela de inquilinos para revisão e gerenciamento centralizado.</p>
          </c81-card>
        </div>
      }
    </div>
  `,
})
export class CozinhaDetalheComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  protected readonly cozinhaId = this.route.snapshot.paramMap.get('id')!;
  protected readonly cozinha = signal<Cozinha | null>(null);
  protected readonly inquilinos = signal<InquilinoOption[]>([]);
  protected readonly alertasAtivos = signal<Alerta[]>([]);
  protected readonly carregando = signal(true);
  protected readonly editando = signal(false);
  protected readonly uploadErro = signal<string | null>(null);

  protected form = { nome: '', equipada: false, inquilinoId: '' };

  ngOnInit(): void {
    this.carregarInquilinos();
    this.carregarDados();
  }

  protected carregarInquilinos(): void {
    this.http.get<InquilinoOption[]>(`${API_BASE}/backoffice/inquilinos`).subscribe({
      next: (lista) => this.inquilinos.set(lista),
      error: () => this.inquilinos.set([]),
    });
  }

  protected carregarDados(): void {
    this.carregando.set(true);

    // Cozinha Info
    this.http.get<Cozinha>(`${API_BASE}/backoffice/cozinhas/${this.cozinhaId}`).subscribe((c) => {
      this.cozinha.set(c);
      this.form = { nome: c.nome, equipada: c.equipada, inquilinoId: c.inquilino_id ?? '' };
      this.carregando.set(false);
    });

    // Alertas ativos para esta cozinha
    this.http.get<Alerta[]>(`${API_BASE}/backoffice/alertas/cozinha/${this.cozinhaId}`).subscribe((alertas) => {
      this.alertasAtivos.set(alertas);
    });
  }

  protected abrirEdicao(): void {
    const atual = this.cozinha();
    if (!atual) return;
    this.form = { nome: atual.nome, equipada: atual.equipada, inquilinoId: atual.inquilino_id ?? '' };
    this.editando.set(true);
  }

  protected cancelarEdicao(): void {
    const atual = this.cozinha();
    this.form = atual ? { nome: atual.nome, equipada: atual.equipada, inquilinoId: atual.inquilino_id ?? '' } : { nome: '', equipada: false, inquilinoId: '' };
    this.editando.set(false);
  }

  protected salvarDadosCozinha(event: Event): void {
    event.preventDefault();
    const nome = this.form.nome.trim();
    if (!nome) {
      this.uploadErro.set('Informe o nome da cozinha.');
      return;
    }

    this.uploadErro.set(null);
    this.http.put(`${API_BASE}/backoffice/cozinhas/${this.cozinhaId}`, {
      nome,
      equipada: this.form.equipada,
      inquilinoId: this.form.inquilinoId || undefined,
    }).subscribe({
      next: () => {
        this.editando.set(false);
        this.carregarDados();
      },
      error: (e) => {
        this.uploadErro.set(e?.error?.message ?? 'Não foi possível atualizar a cozinha.');
      },
    });
  }

}
