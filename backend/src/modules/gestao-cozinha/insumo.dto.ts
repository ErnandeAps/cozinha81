export interface CriarInsumoDto {
  nome: string;
  unidade_base: string;
  estoque_minimo?: number | null;
  lote_validade?: boolean;
  unidade_uso?: string | null;
  fator_conversao?: number | null;
}

export interface AtualizarInsumoDto {
  nome?: string;
  unidade_base?: string;
  estoque_minimo?: number | null;
  lote_validade?: boolean;
  unidade_uso?: string | null;
  fator_conversao?: number | null;
}

export interface RegistrarEntradaDto {
  insumoId: string;
  quantidade: number;
  precoCentavos: number;
  causeKey: string;
  lote?: string | null;
  validade?: string | null;
}

export interface RegistrarPerdaDto {
  quantidade: number;
  causeKey: string;
  motivo: string;
}
