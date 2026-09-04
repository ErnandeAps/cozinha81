# Migração para Precisão Decimal (numeric) e Unidades Padronizadas — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o sistema de inteiros escalados (`bigint` + `escala`) pelo tipo nativo exato `numeric` do PostgreSQL para quantidades de estoque, eliminando a coluna `escala` e simplificando a lógica do código do backend e frontend. Além disso, padronizar as unidades de medida em Peso (kg/g), Volume (L/ml) e Unidade (un), mapeando automaticamente os fatores de conversão na interface.

**Architecture:**
1. **Banco de Dados:** Criar uma migração SQL (`022_alter_bigint_to_numeric.sql`) para alterar os tipos de coluna de `bigint` para `numeric` em `insumo.estoque_minimo`, `movimento_estoque.quantidade`, `ficha_item.quantidade` e `producao.quantidade`. A coluna `insumo.escala` será deletada.
2. **Backend (NestJS):** 
   - Remover `escala` dos DTOs e das entidades de Insumo.
   - Atualizar a tipagem de quantidades e saldos de `bigint` para `number` (float em JS/TS, operado sobre os strings do `pg` driver) nas operações matemáticas, simplificando os cálculos de custo e CMV para divisões e multiplicações diretas com arredondamento no resultado financeiro.
3. **Frontend (Angular):** 
   - Remover o input de escala do formulário de cadastro.
   - Implementar um seletor (dropdown) com opções padronizadas: Peso (kg/g), Volume (L/ml) e Unidade (un), configurando automaticamente as unidades e fatores de conversão sob o capô.
   - Simplificar os inputs de Entrada e Perda para aceitarem floats diretos.

**Tech Stack:** NestJS 11, Angular 22, PostgreSQL 18, Jest.

## Global Constraints

* Dinheiro/Custo sempre mantido em centavos (`bigint`/`number` inteiros).
* Quantidades agora manipuladas como decimais reais (`numeric` no Postgres, tratados como `number`/`string` no NestJS e Angular).
* Nomes de campos e classes em Português (PT-BR).

---

### Task 1: Migração do Banco de Dados e DTOs

**Files:**
* Create: `cozinha81-core/backend/src/core/database/migrations/022_alter_bigint_to_numeric.sql`
* Modify: `cozinha81-core/backend/src/modules/gestao-cozinha/insumo.dto.ts`

**Interfaces:**
* Altera o schema de banco de dados e remove propriedades de `escala` do payload de criação de Insumo.

- [ ] **Step 1: Criar arquivo de migração SQL**

Criar o arquivo [022_alter_bigint_to_numeric.sql](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/backend/src/core/database/migrations/022_alter_bigint_to_numeric.sql) com a seguinte instrução:

```sql
-- Migration: Alterar quantidades de bigint para numeric e remover escala
ALTER TABLE insumo DROP COLUMN IF EXISTS escala CASCADE;
ALTER TABLE insumo ALTER COLUMN estoque_minimo TYPE numeric;
ALTER TABLE movimento_estoque ALTER COLUMN quantidade TYPE numeric;
ALTER TABLE ficha_item ALTER COLUMN quantidade TYPE numeric;
ALTER TABLE producao ALTER COLUMN quantidade TYPE numeric;
```

- [ ] **Step 2: Remover escala dos DTOs de Insumo**

No arquivo [insumo.dto.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/backend/src/modules/gestao-cozinha/insumo.dto.ts), remover a propriedade `escala` de `CriarInsumoDto` e `AtualizarInsumoDto`:

```typescript
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
```

- [ ] **Step 3: Resetar e aplicar migrações no Docker local**

Executar a limpeza do banco e re-rodar migrações:
```bash
docker compose down -v
docker compose up -d
# Aguardar 3 segundos para o Postgres inicializar
sleep 3
DATABASE_URL=postgres://admin:admin@localhost:5432/cozinha81 npx nx run backend:migrate
```

---

### Task 2: Refatorar Service e Controller de Insumo (Backend)

**Files:**
* Modify: `cozinha81-core/backend/src/modules/gestao-cozinha/insumo.service.ts`
* Modify: `cozinha81-core/backend/src/modules/gestao-cozinha/insumo.controller.ts`

**Interfaces:**
* Métodos do `InsumoService` e `InsumoController` atualizados para refletir a remoção da escala e conversão direta.

- [ ] **Step 1: Atualizar interfaces de retorno e lógica no InsumoService**

No arquivo [insumo.service.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/backend/src/modules/gestao-cozinha/insumo.service.ts):
1. Remover `escala` da interface `InsumoRow` e `AlertaAtivoRow`.
2. Alterar o insert de Insumo para não incluir `$4` (escala).
3. Atualizar as asserções de limite de estoque para compararem números decimais.
4. Substituir os métodos de conversão de unidade de uso e custo por:

```typescript
  // InsumoRow
  export interface InsumoRow {
    id: string;
    tenant_id: string;
    nome: string;
    unidade_base: string;
    estoque_minimo: string | null;
    lote_validade: boolean;
    unidade_uso: string | null;
    fator_conversao: string | null;
    quantidade_atual: string;
    criado_em: Date;
  }

  // AlertaAtivoRow
  export interface AlertaAtivoRow {
    id: string;
    insumo_id: string;
    nome: string;
    quantidade_atual: string;
    unidade_base: string;
    estoque_minimo: string | null;
  }

  // Substituir criar(...)
  async criar(tenantId: string, dto: CriarInsumoDto): Promise<InsumoRow> {
    if (!dto.nome?.trim()) throw new BadRequestException('Nome do insumo é obrigatório.');
    if (!dto.unidade_base?.trim()) throw new BadRequestException('Unidade base é obrigatória.');

    return this.db.withTenant(tenantId, async (c) => {
      const { rows } = await c.query<InsumoRow>(
        `INSERT INTO insumo (tenant_id, nome, unidade_base, estoque_minimo, lote_validade, unidade_uso, fator_conversao)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *, '0'::text as quantidade_atual`,
        [
          tenantId,
          dto.nome.trim(),
          dto.unidade_base.trim(),
          dto.estoque_minimo ?? null,
          dto.lote_validade ?? false,
          dto.unidade_uso ?? null,
          dto.fator_conversao ?? null,
        ],
      );
      return rows[0];
    });
  }

  // Substituir atualizar(...)
  // Remover a lógica de dto.escala e atualizar a query SQL correspondente.

  // Substituir métodos de conversão e cálculo por:
  converterUsoParaBase(quantidadeUso: number, fatorConversao: number): number {
    if (fatorConversao <= 0) return 0;
    return quantidadeUso / fatorConversao;
  }

  calcularCustoUso(precoBaseCentavos: number, quantidadeUso: number, fatorConversao: number): number {
    const quantBase = this.converterUsoParaBase(quantidadeUso, fatorConversao);
    return Math.round(precoBaseCentavos * quantBase);
  }

  // Na função privada verificarAlertasEstoque:
  const abaixoOuIgual = Number(quantidade_atual) <= Number(estoque_minimo);
```

- [ ] **Step 2: Atualizar rota de conversão no InsumoController**

No arquivo [insumo.controller.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/backend/src/modules/gestao-cozinha/insumo.controller.ts), remover a passagem de `insumo.escala` para `converterUsoParaBase`.

---

### Task 3: Refatorar Ficha e Produção (Backend)

**Files:**
* Modify: `cozinha81-core/backend/src/modules/gestao-cozinha/ficha.service.ts`

**Interfaces:**
* Métodos de cálculo de custo e CMV ajustados para usar floats sem escalas decimais complexas.

- [ ] **Step 1: Atualizar custoInsumoItem e consumoInsumos no FichaService**

No arquivo [ficha.service.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/backend/src/modules/gestao-cozinha/ficha.service.ts):
1. Modificar a valoração de itens para operar sobre floats matemáticos direto e retornar `bigint` arredondado para centavos:

```typescript
  private async custoInsumoItem(c: PoolClient, insumoId: string, qtdBase: number, ctx: CtxCusto): Promise<bigint> {
    if (ctx.metodo === 'ultimo_preco') {
      const { rows } = await c.query<{ preco_centavos: string; quantidade: string }>(
        `SELECT preco_centavos, quantidade FROM movimento_estoque
         WHERE insumo_id = $1 AND tipo = 'entrada' AND preco_centavos IS NOT NULL AND criado_em <= $2
         ORDER BY criado_em DESC LIMIT 1`,
        [insumoId, ctx.asOf],
      );
      if (rows.length === 0) return 0n;
      const preco = Number(rows[0].preco_centavos);
      const qtdEntrada = Number(rows[0].quantidade);
      return BigInt(Math.round((preco * qtdBase) / qtdEntrada));
    }
    
    const { rows } = await c.query<{ p: string | null; q: string | null }>(
      `SELECT SUM(preco_centavos) AS p, SUM(quantidade) AS q FROM movimento_estoque
       WHERE insumo_id = $1 AND tipo = 'entrada' AND preco_centavos IS NOT NULL AND criado_em <= $2`,
      [insumoId, ctx.asOf],
    );
    const p = rows[0].p;
    const q = rows[0].q;
    if (!p || !q || Number(q) === 0) return 0n;
    return BigInt(Math.round((Number(p) * qtdBase) / Number(q)));
  }
```

---

### Task 4: Atualizar Testes Unitários do Backend

**Files:**
* Modify: `cozinha81-core/backend/src/modules/gestao-cozinha/insumo.spec.ts`
* Modify: `cozinha81-core/backend/src/modules/gestao-cozinha/ficha.spec.ts`

- [ ] **Step 1: Ajustar valores nos testes do Insumo e Ficha**

Em [insumo.spec.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/backend/src/modules/gestao-cozinha/insumo.spec.ts) e [ficha.spec.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/backend/src/modules/gestao-cozinha/ficha.spec.ts):
* Remover campos `escala` dos objetos de seed e criação de insumos.
* Alterar as quantidades testadas de inteiros escalados para decimais exatos. Por exemplo, alterar quantidade de entrada de `2500` (representando 2.5kg na escala 3) para `2.5` diretamente.

- [ ] **Step 2: Executar testes de backend**

Executar: `npx nx test backend`  
Esperado: PASS para todos os testes.

---

### Task 5: Refatorar Tela de Estoque no Frontend (Angular)

**Files:**
* Modify: `cozinha81-core/apps/portal/src/app/estoque/estoque.component.ts`
* Modify: `cozinha81-core/apps/portal/src/app/estoque/estoque.component.spec.ts`
* Modify: `cozinha81-core/apps/portal/src/app/estoque/insumo-api.service.ts`

- [ ] **Step 1: Atualizar DTO e Interface no InsumoApiService**

Em [insumo-api.service.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/apps/portal/src/app/estoque/insumo-api.service.ts):
* Remover `escala` de `Insumo` e DTOs.

- [ ] **Step 2: Refatorar Dropdown de Unidades e Inputs no EstoqueComponent**

No arquivo [estoque.component.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/apps/portal/src/app/estoque/estoque.component.ts):
1. Remover o helper de formatação `fmt()` complexo e substituí-lo por uma formatação de número decimal simples:
   `fmt(valor: string | number | null): string { return valor !== null ? Number(valor).toLocaleString('pt-BR') : '—'; }`
2. Adicionar o controle de unidades no formulário:
   * Opções: Peso (`kg`/`g`), Volume (`L`/`ml`), Unidade (`un`/`un`).
   * Quando o usuário escolhe Peso, definimos `unidade_base = 'kg'`, `unidade_uso = 'g'` e `fator_conversao = 1000` sob o capô ao salvar.
3. Simplificar o HTML do Modal de Cadastro removendo os inputs de escala, fator de conversão e textos de unidades, inserindo o dropdown seletor de "Tipo de Medida".

- [ ] **Step 3: Ajustar Testes Unitários do Portal**

Atualizar `estoque.component.spec.ts` removendo a propriedade `escala` dos stubs e mockando os retornos com decimais nativos.

- [ ] **Step 4: Executar e validar testes**

Executar: `npx nx test portal`  
Esperado: PASS.
