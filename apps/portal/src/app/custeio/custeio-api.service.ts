import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { API_BASE } from '../core/api.config';

export type MetodoCusteio = 'ultimo_preco' | 'medio_ponderado';
export interface CusteioConfig {
  metodo: MetodoCusteio;
  versao: number;
}

@Injectable({ providedIn: 'root' })
export class CusteioApiService {
  private readonly base = `${API_BASE}/portal/custeio`;
  private readonly http = inject(HttpClient);

  /** `null` quando o método ainda não foi definido (sem default). */
  obter(): Observable<CusteioConfig | null> {
    return this.http.get<CusteioConfig | null>(this.base);
  }

  definir(metodo: MetodoCusteio): Observable<CusteioConfig> {
    return this.http.put<CusteioConfig>(this.base, { metodo });
  }
}
