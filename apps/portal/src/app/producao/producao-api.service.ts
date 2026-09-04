import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { API_BASE } from '../core/api.config';

export type StatusBaixa = 'pendente' | 'baixado' | 'sem_ficha';
export type ModoBaixa = 'automatico' | 'manual';

export interface Producao {
  id: string;
  ficha_id: string | null;
  quantidade: string;
  status_baixa: StatusBaixa;
  cause_key: string | null;
  criado_em: string;
}

export interface RegistrarProducaoDto {
  fichaId?: string | null;
  quantidade: number;
  causeKey?: string | null;
}

import { novaCauseKey } from '../core/uuid';

@Injectable({ providedIn: 'root' })
export class ProducaoApiService {
  private readonly base = `${API_BASE}/portal/producoes`;
  private readonly http = inject(HttpClient);

  /** Chave de idempotência alocada no clique (AD-6): reenvio não duplica a baixa. */
  novaCauseKey(): string {
    return novaCauseKey();
  }

  listar(): Observable<Producao[]> {
    return this.http.get<Producao[]>(this.base);
  }

  registrar(dto: RegistrarProducaoDto): Observable<Producao> {
    return this.http.post<Producao>(this.base, dto);
  }

  obterConfig(): Observable<{ modoBaixa: ModoBaixa }> {
    return this.http.get<{ modoBaixa: ModoBaixa }>(`${this.base}/config`);
  }

  definirConfig(modoBaixa: ModoBaixa): Observable<{ modoBaixa: ModoBaixa }> {
    return this.http.put<{ modoBaixa: ModoBaixa }>(`${this.base}/config`, { modoBaixa });
  }

  baixarManual(id: string): Observable<Producao> {
    return this.http.post<Producao>(`${this.base}/${id}/baixa`, {});
  }
}
