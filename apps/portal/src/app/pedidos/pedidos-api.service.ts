import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, of, type Observable } from 'rxjs';
import { API_BASE } from '../core/api.config';
import { novaCauseKey } from '../core/uuid';

export type StatusPedido =
  | 'aceitar'
  | 'em_preparo'
  | 'pronto'
  | 'entregue'
  | 'cancelado';

export interface PedidoItem {
  id: string;
  nome: string;
  quantidade: number;
  ficha_id?: string;
}

export interface Pedido {
  id: string;
  numero: number;
  cliente: string;
  origem: 'Manual' | 'iFood' | '99Food';
  status: StatusPedido;
  itens: PedidoItem[];
  valor_centavos: number;
  criado_em: string;
}

export interface CriarPedidoManualDto {
  itens: PedidoItem[];
}

const fallbackPedidos: Pedido[] = [
  {
    id: 'ped-1001',
    numero: 1001,
    cliente: 'Mesa 02',
    origem: 'Manual',
    status: 'em_preparo',
    itens: [
      { id: 'item-1', nome: 'Moqueca', quantidade: 2 },
      { id: 'item-2', nome: 'Suco Natural', quantidade: 1 },
    ],
    valor_centavos: 5900,
    criado_em: new Date().toISOString(),
  },
  {
    id: 'ped-1002',
    numero: 1002,
    cliente: 'Delivery - João',
    origem: 'iFood',
    status: 'aceitar',
    itens: [{ id: 'item-3', nome: 'Burger', quantidade: 1 }],
    valor_centavos: 3200,
    criado_em: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'ped-1003',
    numero: 1003,
    cliente: 'Mesa 08',
    origem: 'Manual',
    status: 'pronto',
    itens: [{ id: 'item-4', nome: 'Salada', quantidade: 1 }],
    valor_centavos: 2500,
    criado_em: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

@Injectable({ providedIn: 'root' })
export class PedidosApiService {
  private readonly http = inject(HttpClient);

  listar(): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${API_BASE}/pedidos`).pipe(
      catchError(() => of(fallbackPedidos as Pedido[]))
    );
  }

  criarManual(dto: CriarPedidoManualDto): Observable<Pedido> {
    return this.http.post<Pedido>(`${API_BASE}/pedidos/manual`, dto).pipe(
      catchError(() =>
        of({
          id: `mock-${Date.now()}`,
          numero: Date.now() % 9000 + 1000,
          cliente: 'Cliente novo',
          origem: 'Manual',
          status: 'aceitar',
          itens: dto.itens,
          valor_centavos: 0,
          criado_em: new Date().toISOString(),
        } as Pedido)
      )
    );
  }

  atualizarStatus(id: string, status: StatusPedido): Observable<{ success: boolean; status?: unknown }> {
    return this.http
      .post<{ success: boolean; status?: unknown }>(`${API_BASE}/pedidos/${id}/status`, {
        status,
        cause_key: novaCauseKey(),
      })
      .pipe(catchError(() => of({ success: true, status })));
  }
}
