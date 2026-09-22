/**
 * Tabela de preços canônicos de aluguel (por Modalidade) e assinaturas de Módulo.
 * Valores em centavos BRL (AD-3: backoffice é dono do billing).
 * Deferido: gateway de pagamento é plugável e não acoplado aqui.
 */

/** Aluguel por modalidade de reserva (FR-38) */
export const PRECO_ALUGUEL_CENTAVOS: Record<string, number> = {
  turno:        15_000, // R$ 150,00
  cafe:         20_000, // R$ 200,00
  almoco:       30_000, // R$ 300,00
  jantar:       35_000, // R$ 350,00
  personalizado: 45_000, // R$ 450,00
  dia:          50_000, // R$ 500,00
  semana:       300_000, // R$ 3.000,00
  mes:          1_000_000, // R$ 10.000,00
};

export const MODALIDADE_PERCENTE_ALUGUEL: Record<string, number> = {
  cafe: 0.6,
  almoco: 1,
  jantar: 0.8,
  personalizado: 1,
};

/**
 * Assinatura mensal de módulo do Portal (FR-39).
 * As chaves devem coincidir com os valores canônicos em core/gating/modulos.ts.
 */
export const PRECO_MODULO_CENTAVOS: Record<string, number> = {
  gestao_cozinha: 20_000, // R$ 200,00
  pedidos_kds:    10_000, // R$ 100,00
};

export const PRECO_GAS_CENTAVOS: Record<string, number> = {
  m3: 300, // R$ 3,00 por m³
};
