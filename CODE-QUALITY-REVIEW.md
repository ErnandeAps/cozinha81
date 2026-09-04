# Code Quality Review — `cozinha81-core`

> Revisão thermo-nuclear de qualidade (estrutura, abstrações, duplicação, fronteiras).
> Foco: **mesmo comportamento, código mais simples e direto.** Nenhum item abaixo muda comportamento.

## Resumo

Base de código disciplinada: nenhum arquivo escrito à mão passa de 1k linhas, matemática de dinheiro 100% inteira/determinística, isolamento multi-tenant via GUC transaction-local limpo, idempotência por `cause_key` consistente. Os pontos abaixo são **estruturais**, não de correção.

Ordem sugerida de execução:
1. Itens mecânicos de de-duplicação: **#2, #4, #5** (rápidos, alto valor).
2. Refatoração estrutural principal: **#1** (árvore de Fichas).
3. Decisão de fronteira: **#3** (data-access / openapi).
4. Limpezas menores: **#6, #7**.

---

## 🔴 1. `ficha.service.ts` percorre a mesma árvore 5 vezes, de 5 jeitos diferentes

**Arquivo:** `backend/src/modules/gestao-cozinha/ficha.service.ts`

Cinco travessias recursivas da árvore `ficha → ficha_item → sub_ficha`, cada uma reimplementando o mesmo esqueleto (query dos filhos + guard de ciclo + guard de profundidade + recursão):

- `custoTotal` (linha ~273)
- `consumoInsumos` (linha ~214)
- `profundidade` — profundidade para baixo (linha ~334)
- `nivelAcima` — profundidade para cima (linha ~352)
- `alcancavel` — alcançabilidade/ciclo (linha ~367)

Problemas:
- Guard de ciclo copiado 4×: `if (visitados.has(fichaId)) throw ...; const visitados2 = new Set(visitados).add(fichaId);`
- **Inconsistência:** `alcancavel` muta `visitados` in-place (linha ~370) enquanto os outros copiam o `Set`; uns lançam exceção em ciclo, `alcancavel` retorna `false`.
- A query `SELECT ... FROM ficha_item WHERE ficha_id = $1` aparece repetida em cada método.
- A query `SELECT rendimento_porcoes FROM ficha WHERE id = $1` aparece em 3 lugares (linhas ~184, ~241, ~299).
- O **mesmo invariante** ("árvore ≤3 níveis, sem ciclo") é validado por dois algoritmos diferentes conforme o caminho de escrita:
  - `criar` (linha ~91) checa só `profundidade`.
  - `adicionarItem` (linhas ~137–146) checa `alcancavel` + `nivelAcima` + `profundidade` (três travessias para validar um insert).

**Ajuste (code-judo):** materializar a subárvore uma vez em um mapa de adjacência em memória (`carregarSubarvore(c, fichaId): Promise<Map<id, FichaItemRow[]>>`, memoizado), e transformar todo o resto em funções puras sobre esse grafo já carregado:
- profundidade + detecção de ciclo viram **um único DFS** que retorna ambos;
- `custoTotal` e `consumoInsumos` viram folds sobre o mesmo mapa (sem `SELECT` no meio da recursão).

**Mínimo aceitável** (se não for fazer o grafo completo): extrair `carregarItens(c, fichaId)` e um único `guardCicloEProfundidade()` compartilhado pelas 5 travessias.

---

## 🔴 2. `divRound` duplicado — e é código de dinheiro determinístico

Implementação idêntica de divisão half-up em dois arquivos:
- `backend/src/modules/gestao-cozinha/ficha.service.ts` (linha ~52)
- `backend/src/modules/gestao-cozinha/cmv.service.ts` (linha ~35)

É a regra de arredondamento que garante que o CMV bate com o número do editor de Ficha. Se as duas cópias divergirem, os custos divergem silenciosamente e nenhum teste de um arquivo pega o do outro.

**Ajuste:** mover para um único `money.ts` (junto de `SUB_ESCALA`) e importar nos dois.

---

## 🟠 3. Camada de "contrato compartilhado" é decorativa — usar ou deletar

- `libs/data-access/src/lib/api-client.ts` exporta um cliente `openapi-fetch` com `baseUrl` hardcoded `http://localhost:3000`. **Nenhum app importa** — cada app tem seu próprio `*ApiService` com `HttpClient`.
- `libs/domain-models/src/lib/openapi-types.ts` só descreve `/api`, `/health`, `/error-test`. Todo o domínio real (insumos, fichas, produção, CMV) está **ausente** — está desatualizado / nunca foi regenerado.
- Consequência: o frontend redeclara à mão os modelos do backend (ex.: `insumo-api.service.ts` linhas 7–62 re-tipam `Insumo`, `CriarInsumoDto`, `PerdaDto`, cópias manuais de `InsumoRow` e dos DTOs), sem nenhum contrato que force a concordância.

**Ajuste (decidir um):**
- (a) Regenerar `openapi-types` a partir do OpenAPI real do Nest e fazer os apps consumirem o cliente tipado; **ou**
- (b) Deletar `data-access` + os tipos stub para não fingirem ser uma fronteira.

---

## 🟠 4. `novaCauseKey()` — gerador de UUID de 13 linhas duplicado

Implementação idêntica em:
- `apps/portal/src/app/estoque/insumo-api.service.ts` (linhas ~70–81)
- `apps/portal/src/app/producao/producao-api.service.ts` (linhas ~29–39)

**Ajuste:** extrair para um util compartilhado único (core do frontend ou lib `data-access`).

---

## 🟠 5. Cast `tenantId as string` espalhado por todos os controllers

~28 ocorrências nos 6 controllers (só `insumo.controller.ts` tem 10). Causa raiz: `AuthPrincipal.tenantId` é `?: string` porque o tipo une os realms tenant + plataforma. Mas em rota tenant-guarded o `tenantId` está **sempre** presente (o guard já garante). Reafirmar isso com `as string` em cada call site é o conserto errado.

**Ajuste:** um param decorator `@CurrentTenant(): string` (ou um subtipo `TenantPrincipal` que o guard estreita) que resolve e assegura o `tenantId` **uma vez**. Os controllers ficam sem cast e o invariante mora em um lugar só.

Arquivos afetados:
- `backend/src/modules/gestao-cozinha/insumo.controller.ts`
- `backend/src/modules/gestao-cozinha/ficha.controller.ts`
- `backend/src/modules/gestao-cozinha/producao.controller.ts`
- `backend/src/modules/gestao-cozinha/cmv.controller.ts`
- `backend/src/modules/gestao-cozinha/custeio.controller.ts`
- `backend/src/modules/identidade/convite.controller.ts`

---

## 🟡 6. Validação de item duplicada em `ficha.service.ts`

A checagem "exatamente um de insumoId/subFichaId + quantidade > 0" está duplicada entre:
- `criar` (linhas ~74–81)
- `adicionarItem` (linhas ~118–123)

**Ajuste:** extrair um `validarItem(item)`.

---

## 🟡 7. Estilos inline no frontend vazando a fronteira do design-system

`apps/portal/src/app/estoque/estoque.component.ts` (e componentes irmãos) usam `style="..."` inline em todo lugar, embora exista uma `libs/design-system`. Não é bloqueador (é consistente), mas a fronteira de estilo está vazando.

**Ajuste (oportuno):** mover padrões repetidos para classes/utilitários do design-system.

---

## 🧹 Limpeza trivial

- Deletar os três `nx-welcome.ts` (872 linhas idênticas de boilerplate do Nx) em `apps/{portal,kds,backoffice}/src/app/` se não estiverem em uso.

---

## O que **não** precisa de ajuste (bons exemplos a seguir)

- Tamanho de arquivos: todos saudáveis, nenhum cruzando 1k linhas.
- `DatabaseService.withTenant` / RLS / GUC transaction-local — desenho correto.
- Delta do ledger único (`MOV_DELTA` / `SALDO_POR_INSUMO` em `insumo.service.ts` linhas ~63–64) — exemplo da disciplina de helper canônico que o resto do código deveria seguir.
- Idempotência por `cause_key` consistente em entrada/perda/baixa/produção.
