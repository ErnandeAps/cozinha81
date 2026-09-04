import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { API_BASE } from '../core/api.config';

export interface FichaResumo {
  id: string;
  nome: string;
  rendimento_porcoes: number;
}

export interface FichaItem {
  id: string;
  insumo_id: string | null;
  sub_ficha_id: string | null;
  quantidade: string;
}

export interface FichaDetalhe extends FichaResumo {
  itens: FichaItem[];
}

export interface CustoFicha {
  /** Ausentes para Operador (redação de custo server-side). */
  custoPorcaoCentavos?: string;
  custoTotalCentavos?: string;
  metodo?: string;
  versao?: number;
}

export interface ItemInput {
  insumoId?: string;
  subFichaId?: string;
  quantidade: number;
}

export interface CriarFichaDto {
  nome: string;
  rendimentoPorcoes?: number;
  itens: ItemInput[];
}

@Injectable({ providedIn: 'root' })
export class FichaApiService {
  private readonly base = `${API_BASE}/portal/fichas`;
  private readonly http = inject(HttpClient);

  listar(): Observable<FichaResumo[]> {
    return this.http.get<FichaResumo[]>(this.base);
  }

  obter(id: string): Observable<FichaDetalhe> {
    return this.http.get<FichaDetalhe>(`${this.base}/${id}`);
  }

  custo(id: string): Observable<CustoFicha> {
    return this.http.get<CustoFicha>(`${this.base}/${id}/custo`);
  }

  criar(dto: CriarFichaDto): Observable<FichaDetalhe> {
    return this.http.post<FichaDetalhe>(this.base, dto);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
