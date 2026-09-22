import { Component, inject, type OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { API_BASE } from '../core/api.config';

interface MaterialSaldo {
  id: string;
  nome: string;
  saldo: number;
}

interface Tenant {
  id: string;
  nome: string;
}

interface Movimento {
  id: string;
  material_id: string;
  tenant_id: string | null;
  tipo: 'entrada' | 'consumo';
  quantidade: number;
  valor_unitario: number;
  criado_em: string;
}

@Component({
  selector: 'app-materiais',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header class="c81-page-header" style="padding: var(--space-6); display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span class="c81-eyebrow">GESTÃO DE ESTOQUE</span>
        <h1 class="c81-page-title" style="margin: 0; font-size: 2rem;">Materiais Fornecidos</h1>
      </div>
      <c81-button variant="primary" (click)="abrirFormMaterial()" data-test="novo-material">+ Novo Material</c81-button>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      @if (erro()) {
        <p role="alert" class="c81-alert-danger" data-test="erro">{{ erro() }}</p>
      }

      <!-- Form: Register Material Catalog -->
      @if (mostrarFormMaterial()) {
        <c81-card [raised]="true" [pad]="true" style="max-width: 520px;">
          <h2 style="margin-bottom: var(--space-4);">Novo Material no Catálogo</h2>
          <form (submit)="salvarMaterial($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Nome do Material
                <input class="c81-input" [(ngModel)]="materialForm.nome" name="nome" placeholder="Ex: Papel Toalha, Toucas" required data-test="m-nome" />
              </label>
            </div>
            <div style="display: flex; gap: var(--space-3); margin-top: var(--space-2);">
              <c81-button type="submit" variant="primary" data-test="m-salvar">Cadastrar</c81-button>
              <c81-button type="button" variant="ghost" (click)="fecharFormMaterial()">Cancelar</c81-button>
            </div>
          </form>
        </c81-card>
      }

      <div style="display: grid; grid-template-columns: 3fr 2fr; gap: var(--space-6); align-items: start;">
        
        <!-- Table: Materials and Balances -->
        <c81-card [pad]="true">
          <h2 style="margin-bottom: var(--space-4);">Saldos Atuais em Estoque</h2>
          @if (carregando()) {
            <p>Carregando materiais...</p>
          } @else if (materiais().length === 0) {
            <p style="color: var(--text-secondary);">Nenhum material cadastrado no catálogo.</p>
          } @else {
            <table class="c81-table" data-test="tabela-materiais" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 2px solid var(--border-subtle); text-align: left;">
                  <th style="padding: var(--space-3) 0;">Nome</th>
                  <th style="padding: var(--space-3) 0; text-align: right;">Quantidade em Estoque</th>
                </tr>
              </thead>
              <tbody>
                @for (m of materiais(); track m.id) {
                  <tr style="border-bottom: var(--hairline);">
                    <td style="padding: var(--space-3) 0; font-weight: 500;">{{ m.nome }}</td>
                    <td style="padding: var(--space-3) 0; text-align: right; font-weight: 600; color: {{ m.saldo === 0 ? 'var(--status-stop)' : 'var(--text-primary)' }}">
                      {{ m.saldo }} unidades
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </c81-card>

        <!-- Form: Register Stock Movement (Ledger Entry) -->
        <c81-card [raised]="true" [pad]="true">
          <h2 style="margin-bottom: var(--space-4);">Lançamento no Ledger (Movimento)</h2>
          <form (submit)="salvarMovimento($event)" style="display: flex; flex-direction: column; gap: var(--space-4);">
            
            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Selecione o Material
                <select class="c81-input" [(ngModel)]="movForm.materialId" name="materialId" required data-test="mov-material">
                  <option value="">-- Escolha um material --</option>
                  @for (m of materiais(); track m.id) {
                    <option [value]="m.id">{{ m.nome }}</option>
                  }
                </select>
              </label>
            </div>

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Tipo de Lançamento
                <select class="c81-input" [(ngModel)]="movForm.tipo" name="tipo" required data-test="mov-tipo">
                  <option value="entrada">Entrada (Reabastecimento)</option>
                  <option value="consumo">Consumo de Inquilino (Billing)</option>
                </select>
              </label>
            </div>

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Quantidade
                <input class="c81-input" type="number" [(ngModel)]="movForm.quantidade" name="quantidade" required min="1" data-test="mov-qtd" />
              </label>
            </div>

            <!-- Fields only visible for consumption type -->
            @if (movForm.tipo === 'consumo') {
              <div>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                  Selecione o Inquilino Consumidor
                  <select class="c81-input" [(ngModel)]="movForm.tenantId" name="tenantId" required data-test="mov-inquilino">
                    <option value="">-- Escolha o inquilino --</option>
                    @for (t of tenants(); track t.id) {
                      <option [value]="t.id">{{ t.nome }}</option>
                    }
                  </select>
                </label>
              </div>

              <div>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                  Preço Unitário Cobrado (R$)
                  <input class="c81-input" type="number" step="0.01" [(ngModel)]="movForm.valorBrl" name="valorBrl" required min="0" placeholder="Ex: 5.50" data-test="mov-valor" />
                </label>
              </div>
            }

            <div style="margin-top: var(--space-2);">
              <c81-button type="submit" variant="primary" [disabled]="enviando()" data-test="mov-salvar">
                {{ enviando() ? 'Registrando...' : 'Registrar Lançamento' }}
              </c81-button>
            </div>

          </form>
        </c81-card>

      </div>
    </div>
  `,
})
export class MateriaisComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly materiais = signal<MaterialSaldo[]>([]);
  protected readonly tenants = signal<Tenant[]>([]);
  protected readonly carregando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly mostrarFormMaterial = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected materialForm = { nome: '' };
  protected movForm = {
    materialId: '',
    tipo: 'entrada' as 'entrada' | 'consumo',
    quantidade: 1,
    valorBrl: 0,
    tenantId: '',
  };

  ngOnInit(): void {
    this.carregarDados();
  }

  protected carregarDados(): void {
    this.carregando.set(true);

    // Saldos de Materiais
    this.http.get<MaterialSaldo[]>(`${API_BASE}/backoffice/materiais/saldo`).subscribe((mats) => {
      this.materiais.set(mats);
      this.carregando.set(false);
    });

    // Tenants
    this.http.get<Tenant[]>(`${API_BASE}/backoffice/inquilinos`).subscribe((tenants) => {
      this.tenants.set(tenants);
    });
  }

  protected abrirFormMaterial(): void {
    this.materialForm.nome = '';
    this.mostrarFormMaterial.set(true);
  }

  protected fecharFormMaterial(): void {
    this.mostrarFormMaterial.set(false);
  }

  protected salvarMaterial(event: Event): void {
    event.preventDefault();
    this.erro.set(null);

    this.http.post(`${API_BASE}/backoffice/materiais`, this.materialForm).subscribe({
      next: () => {
        this.mostrarFormMaterial.set(false);
        this.carregarDados();
      },
      error: (e) => this.erro.set(e?.error?.message ?? 'Falha ao cadastrar o material.'),
    });
  }

  protected salvarMovimento(event: Event): void {
    event.preventDefault();
    this.erro.set(null);

    if (!this.movForm.materialId) {
      this.erro.set('Por favor, selecione um material.');
      return;
    }

    if (this.movForm.tipo === 'consumo' && !this.movForm.tenantId) {
      this.erro.set('Selecione o inquilino consumidor para lançamentos de consumo.');
      return;
    }

    this.enviando.set(true);

    const payload = {
      materialId: this.movForm.materialId,
      tipo: this.movForm.tipo,
      quantidade: this.movForm.quantidade,
      valorUnitario: this.movForm.tipo === 'consumo' ? Math.round(this.movForm.valorBrl * 100) : 0, // Convert BRL to cents
      tenantId: this.movForm.tipo === 'consumo' ? this.movForm.tenantId : undefined,
    };

    this.http.post(`${API_BASE}/backoffice/materiais/movimento`, payload).subscribe({
      next: () => {
        this.enviando.set(false);
        this.movForm = { materialId: '', tipo: 'entrada', quantidade: 1, valorBrl: 0, tenantId: '' };
        this.carregarDados();
      },
      error: (e) => {
        this.enviando.set(false);
        this.erro.set(e?.error?.message ?? 'Falha ao registrar movimento.');
      },
    });
  }
}
