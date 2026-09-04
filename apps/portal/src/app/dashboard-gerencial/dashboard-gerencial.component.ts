import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-gerencial',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="dashboard-shell">
      <header class="topbar">
        <div>
          <span class="eyebrow">GERENCIAL</span>
          <h1>Dashboard gerencial</h1>
        </div>
        <div class="status-pill">Mês atual · 12/09</div>
      </header>

      <div class="kpi-grid">
        <article class="kpi card primary">
          <span class="label">Receita</span>
          <strong>R$ 184.420</strong>
          <small>+12,4% vs. mês anterior</small>
        </article>
        <article class="kpi card">
          <span class="label">Margem</span>
          <strong>28,6%</strong>
          <small>Meta: 26,0%</small>
        </article>
        <article class="kpi card">
          <span class="label">CMV</span>
          <strong>R$ 67.900</strong>
          <small>22,8% da receita</small>
        </article>
        <article class="kpi card warning">
          <span class="label">Custo por prato</span>
          <strong>R$ 14,10</strong>
          <small>+0,8% nos últimos 7 dias</small>
        </article>
      </div>

      <div class="panel-grid">
        <article class="card wide">
          <div class="panel-header">
            <span>Desempenho por categoria</span>
          </div>
          <div class="bar-chart" aria-label="Desempenho por categoria">
            <div><label>Prato principal</label><span style="--value: 82%"></span></div>
            <div><label>Bebidas</label><span style="--value: 66%"></span></div>
            <div><label>Porções</label><span style="--value: 58%"></span></div>
            <div><label>Sobremesas</label><span style="--value: 49%"></span></div>
          </div>
        </article>

        <article class="card">
          <div class="panel-header">
            <span>Indicadores</span>
          </div>
          <ul class="indicators">
            <li><span>Lucro bruto</span><strong>R$ 71.240</strong></li>
            <li><span>Gastos fixos</span><strong>R$ 19.440</strong></li>
            <li><span>Estoques</span><strong>91%</strong></li>
            <li><span>Rotatividade</span><strong>5,8x</strong></li>
          </ul>
        </article>

        <article class="card">
          <div class="panel-header">
            <span>Top itens</span>
          </div>
          <ul class="rank-list">
            <li><span>1. Moqueca</span><strong>R$ 6.370</strong></li>
            <li><span>2. Burger</span><strong>R$ 5.920</strong></li>
            <li><span>3. Salada</span><strong>R$ 4.180</strong></li>
            <li><span>4. Suco natural</span><strong>R$ 3.610</strong></li>
          </ul>
        </article>

        <article class="card">
          <div class="panel-header">
            <span>Estoque e perdas</span>
          </div>
          <div class="donut-wrap">
            <div class="donut">
              <span>92%</span>
            </div>
            <div class="legend">
              <small>Disponível</small>
              <small>Perdas 3,4%</small>
            </div>
          </div>
        </article>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        color: var(--ink);
      }

      .dashboard-shell {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
      }

      .topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
      }

      .eyebrow {
        display: inline-block;
        font-size: 12px;
        letter-spacing: 0.18em;
        color: var(--flame-500);
        font-weight: 700;
        margin-bottom: var(--space-2);
      }

      h1 {
        margin: 0;
        font-size: clamp(2rem, 3vw, 2.5rem);
      }

      .status-pill {
        background: rgba(59, 130, 246, 0.12);
        color: #1d4ed8;
        border: 1px solid rgba(59, 130, 246, 0.25);
        border-radius: 999px;
        padding: 0.5rem 0.75rem;
        font-size: 12px;
        font-weight: 700;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(180px, 1fr));
        gap: var(--space-4);
      }

      .card {
        background: linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.04));
        border: 1px solid var(--steel-700);
        border-radius: 18px;
        padding: var(--space-5);
        box-shadow: 0 14px 30px rgba(16, 24, 40, 0.08);
      }

      .kpi {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
      }

      .kpi.primary {
        background: linear-gradient(135deg, rgba(249, 115, 22, 0.12), rgba(255,255,255,0.1));
      }

      .kpi .label {
        font-size: 0.72rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--steel-600);
      }

      .kpi strong {
        font-size: clamp(1.6rem, 2vw, 2.2rem);
        font-weight: 800;
      }

      .kpi small {
        color: var(--steel-600);
      }

      .panel-grid {
        display: grid;
        grid-template-columns: 1.2fr 0.8fr;
        gap: var(--space-5);
      }

      .wide {
        min-height: 230px;
      }

      .panel-header {
        font-size: 0.8rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--steel-600);
        margin-bottom: var(--space-4);
      }

      .bar-chart {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .bar-chart > div {
        display: grid;
        grid-template-columns: 160px 1fr;
        gap: var(--space-3);
        align-items: center;
      }

      .bar-chart label {
        color: var(--steel-600);
      }

      .bar-chart span {
        display: block;
        width: var(--value);
        height: 12px;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--flame-400), var(--flame-600));
      }

      .indicators,
      .rank-list {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .indicators li,
      .rank-list li {
        display: flex;
        justify-content: space-between;
        gap: var(--space-2);
        border-bottom: 1px solid rgba(148, 163, 184, 0.25);
        padding-bottom: var(--space-2);
      }

      .donut-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-5);
        min-height: 140px;
      }

      .donut {
        width: 116px;
        height: 116px;
        border-radius: 50%;
        background: conic-gradient(var(--flame-500) 0 92%, rgba(148,163,184,0.25) 92% 100%);
        display: grid;
        place-items: center;
      }

      .donut span {
        width: 76px;
        height: 76px;
        border-radius: 50%;
        background: #fff;
        display: grid;
        place-items: center;
        font-weight: 800;
      }

      .legend {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
        color: var(--steel-600);
      }

      @media (max-width: 980px) {
        .kpi-grid,
        .panel-grid {
          grid-template-columns: 1fr 1fr;
        }
      }

      @media (max-width: 720px) {
        .kpi-grid,
        .panel-grid {
          grid-template-columns: 1fr;
        }
      }
    `
  ]
})
export class DashboardGerencialComponent {}
