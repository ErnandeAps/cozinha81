import { Component, inject, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

interface Cozinha {
  id: string;
  nome: string;
}

interface Tenant {
  id: string;
  nome: string;
}

interface Presenca {
  id: string;
  cozinha_id: string;
  tenant_id: string | null;
  data: string;
  tipo: 'in' | 'out';
  checklist: {
    limpeza: boolean;
    equipamento: boolean;
    observacoes?: string;
  } | null;
  criado_em: string;
}

@Component({
  selector: 'app-presenca',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header class="c81-page-header" style="padding: var(--space-6);">
      <span class="c81-eyebrow">CONTROLE DE PRESENÇA</span>
      <h1 class="c81-page-title" style="margin: 0; font-size: 2rem;">Check-in / Check-out</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      @if (erro()) {
        <p role="alert" class="c81-alert-danger" data-test="erro">{{ erro() }}</p>
      }

      <div style="display: grid; grid-template-columns: 2fr 1fr; gap: var(--space-6); align-items: start;">
        
        <!-- Presence Event Logger -->
        <c81-card [raised]="true" [pad]="true">
          <h2 style="margin-bottom: var(--space-4);">Registrar Entrada / Saída</h2>
          <form (submit)="registrar($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
            
            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Selecione a Cozinha
                <select class="c81-input" [(ngModel)]="form.cozinhaId" name="cozinhaId" required (change)="selecionarCozinha()" data-test="f-cozinha">
                  <option value="">-- Escolha uma cozinha --</option>
                  @for (c of cozinhas(); track c.id) {
                    <option [value]="c.id">{{ c.nome }}</option>
                  }
                </select>
              </label>
            </div>

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Selecione o Inquilino
                <select class="c81-input" [(ngModel)]="form.tenantId" name="tenantId" required data-test="f-inquilino">
                  <option value="">-- Escolha um inquilino --</option>
                  @for (t of tenants(); track t.id) {
                    <option [value]="t.id">{{ t.nome }}</option>
                  }
                </select>
              </label>
            </div>

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Data do registro
                <input class="c81-input" type="date" [(ngModel)]="form.data" name="data" required data-test="f-data" />
              </label>
            </div>

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Operação
                <select class="c81-input" [(ngModel)]="form.tipo" name="tipo" required data-test="f-tipo">
                  <option value="in">Check-in (Entrada)</option>
                  <option value="out">Check-out (Saída)</option>
                </select>
              </label>
            </div>

            <!-- Checklist Section -->
            <div style="border-top: var(--hairline); padding-top: var(--space-4); margin-top: var(--space-2);">
              <h3 style="margin-top: 0; margin-bottom: var(--space-3); font-size: 1.1rem;">Checklist de Estado</h3>
              
              <div style="display: flex; flex-direction: column; gap: var(--space-2);">
                <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                  <input type="checkbox" [(ngModel)]="form.checklist.limpeza" name="limpeza" data-test="f-limpeza" style="width: 18px; height: 18px;" />
                  A cozinha está limpa e higienizada?
                </label>

                <label style="display: flex; align-items: center; gap: var(--space-2); cursor: pointer;">
                  <input type="checkbox" [(ngModel)]="form.checklist.equipamento" name="equipamento" data-test="f-equipamento" style="width: 18px; height: 18px;" />
                  Todos os equipamentos estão operacionais?
                </label>

                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500; margin-top: var(--space-2);">
                  Observações / Ocorrências
                  <textarea class="c81-input" [(ngModel)]="form.checklist.observacoes" name="observacoes" placeholder="Ex: Forno industrial com lâmpada queimada" data-test="f-observacoes" rows="3"></textarea>
                </label>
              </div>
            </div>

            <div style="margin-top: var(--space-2);">
              <c81-button type="submit" variant="primary" [disabled]="enviando()" data-test="f-salvar">
                {{ enviando() ? 'Registrando...' : 'Confirmar Presença' }}
              </c81-button>
            </div>

          </form>
        </c81-card>

        <!-- Kitchen Presence History -->
        <c81-card [pad]="true">
          <h2 style="margin-bottom: var(--space-4);">Histórico da Cozinha Selecionada</h2>
          
          @if (!form.cozinhaId) {
            <p style="color: var(--text-secondary);">Selecione uma cozinha no formulário para visualizar seu histórico.</p>
          } @else if (carregando()) {
            <p>Carregando histórico...</p>
          } @else if (historico().length === 0) {
            <p style="color: var(--text-secondary);">Sem registros para esta cozinha.</p>
          } @else {
            <div style="display: flex; flex-direction: column; gap: var(--space-3); max-height: 500px; overflow-y: auto;">
              @for (p of historico(); track p.id) {
                <div style="padding: var(--space-3); border: var(--hairline); border-radius: 6px; background: rgba(255,255,255,0.02);">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>{{ obterTenantNome(p.tenant_id) }}</strong>
                    <span style="font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; font-weight: 600; background: {{ p.tipo === 'in' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)' }}; color: {{ p.tipo === 'in' ? '#10b981' : '#ef4444' }};">
                      {{ p.tipo === 'in' ? 'Check-in' : 'Check-out' }}
                    </span>
                  </div>

                  <p style="margin: var(--space-1) 0; font-size: 0.85rem; color: var(--text-secondary);">
                    {{ formatarData(p.data || p.criado_em) }}
                  </p>

                  @if (p.checklist) {
                    <div style="font-size: 0.85rem; margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px dashed var(--border-subtle);">
                      <div>Limpeza: {{ p.checklist.limpeza ? '✅ Conforme' : '❌ Inconforme' }}</div>
                      <div>Equipamentos: {{ p.checklist.equipamento ? '✅ Conforme' : '❌ Inconforme' }}</div>
                      @if (p.checklist.observacoes) {
                        <div style="margin-top: 2px; font-style: italic; color: var(--text-secondary);">Obs: "{{ p.checklist.observacoes }}"</div>
                      }
                    </div>
                  }
                </div>
              }
            </div>
          }
        </c81-card>

      </div>
    </div>
  `,
})
export class PresencaComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly cozinhas = signal<Cozinha[]>([]);
  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly historico = signal<Presenca[]>([]);
  protected readonly carregando = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected form = {
    cozinhaId: '',
    tenantId: '',
    data: '',
    tipo: 'in' as 'in' | 'out',
    checklist: {
      limpeza: true,
      equipamento: true,
      observacoes: '',
    },
  };

  ngOnInit(): void {
    this.carregarDados();
  }

  protected carregarDados(): void {
    // Cozinhas
    this.http.get<Cozinha[]>(`${API_BASE}/backoffice/cozinhas`).subscribe((cozinhas) => {
      this.cozinhas.set(cozinhas);
    });

    // Tenants
    this.http.get<Tenant[]>(`${API_BASE}/backoffice/inquilinos`).subscribe((tenants) => {
      this.tenants.set(tenants);
    });
  }

  protected selecionarCozinha(): void {
    if (!this.form.cozinhaId) {
      this.historico.set([]);
      return;
    }

    this.carregando.set(true);
    this.http.get<Presenca[]>(`${API_BASE}/backoffice/presencas/cozinha/${this.form.cozinhaId}`).subscribe({
      next: (dados) => {
        this.historico.set(dados);
        this.carregando.set(false);
      },
      error: () => {
        this.erro.set('Falha ao carregar histórico de presença.');
        this.carregando.set(false);
      },
    });
  }

  protected obterTenantNome(tenantId: string | null): string {
    if (!tenantId) return 'Administração';
    const t = this.tenants().find((x) => x.id === tenantId);
    return t ? t.nome : 'Inquilino Desconhecido';
  }

  protected formatarData(iso: string): string {
    const d = new Date(iso);
    const zero = (n: number) => String(n).padStart(2, '0');
    return `${zero(d.getDate())}/${zero(d.getMonth() + 1)}/${d.getFullYear()} às ${zero(d.getHours())}:${zero(d.getMinutes())}`;
  }

  protected registrar(event: Event): void {
    event.preventDefault();
    this.erro.set(null);

    if (!this.form.cozinhaId) {
      this.erro.set('Por favor, selecione uma cozinha.');
      return;
    }

    if (!this.form.data) {
      this.erro.set('Por favor, informe a data do registro.');
      return;
    }

    this.enviando.set(true);

    const payload = {
      cozinhaId: this.form.cozinhaId,
      tenantId: this.form.tenantId || null,
      data: this.form.data,
      tipo: this.form.tipo,
      checklist: {
        limpeza: this.form.checklist.limpeza,
        equipamento: this.form.checklist.equipamento,
        observacoes: this.form.checklist.observacoes || undefined,
      },
    };

    this.http.post<Presenca>(`${API_BASE}/backoffice/presencas`, payload).subscribe({
      next: () => {
        this.enviando.set(false);
        this.form.data = '';
        this.form.checklist = { limpeza: true, equipamento: true, observacoes: '' };
        this.selecionarCozinha();
      },
      error: (e) => {
        this.enviando.set(false);
        this.erro.set(e?.error?.message ?? 'Falha ao registrar presença.');
      },
    });
  }
}
