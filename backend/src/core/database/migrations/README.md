# Migrations — núcleo multi-tenant

Arquivos `NNN_descricao.sql` aplicados em ordem lexicográfica pelo
`migration-runner.ts`. Cada migration roda em transação e é registrada em
`schema_migrations` (idempotente).

## Aplicar

```bash
# admin (dono do schema), NÃO o papel runtime do app
DATABASE_URL=postgres://admin:***@host:5432/cozinha81 nx run backend:migrate
```

## Papel runtime do app (obrigatório p/ RLS)

A RLS é `FORCE`, mas **superusuário e roles com `BYPASSRLS` ignoram RLS**. O app
DEVE conectar com um papel não-privilegiado, provisionado fora destas migrations
(o nome/senha são específicos do ambiente):

```sql
CREATE ROLE cozinha_app LOGIN PASSWORD '***' NOSUPERUSER NOBYPASSRLS;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO cozinha_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO cozinha_app;
```

O harness `tenant-isolation.spec.ts` provisiona exatamente esse papel para provar
o isolamento contra Postgres 18 real.
