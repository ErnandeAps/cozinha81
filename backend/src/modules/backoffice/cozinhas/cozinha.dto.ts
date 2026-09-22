export interface CriarCozinhaDto {
  nome: string;
  equipada?: boolean;
  status?: 'liberada' | 'interditada';
  areaM2?: number;
  inquilinoId?: string;
}

export interface AtualizarCozinhaDto {
  nome?: string;
  equipada?: boolean;
  status?: 'liberada' | 'interditada';
  areaM2?: number;
  inquilinoId?: string;
}
