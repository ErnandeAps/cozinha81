import { compare, hash } from 'bcryptjs';

const ROUNDS = 12;

/**
 * Hash bcrypt válido que não casa com nenhuma senha real. Usado para rodar um
 * `compare` mesmo quando o usuário não existe, igualando o tempo de resposta e
 * evitando enumeração de contas por timing.
 */
export const DUMMY_BCRYPT_HASH = '$2a$12$vxtMF3lJO22BHAnKHdeXReOm.aWXiFtg/yXANp6rY7X/CewjbLvei';

/** Hash de senha (bcrypt). Usado por staff (1.3) e Usuário de Inquilino (1.4/1.5). */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain, ROUNDS);
}

/** Verifica senha contra o hash armazenado. */
export function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return compare(plain, hashed);
}
