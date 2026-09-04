import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonComponent, CardComponent } from '@cozinha81/design-system';
import { Pedido, PedidosApiService, StatusPedido } from './pedidos-api.service';

@Component({
  selector: 'app-pedidos',
  standalone: true,
  imports: [CommonModule, FormsModule, CardComponent, ButtonComponent, DatePipe],
  template: `
    <header style="display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); flex-wrap: wrap;">
      <div>
        <span class="c81-eyebrow">PEDIDOS</span>
        <h1 style="margin-top: var(--space-1);">Pedidos</h1>
      </div>
      <c81-button variant="primary" type="button" (click)="abrirNovoPedido()">+ Novo pedido</c81-button>
    </header>

    @if (erro()) {
      <p role="alert" style="color: var(--status-stop); margin-top: var(--space-3);" data-test="erro-pedidos">{{ erro() }}</p>
    }

    @if (formAberto()) {
      <c81-card [raised]="true" [pad]="true" style="max-width: 640px; margin-top: var(--space-5);">
        <h2>Novo pedido manual</h2>
        <form (submit)="salvarPedido($event)" style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-3);">
          <label>
            Nome do item
            <input class="c81-input" type="text" [(ngModel)]="itemNome" name="itemNome" placeholder="Ex.: Burger" />
          </label>
          <label>
            Quantidade
            <input class="c81-input" type="number" min="1" [(ngModel)]="itemQuantidade" name="itemQuantidade" />
          </label>
          <div style="display: flex; gap: var(--space-3);">
            <c81-button type="submit" variant="primary">Salvar pedido</c81-button>
            <c81-button type="button" variant="ghost" (click)="fecharNovoPedido()">Cancelar</c81-button>
          </div>
        </form>
      </c81-card>
    }

    <c81-card [pad]="true" style="margin-top: var(--space-5);">
      @if (pedidos().length === 0) {
        <p>Nenhum pedido registrado.</p>
      } @else {
        <table style="width: 100%; border-collapse: collapse;" data-test="tabela-pedidos">
          <thead>
            <tr style="text-align: left; border-bottom: var(--hairline);">
              <th style="padding: var(--space-2);">Pedido</th>
              <th>Origem</th>
              <th>Itens</th>
              <th>Status</th>
              <th>Valor</th>
              <th>Hora</th>
            </tr>
          </thead>
          <tbody>
            @for (pedido of pedidos(); track pedido.id) {
              <tr style="border-bottom: var(--hairline);" data-test="linha-pedido">
                <td style="padding: var(--space-2);">#{{ pedido.numero }}</td>
                <td>{{ pedido.origem }}</td>
                <td>
                  @for (item of pedido.itens; track item.id) {
                    <span style="display: inline-block; margin-right: var(--space-2);">
                      {{ item.nome }} × {{ item.quantidade }}
                    </span>
                  }
                </td>
                <td>
                  <select class="c81-select" [value]="pedido.status" (change)="mudarStatus(pedido.id, $any($event.target).value)" data-test="status-pedido">
                    <option value="aceitar">Aceitar</option>
                    <option value="em_preparo">Em preparo</option>
                    <option value="pronto">Pronto</option>
                    <option value="entregue">Entregue</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </td>
                <td style="font-variant-numeric: tabular-nums;">{{ formatarValor(pedido.valor_centavos) }}</td>
                <td>{{ pedido.criado_em | date: 'shortTime' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </c81-card>
  `,
})
export class PedidosComponent implements OnInit {
  private readonly api = inject(PedidosApiService);

  protected readonly pedidos = signal<Pedido[]>([]);
  protected readonly erro = signal<string | null>(null);
  protected readonly formAberto = signal(false);

  protected itemNome = '';
  protected itemQuantidade = 1;

  ngOnInit(): void {
    this.carregar();
  }

  protected abrirNovoPedido(): void {
    this.formAberto.set(true);
    this.erro.set(null);
  }

  protected fecharNovoPedido(): void {
    this.formAberto.set(false);
    this.itemNome = '';
    this.itemQuantidade = 1;
  }

  protected salvarPedido(event: Event): void {
    event.preventDefault();

    const nome = this.itemNome.trim();
    if (!nome || this.itemQuantidade < 1) {
      this.erro.set('Informe o nome e a quantidade do item.');
      return;
    }

    this.api.criarManual({
      itens: [{ id: crypto.randomUUID(), nome, quantidade: Number(this.itemQuantidade) }],
    }).subscribe({
      next: (pedido) => {
        this.pedidos.update((atual) => [pedido, ...atual]);
        this.fecharNovoPedido();
      },
      error: () => this.erro.set('Não foi possível criar o pedido.'),
    });
  }

  protected mudarStatus(id: string, status: string): void {
    this.api.atualizarStatus(id, status as StatusPedido).subscribe({
      next: () => this.carregar(),
      error: () => this.erro.set('Não foi possível atualizar o status.'),
    });
  }

  protected formatarValor(valorCentavos: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valorCentavos / 100);
  }

  protected carregar(): void {
    this.api.listar().subscribe({
      next: (lista) => this.pedidos.set(lista),
      error: () => this.erro.set('Falha ao carregar pedidos.'),
    });
  }
}
