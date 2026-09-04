import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { type Observable } from 'rxjs';
import { API_BASE } from '../core/api.config';

/** Quantidades vêm como string (bigint) do backend; saldo é derivado do ledger. */
export interface Insumo {
  id: string;
  nome: string;
  unidade_base: string;
  estoque_minimo: string | null;
  lote_validade: boolean;
  unidade_uso: string | null;
  fator_conversao: string | null;
  quantidade_atual: string;
}

export interface Movimento {
  id: string;
  tipo: string;
  quantidade: string;
  /** Ausente quando o principal é Operador (redação de custo server-side). */
  preco_centavos?: string | null;
  cause_key: string;
  criado_em: string;
}

export interface AlertaAtivo {
  id: string;
  insumo_id: string;
  nome: string;
  quantidade_atual: string;
  unidade_base: string;
  estoque_minimo: string | null;
}

export interface CriarInsumoDto {
  nome: string;
  unidade_base: string;
  estoque_minimo?: number | null;
  lote_validade?: boolean;
  unidade_uso?: string | null;
  fator_conversao?: number | null;
}

export interface EntradaDto {
  insumoId: string;
  quantidade: number;
  precoCentavos: number;
  causeKey: string;
  lote?: string | null;
  validade?: string | null;
}

export interface PerdaDto {
  quantidade: number;
  motivo: string;
  causeKey: string;
}

import { novaCauseKey } from '../core/uuid';

@Injectable({ providedIn: 'root' })
export class InsumoApiService {
  private readonly base = `${API_BASE}/portal/insumos`;
  private readonly http = inject(HttpClient);

  /** Chave de idempotência alocada no clique (AD-6). */
  novaCauseKey(): string {
    return novaCauseKey();
  }

  listar(): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(this.base);
  }

  criar(dto: CriarInsumoDto): Observable<Insumo> {
    return this.http.post<Insumo>(this.base, dto);
  }

  atualizar(id: string, dto: Partial<CriarInsumoDto>): Observable<Insumo> {
    return this.http.put<Insumo>(`${this.base}/${id}`, dto);
  }

  remover(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  registrarEntrada(dto: EntradaDto): Observable<Movimento> {
    return this.http.post<Movimento>(`${this.base}/entradas`, dto);
  }

  registrarPerda(insumoId: string, dto: PerdaDto): Observable<Movimento> {
    return this.http.post<Movimento>(`${this.base}/${insumoId}/perdas`, dto);
  }

  historicoPrecos(insumoId: string): Observable<Movimento[]> {
    return this.http.get<Movimento[]>(`${this.base}/${insumoId}/precos`);
  }

  alertasAtivos(): Observable<AlertaAtivo[]> {
    return this.http.get<AlertaAtivo[]>(`${this.base}/alertas/ativos`);
  }
}
