export interface CriarCozinhaDto {
  nome: string;
  equipada?: boolean;
  inquilinoId?: string;
}

export interface AtualizarCozinhaDto {
  nome?: string;
  equipada?: boolean;
  inquilinoId?: string;
}
