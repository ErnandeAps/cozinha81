import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE } from '../core/api.config';
import { CardComponent } from '@cozinha81/design-system';
import { DatePipe } from '@angular/common';

interface Alerta {
  id: string;
  cozinha_id: string;
  documento_id: string;
  cozinha_nome: string;
  documento_tipo: string;
  documento_validade: string;
}

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CardComponent, DatePipe],
  template: `
    <div style="padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-6);">
      <header>
        <span class="c81-eyebrow">// VISÃO GERAL</span>
        <h1 style="margin-top: var(--space-1);">Painel de Controle</h1>
      </header>

      <!-- Stats Grid -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4);">
        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">COZINHAS</span>
          <h2 style="font-size: 2.5rem; margin-top: var(--space-2);">{{ totalCozinhas() }}</h2>
          <p style="color: var(--text-secondary); margin-top: var(--space-1);">Unidades físicas cadastradas</p>
        </c81-card>

        <c81-card [raised]="true" [pad]="true">
          <span class="c81-eyebrow">ALERTAS DE CONFORMIDADE</span>
          <h2 style="font-size: 2.5rem; margin-top: var(--space-2); color: {{ alertas().length > 0 ? 'var(--status-warn)' : 'var(--text-primary)' }}">{{ alertas().length }}</h2>
          <p style="color: var(--text-secondary); margin-top: var(--space-1);">Documentos expirados ou a vencer</p>
        </c81-card>
      </div>

      <!-- Compliance Alerts Section -->
      @if (alertas().length > 0) {
        <c81-card [pad]="true" style="border-left: 4px solid var(--status-warn);">
          <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-4);">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--status-warn); animation: pulse 2s infinite;"></div>
            <h3 style="margin: 0; color: var(--status-warn); font-size: 1.1rem; font-weight: 600;">Alertas de Vencimento de Documentos</h3>
          </div>

          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            @for (alerta of alertas(); track alerta.id) {
              <div style="display: flex; align-items: center; justify-content: space-between; padding: var(--space-3); background: rgba(255, 255, 255, 0.05); border-radius: 6px; border: var(--hairline);">
                <div style="display: flex; align-items: center; gap: var(--space-3);">
                  <!-- Dot indicating warning -->
                  <div style="width: 8px; height: 8px; border-radius: 50%; background: var(--status-warn);"></div>
                  <div>
                    <strong style="color: var(--text-primary);">Cozinha: {{ alerta.cozinha_nome }}</strong>
                    <div style="color: var(--text-secondary); font-size: 0.9rem; margin-top: var(--space-1);">
                      Documento: <span style="color: var(--text-primary); font-weight: 500;">{{ alerta.documento_tipo }}</span>
                    </div>
                  </div>
                </div>

                <div style="text-align: right;">
                  <span style="font-size: 0.85rem; padding: 2px 8px; border-radius: 4px; background: rgba(253, 186, 116, 0.2); color: var(--status-warn); font-weight: 500;">
                    Vence em: {{ alerta.documento_validade | date: 'dd/MM/yyyy' }}
                  </span>
                </div>
              </div>
            }
          </div>
        </c81-card>
      } @else {
        <c81-card [pad]="true">
          <div style="display: flex; align-items: center; gap: var(--space-3); color: var(--status-go);">
            <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--status-go);"></div>
            <p style="margin: 0; font-weight: 500;">Todos os documentos de conformidade estão em dia.</p>
          </div>
        </c81-card>
      }
    </div>
  `,
  styles: [`
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
      70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
    }
  `]
})
export class InicioComponent implements OnInit {
  private readonly http = inject(HttpClient);

  protected readonly totalCozinhas = signal(0);
  protected readonly alertas = signal<Alerta[]>([]);

  ngOnInit(): void {
    this.carregarDados();
  }

  private carregarDados(): void {
    // Carregar cozinhas para estatísticas
    this.http.get<any[]>(`${API_BASE}/backoffice/cozinhas`).subscribe((cozinhas) => {
      this.totalCozinhas.set(cozinhas.length);
    });

    // Carregar alertas de compliance
    this.http.get<Alerta[]>(`${API_BASE}/backoffice/alertas`).subscribe((alertas) => {
      this.alertas.set(alertas);
    });
  }
}
