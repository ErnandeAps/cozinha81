import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard-operacional',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="dashboard-shell">
      <header class="topbar">
        <div>
          <span class="eyebrow">OPERACIONAL</span>
          <h1>Dashboard operacional</h1>
        </div>
        <div class="status-pill">Hoje · 08:30</div>
      </header>

      <div class="kpi-grid">
        <article class="kpi card">
          <span class="label">Faturamento</span>
          <strong>R$ 12.850</strong>
          <small>342 pedidos</small>
        </article>
        <article class="kpi card">
          <span class="label">Ticket médio</span>
          <strong>R$ 37,57</strong>
          <small>Em produção: 18</small>
        </article>
        <article class="kpi card">
          <span class="label">Atrasados</span>
          <strong>3</strong>
          <small>Meta: 15 min</small>
        </article>
        <article class="kpi card warning">
          <span class="label">Tempo prep.</span>
          <strong>14 min</strong>
          <small>Meta: 15 min ✓</small>
        </article>
      </div>

      <div class="panel-grid">
        <article class="card wide">
          <div class="panel-header">
            <span>Faturamento por hora</span>
          </div>
          <div class="spark spark--bars" aria-label="Faturamento por hora">
            <span></span><span></span><span></span><span></span><span></span><span></span>
          </div>
        </article>

        <article class="card">
          <div class="panel-header">
            <span>Pedidos por status</span>
          </div>
          <ul class="simple-list">
            <li><span>Aguardando</span><strong>8</strong></li>
            <li><span>Em produção</span><strong>18</strong></li>
            <li><span>Prontos</span><strong>6</strong></li>
            <li class="alert"><span>Atrasados</span><strong>3</strong></li>
          </ul>
        </article>

        <article class="card">
          <div class="panel-header">
            <span>Tempo médio de preparo</span>
          </div>
          <div class="metric-box">
            <strong>14 min</strong>
            <small>Meta: 15 min ✓</small>
          </div>
        </article>

        <article class="card">
          <div class="panel-header">
            <span>Pedidos em tempo real</span>
          </div>
          <ul class="live-list">
            <li><span>#4582</span><strong>Marmitaria</strong><em>🟡 08 min</em></li>
            <li><span>#4583</span><strong>Burger House</strong><em>🔵 14 min</em></li>
            <li class="alert"><span>#4584</span><strong>Pizza Express</strong><em>🔴 29 min</em></li>
          </ul>
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
        background: rgba(16, 185, 129, 0.12);
        color: #0b8a5d;
        border: 1px solid rgba(16, 185, 129, 0.25);
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

      .warning { border-color: rgba(245, 158, 11, 0.5); }

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

      .spark {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        align-items: end;
        gap: 12px;
        height: 150px;
        padding-top: 14px;
      }

      .spark span {
        display: block;
        border-radius: 12px 12px 0 0;
        background: linear-gradient(180deg, var(--flame-300), var(--flame-500));
        height: var(--h);
      }

      .spark span:nth-child(1) { --h: 38%; }
      .spark span:nth-child(2) { --h: 54%; }
      .spark span:nth-child(3) { --h: 48%; }
      .spark span:nth-child(4) { --h: 72%; }
      .spark span:nth-child(5) { --h: 66%; }
      .spark span:nth-child(6) { --h: 84%; }

      .simple-list,
      .live-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
      }

      .simple-list li,
      .live-list li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: var(--space-3);
        border-bottom: 1px solid rgba(148, 163, 184, 0.25);
        padding-bottom: var(--space-2);
      }

      .simple-list li.alert,
      .live-list li.alert {
        color: #b91c1c;
      }

      .live-list strong,
      .simple-list strong {
        font-weight: 700;
      }

      .metric-box {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 140px;
      }

      .metric-box strong {
        font-size: 2.25rem;
      }

      .metric-box small {
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
export class DashboardOperacionalComponent {}
