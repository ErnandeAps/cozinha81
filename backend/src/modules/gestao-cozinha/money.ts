/** Escala fixa das quantidades de sub-ficha (mili-porção): 1000 = 1 porção. */
export const SUB_ESCALA = 1000n;

/** Divisão com arredondamento half-up para inteiros positivos. */
export function divRound(a: bigint, b: bigint): bigint {
  if (b === 0n) return 0n;
  return (2n * a + b) / (2n * b);
}
