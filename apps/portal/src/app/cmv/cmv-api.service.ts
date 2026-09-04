import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { API_BASE } from '../core/api.config';

export interface CmvUnitario {
  fichaId: string;
  metodo: string;
  versao: number;
  asOf: string;
  cmvUnitarioCentavos: string;
}

export interface CmvValorPeriodo {
  competencia: string;
  de: string;
  ate: string;
  metodo: string;
  versao: number;
  asOf: string;
  cmvValorCentavos: string;
  faturamentoCentavos: string | null;
  faturamentoOrigem: 'manual' | 'pedidos' | null;
  cmvPercentual: string | null;
}

@Injectable({ providedIn: 'root' })
export class CmvApiService {
  private readonly base = `${API_BASE}/portal/cmv`;
  private readonly http = inject(HttpClient);

  unitario(fichaId: string): Observable<CmvUnitario> {
    return this.http.get<CmvUnitario>(`${this.base}/fichas/${fichaId}/unitario`);
  }

  valorPeriodo(competencia: string): Observable<CmvValorPeriodo> {
    return this.http.get<CmvValorPeriodo>(`${this.base}/periodo`, { params: { competencia } });
  }

  definirFaturamento(competencia: string, valorCentavos: number): Observable<unknown> {
    return this.http.put(`${this.base}/faturamento`, { competencia, valorCentavos });
  }
}
