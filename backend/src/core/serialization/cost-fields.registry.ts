/**
 * Registro ÚNICO e versionado dos campos sensíveis a custo (AD-4).
 *
 * Esta é a fonte da verdade que a camada de serialização usa para esconder
 * custo do Operador (FR-3). Épicos futuros (Estoque, Fichas, CMV) adicionam
 * seus campos AQUI via `registerCostFields(...)` — nunca em interceptors locais,
 * senão dois endpoints divergem e vazam.
 */
export const COST_FIELDS_REGISTRY_VERSION = 1;

const COST_FIELDS = new Set<string>([
  // preço de compra
  'preco_compra',
  'precoCompra',
  'preco_centavos',
  'precoCentavos',
  // custo de Insumo/Ficha
  'custo_insumo',
  'custoInsumo',
  'custo_ficha',
  'custoFicha',
  // método de custeio
  'custeio',
  // CMV unitário/valor/%
  'cmv_unitario',
  'cmvUnitario',
  'cmvUnitarioCentavos',
  'cmv_valor',
  'cmvValor',
  'cmvValorCentavos',
  'cmv_percentual',
  'cmvPercentual',
  // faturamento
  'faturamento',
  'faturamentoCentavos',
  // custo de Ficha por porção / total (Story 3.2)
  'custoPorcaoCentavos',
  'custoTotalCentavos',
  'custo_porcao_centavos',
  'custo_total_centavos',
]);

/** Registra campos de custo adicionais (chamado por módulos no bootstrap). */
export function registerCostFields(...nomes: string[]): void {
  for (const n of nomes) COST_FIELDS.add(n);
}

export function isCostField(nome: string): boolean {
  return COST_FIELDS.has(nome);
}

export function costFieldNames(): string[] {
  return [...COST_FIELDS];
}
