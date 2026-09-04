import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { Entregador, EntregadoresApiService, StatusEntregador, TurnoEntregador } from './entregadores-api.service';

@Component({
  selector: 'app-entregadores',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent],
  template: `
    <header style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap;">
      <div>
        <span class="c81-eyebrow">ENTREGADORES</span>
        <h1 style="margin-top: var(--space-1);">Entregadores próprios</h1>
      </div>
      <c81-button variant="primary" type="button" (click)="abrirFormulario()">+ Novo entregador</c81-button>
    </header>

    @if (formAberto()) {
      <c81-card [raised]="true" [pad]="true" style="max-width: 700px; margin-top: var(--space-5);">
        <h2>{{ editandoId() ? 'Editar entregador' : 'Cadastrar entregador' }}</h2>
        <form (submit)="salvar($event)" style="display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: var(--space-3); margin-top: var(--space-3);">
          <label>
            Nome
            <input class="c81-input" type="text" [(ngModel)]="form.nome" name="nome" required />
          </label>
          <label>
            Celular
            <input class="c81-input" type="text" [(ngModel)]="form.celular" name="celular" required />
          </label>
          <label>
            Veículo
            <input class="c81-input" type="text" [(ngModel)]="form.veiculo" name="veiculo" placeholder="Moto / Carro / Bicicleta" required />
          </label>
          <label>
            Placa
            <input class="c81-input" type="text" [(ngModel)]="form.placa" name="placa" required />
          </label>
          <label>
            Turno
            <select class="c81-select" [(ngModel)]="form.turno" name="turno">
              <option value="manhã">Manhã</option>
              <option value="tarde">Tarde</option>
              <option value="noite">Noite</option>
            </select>
          </label>
          <label>
            Status
            <select class="c81-select" [(ngModel)]="form.status" name="status">
              <option value="ativo">Ativo</option>
              <option value="pausado">Pausado</option>
              <option value="offline">Offline</option>
            </select>
          </label>
          <label style="grid-column: 1 / -1;">
            Observações
            <textarea class="c81-input" rows="3" [(ngModel)]="form.observacoes" name="observacoes"></textarea>
          </label>
          <div style="grid-column: 1 / -1; display: flex; gap: var(--space-3);">
            <c81-button type="submit" variant="primary">{{ editandoId() ? 'Salvar alterações' : 'Salvar' }}</c81-button>
            <c81-button type="button" variant="ghost" (click)="fecharFormulario()">Cancelar</c81-button>
          </div>
        </form>
      </c81-card>
    }

    <c81-card [pad]="true" style="margin-top: var(--space-5);">
      @if (entregadores().length === 0) {
        <p>Nenhum entregador cadastrado.</p>
      } @else {
        <table style="width: 100%; border-collapse: collapse;" data-test="tabela-entregadores">
          <thead>
            <tr style="text-align: left; border-bottom: var(--hairline);">
              <th style="padding: var(--space-2);">Nome</th>
              <th>Veículo</th>
              <th>Turno</th>
              <th>Status</th>
              <th>Contato</th>
            </tr>
          </thead>
          <tbody>
            @for (entregador of entregadores(); track entregador.id) {
              <tr style="border-bottom: var(--hairline);" data-test="linha-entregador">
                <td style="padding: var(--space-2);">{{ entregador.nome }}</td>
                <td>{{ entregador.veiculo }} / {{ entregador.placa }}</td>
                <td>{{ rotuloTurno(entregador.turno) }}</td>
                <td>
                  <span class="c81-badge" [ngClass]="statusClass(entregador.status)">{{ rotuloStatus(entregador.status) }}</span>
                </td>
                <td>
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);">
                    <span>{{ entregador.celular }}</span>
                    <div style="display: flex; gap: var(--space-2);">
                      <c81-button size="sm" variant="secondary" type="button" (click)="abrirFormulario(entregador)">Editar</c81-button>
                      <c81-button size="sm" variant="danger" type="button" (click)="remover(entregador.id)">Excluir</c81-button>
                    </div>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </c81-card>
  `,
  styles: [
    `
      .c81-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.3rem 0.7rem;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .status-ativo {
        background: rgba(16, 185, 129, 0.14);
        color: #0b8a5d;
      }

      .status-pausado {
        background: rgba(245, 158, 11, 0.12);
        color: #b45309;
      }

      .status-offline {
        background: rgba(148, 163, 184, 0.12);
        color: #475569;
      }
    `
  ],
})
export class EntregadoresComponent {
  private readonly api = new EntregadoresApiService();

  protected readonly entregadores = signal<Entregador[]>(this.api.listar());
  protected readonly formAberto = signal(false);
  protected readonly editandoId = signal<string | null>(null);

  protected form = {
    nome: '',
    celular: '',
    veiculo: 'Moto',
    placa: '',
    turno: 'manhã' as TurnoEntregador,
    status: 'ativo' as StatusEntregador,
    observacoes: '',
  };

  protected abrirFormulario(entregador?: Entregador): void {
    this.formAberto.set(true);
    this.editandoId.set(entregador?.id ?? null);

    if (entregador) {
      this.form = {
        nome: entregador.nome,
        celular: entregador.celular,
        veiculo: entregador.veiculo,
        placa: entregador.placa,
        turno: entregador.turno,
        status: entregador.status,
        observacoes: entregador.observacoes ?? '',
      };
      return;
    }

    this.form = {
      nome: '',
      celular: '',
      veiculo: 'Moto',
      placa: '',
      turno: 'manhã',
      status: 'ativo',
      observacoes: '',
    };
  }

  protected fecharFormulario(): void {
    this.formAberto.set(false);
    this.editandoId.set(null);
    this.form = {
      nome: '',
      celular: '',
      veiculo: 'Moto',
      placa: '',
      turno: 'manhã',
      status: 'ativo',
      observacoes: '',
    };
  }

  protected salvar(event: Event): void {
    event.preventDefault();

    const entrega: Omit<Entregador, 'id'> = {
      nome: this.form.nome.trim(),
      celular: this.form.celular.trim(),
      veiculo: this.form.veiculo.trim(),
      placa: this.form.placa.trim(),
      turno: this.form.turno,
      status: this.form.status,
      observacoes: this.form.observacoes.trim(),
    };

    if (!entrega.nome || !entrega.celular || !entrega.placa) {
      return;
    }

    const idAtual = this.editandoId();
    if (idAtual) {
      const atualizado = this.api.atualizar(idAtual, entrega);
      if (atualizado) {
        this.entregadores.update((lista) => lista.map((item) => item.id === idAtual ? atualizado : item));
      }
    } else {
      const criado = this.api.criar(entrega);
      this.entregadores.update((lista) => [criado, ...lista]);
    }

    this.fecharFormulario();
  }

  protected remover(id: string): void {
    const removido = this.api.remover(id);
    if (removido) {
      this.entregadores.update((lista) => lista.filter((item) => item.id !== id));
    }
  }

  protected rotuloStatus(status: StatusEntregador): string {
    return status === 'ativo' ? 'Ativo' : status === 'pausado' ? 'Pausado' : 'Offline';
  }

  protected rotuloTurno(turno: TurnoEntregador): string {
    return turno === 'manhã' ? 'Manhã' : turno === 'tarde' ? 'Tarde' : 'Noite';
  }

  protected statusClass(status: StatusEntregador): string {
    return `status-${status}`;
  }
}
