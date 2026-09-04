import { Injectable } from '@angular/core';

export type StatusEntregador = 'ativo' | 'pausado' | 'offline';
export type TurnoEntregador = 'manhã' | 'tarde' | 'noite';

export interface Entregador {
  id: string;
  nome: string;
  celular: string;
  veiculo: string;
  placa: string;
  turno: TurnoEntregador;
  status: StatusEntregador;
  observacoes?: string;
}

const dadosIniciais: Entregador[] = [
  {
    id: 'ent-1',
    nome: 'Rafael Costa',
    celular: '(11) 99812-4455',
    veiculo: 'Moto',
    placa: 'ABC1D23',
    turno: 'manhã',
    status: 'ativo',
    observacoes: 'Atende zona sul e centro',
  },
  {
    id: 'ent-2',
    nome: 'Marcos Silva',
    celular: '(11) 98777-1102',
    veiculo: 'Bicicleta',
    placa: 'SEM PLACA',
    turno: 'tarde',
    status: 'pausado',
    observacoes: 'Folga até 18h',
  },
  {
    id: 'ent-3',
    nome: 'João Pereira',
    celular: '(11) 97654-2211',
    veiculo: 'Carro',
    placa: 'XYZ4A12',
    turno: 'noite',
    status: 'offline',
    observacoes: 'Em manutenção',
  },
];

@Injectable({ providedIn: 'root' })
export class EntregadoresApiService {
  private entregadores = [...dadosIniciais];

  listar(): Entregador[] {
    return [...this.entregadores];
  }

  criar(dto: Omit<Entregador, 'id'>): Entregador {
    const entregador: Entregador = {
      ...dto,
      id: `ent-${Date.now()}`,
    };
    this.entregadores = [entregador, ...this.entregadores];
    return entregador;
  }

  atualizar(id: string, dto: Partial<Entregador>): Entregador | undefined {
    const index = this.entregadores.findIndex((e) => e.id === id);
    if (index === -1) return undefined;
    this.entregadores[index] = { ...this.entregadores[index], ...dto };
    return this.entregadores[index];
  }

  remover(id: string): boolean {
    const antes = this.entregadores.length;
    this.entregadores = this.entregadores.filter((e) => e.id !== id);
    return this.entregadores.length !== antes;
  }
}
