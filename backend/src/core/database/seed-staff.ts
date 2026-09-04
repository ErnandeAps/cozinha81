import { Pool } from 'pg';
import { buildPoolConfig } from './database.config';
import { hashPassword } from '../auth/password';

/**
 * Seed do PRIMEIRO staff de plataforma (bootstrap do realm de plataforma).
 *
 * Não existe signup de staff (AD-11) e ninguém pode autorizar o primeiro —
 * então a credencial inicial nasce de um seed operável, idempotente, a partir
 * do ambiente. Rode uma vez por ambiente, após as migrations:
 *
 *   STAFF_BOOTSTRAP_EMAIL=ops@cozinha81 STAFF_BOOTSTRAP_SENHA=*** \
 *     nx run backend:seed-staff
 *
 * `ON CONFLICT (email) DO NOTHING`: reexecutar não duplica nem sobrescreve a
 * senha de um staff existente (troca de senha é outro fluxo).
 */
async function main(): Promise<void> {
  const email = process.env.STAFF_BOOTSTRAP_EMAIL?.trim();
  const senha = process.env.STAFF_BOOTSTRAP_SENHA;
  const nome = process.env.STAFF_BOOTSTRAP_NOME?.trim() || 'Staff Cozinha81';

  if (!email || !senha) {
    console.error('[seed-staff] defina STAFF_BOOTSTRAP_EMAIL e STAFF_BOOTSTRAP_SENHA.');
    process.exit(1);
  }

  const pool = new Pool(buildPoolConfig());
  try {
    const senhaHash = await hashPassword(senha);
    const { rowCount } = await pool.query(
      `INSERT INTO staff (email, nome, senha_hash) VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING`,
      [email, nome, senhaHash],
    );
    if (rowCount === 0) {
      console.log(`[seed-staff] staff "${email}" já existe — nada alterado.`);
    } else {
      console.log(`[seed-staff] staff "${email}" criado.`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('[seed-staff] falhou:', err);
  process.exit(1);
});
