import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
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

@Component({
  selector: 'app-gestor-contratos',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header class="c81-page-header" style="padding: var(--space-6);">
      <span class="c81-eyebrow">COMERCIAL</span>
      <h1 class="c81-page-title" style="margin: 0; font-size: 2rem;">Gestor de contratos</h1>
    </header>

    <div style="padding: 0 var(--space-6) var(--space-6) var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      <c81-card [pad]="true">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-5);">
          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Selecione o inquilino
              <select class="c81-input" [(ngModel)]="form.inquilinoId" name="inquilinoId" required>
                <option value="">-- Escolha um inquilino --</option>
                @for (tenant of inquilinos(); track tenant.id) {
                  <option [value]="tenant.id">{{ tenant.nome }}</option>
                }
              </select>
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Selecione a cozinha
              <select class="c81-input" [(ngModel)]="form.cozinhaId" name="cozinhaId" required>
                <option value="">-- Escolha uma cozinha --</option>
                @for (cozinha of cozinhas(); track cozinha.id) {
                  <option [value]="cozinha.id">{{ cozinha.nome }}</option>
                }
              </select>
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Valor custo da cozinha por hora
              <input class="c81-input" type="number" min="0" step="0.01" [(ngModel)]="form.valorCustoHora" name="valorCustoHora" />
            </label>

            <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
              Permanência em horas por dia
              <input class="c81-input" type="number" min="1" step="0.5" [(ngModel)]="form.permanenciaHorasDia" name="permanenciaHorasDia" />
            </label>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--space-4);">
            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Período
              </label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                  Data inicial
                  <input class="c81-input" type="date" [(ngModel)]="form.dataInicial" name="dataInicial" />
                </label>
                <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                  Data final
                  <input class="c81-input" type="date" [(ngModel)]="form.dataFinal" name="dataFinal" />
                </label>
              </div>
            </div>

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Módulos contratados
              </label>
              <div style="display: flex; flex-direction: column; gap: var(--space-2); margin-top: var(--space-2);">
                <label style="display: flex; align-items: center; gap: var(--space-2);">
                  <input type="checkbox" [(ngModel)]="form.modulos.gestaoCozinha" name="gestaoCozinha" />
                  Gestão da cozinha
                </label>
                <label style="display: flex; align-items: center; gap: var(--space-2);">
                  <input type="checkbox" [(ngModel)]="form.modulos.pedidosKds" name="pedidosKds" />
                  Pedidos KDS
                </label>
              </div>
            </div>

            <div>
              <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                Reserva
              </label>
              <div style="margin-top: var(--space-2); border: var(--hairline); border-radius: 8px; padding: var(--space-3); background: rgba(255,255,255,0.02);">
                <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: var(--space-2);">Agenda e reservas</div>
                <div style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-2);">
                  <span>{{ cozinhaSelecionadaLabel() || 'Nenhuma cozinha selecionada' }}</span>
                  <span>{{ inquilinoSelecionadoLabel() || 'Nenhum inquilino' }}</span>
                </div>
                <div style="margin-top: var(--space-3);">
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2);">
                    <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                      Data
                      <input class="c81-input" type="date" [(ngModel)]="form.dataReserva" name="dataReserva" />
                    </label>
                    <label style="display: flex; flex-direction: column; gap: var(--space-1); font-weight: 500;">
                      Modalidade
                      <select class="c81-input" [(ngModel)]="form.modalidadeReserva" name="modalidadeReserva">
                        <option value="turno">Turno</option>
                        <option value="dia">Dia completo</option>
                        <option value="personalizado">Personalizado</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </c81-card>

    </div>
  `,
})
export class GestorContratosComponent {
  private readonly http = inject(HttpClient);

  protected readonly inquilinos = signal<Tenant[]>([]);
  protected readonly cozinhas = signal<Cozinha[]>([]);

  protected readonly form = {
    inquilinoId: '',
    cozinhaId: '',
    valorCustoHora: 0,
    permanenciaHorasDia: 8,
    dataInicial: '',
    dataFinal: '',
    dataReserva: '',
    modalidadeReserva: 'turno',
    documentoInquilinoId: '',
    tipoDocumento: '',
    modulos: {
      gestaoCozinha: true,
      pedidosKds: true,
    },
  };

  protected readonly inquilinoSelecionadoLabel = () => {
    const id = this.form.inquilinoId;
    return this.inquilinos().find((tenant) => tenant.id === id)?.nome ?? '';
  };

  protected readonly cozinhaSelecionadaLabel = () => {
    const id = this.form.cozinhaId;
    return this.cozinhas().find((cozinha) => cozinha.id === id)?.nome ?? '';
  };

  constructor() {
    this.carregarDados();
  }

  private carregarDados(): void {
    this.http.get<Tenant[]>(`${API_BASE}/backoffice/inquilinos`).subscribe((tenants) => {
      this.inquilinos.set(tenants);
      if (tenants.length && !this.form.inquilinoId) {
        this.form.inquilinoId = tenants[0].id;
      }
    });

    this.http.get<Cozinha[]>(`${API_BASE}/backoffice/cozinhas`).subscribe((cozinhas) => {
      this.cozinhas.set(cozinhas);
      if (cozinhas.length && !this.form.cozinhaId) {
        this.form.cozinhaId = cozinhas[0].id;
      }
      if (!this.form.dataReserva) {
        this.form.dataReserva = new Date().toISOString().split('T')[0];
      }
    });
  }
}
