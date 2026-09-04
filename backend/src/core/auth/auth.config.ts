/** Segredo de assinatura do JWT. Em produção é obrigatório vir do ambiente. */
export function jwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  if (env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET é obrigatório em produção.');
  }
  return 'dev-only-insecure-secret-change-me';
}

/** Validade do token (curta; refresh fica para iteração futura). */
export const JWT_EXPIRES_IN = '1h';
