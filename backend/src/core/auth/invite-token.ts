import { createHash, randomBytes } from 'node:crypto';

/** TTL padrão do convite. */
export const CONVITE_TTL_DIAS = 7;

/** sha256 hex de um token de convite (o que vai ao banco). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Gera um token de convite opaco e seu hash de armazenamento. */
export function gerarTokenConvite(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashToken(token) };
}
