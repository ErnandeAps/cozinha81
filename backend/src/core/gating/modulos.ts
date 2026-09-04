/** Módulos contratáveis por Inquilino (flags de Módulo — AD-3). Fonte única. */
export const MODULOS = ['gestao_cozinha', 'pedidos_kds'] as const;
export type Modulo = (typeof MODULOS)[number];

export function isModulo(value: string): value is Modulo {
  return (MODULOS as readonly string[]).includes(value);
}
