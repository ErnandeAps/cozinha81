# Ajustes na Tela de Estoque — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar o card de cadastro/edição de insumos em um modal flutuante e tornar a seção de alertas de estoque mínimo expansível (accordion) contendo as ações rápidas dos itens.

**Architecture:** 
1. Adicionar o controle de estado das linhas de alerta abaixo do mínimo usando o Signal `alertasExpandidos: signal<Record<string, boolean>>` no `EstoqueComponent`.
2. Refatorar o template HTML do loop de alertas para conter cabeçalhos clicáveis, setas rotativas SVG e painéis de ação rápidos.
3. Centralizar o formulário de cadastro/edição de insumos posicionando-o em um modal `.c81-modal-overlay` com suporte a cancelamento por clique externo.

**Tech Stack:** Angular 22 (signals, control flow @if/@for), Vanilla CSS, Jest.

## Global Constraints

* Idioma dos termos de negócio e código de interface em Português (PT-BR).
* Preservar os seletores de teste `data-test` e adicionar novos caso necessário.
* Não introduzir bibliotecas externas para modais ou accordions. Usar apenas CSS puro e funcionalidades reativas nativas do Angular.

---

### Task 1: Alertas de Estoque Mínimo Expandíveis (Accordion)

**Files:**
* Modify: `cozinha81-core/apps/portal/src/app/estoque/estoque.component.ts`
* Modify: `cozinha81-core/apps/portal/src/app/estoque/estoque.component.spec.ts`

**Interfaces:**
* Consumes: `Insumo` do `InsumoApiService`.
* Produces: Accordion interativo na seção de alertas e `alertasExpandidos` signal.

- [ ] **Step 1: Adicionar propriedade de estado e toggle method**

No arquivo [estoque.component.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/apps/portal/src/app/estoque/estoque.component.ts), adicionar o signal `alertasExpandidos` e o método `toggleAlerta`.

Substituir em `EstoqueComponent` a declaração de signals para conter:
```typescript
  protected readonly alertasExpandidos = signal<Record<string, boolean>>({});

  protected toggleAlerta(id: string): void {
    this.alertasExpandidos.update(map => ({
      ...map,
      [id]: !map[id]
    }));
  }
```

- [ ] **Step 2: Refatorar template HTML da seção de alertas**

No arquivo [estoque.component.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/apps/portal/src/app/estoque/estoque.component.ts), substituir a `<section ...>` por uma estrutura accordion clicável:

```html
    <!-- Alertas de estoque mínimo (Story 2.4) -->
    @if (abaixoDoMinimo().length > 0) {
      <section style="display: flex; flex-direction: column; gap: var(--space-2);" data-test="alertas">
        @for (i of abaixoDoMinimo(); track i.id) {
          <div class="c81-card" style="border-left: 4px solid var(--status-stop); display: flex; flex-direction: column;" data-test="alerta-linha">
            <!-- Cabeçalho do alerta -->
            <div 
              (click)="toggleAlerta(i.id)" 
              style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-4); cursor: pointer;"
              data-test="alerta-cabecalho"
            >
              <div class="c81-flex-gap-3" style="align-items: center;">
                <span class="c81-badge c81-badge--stop"><span class="c81-badge__dot"></span> ABAIXO DO MÍNIMO</span>
                <span><strong>{{ i.nome }}</strong> — saldo {{ fmt(i.quantidade_atual, i.escala) }} {{ i.unidade_base }} (mín. {{ fmt(i.estoque_minimo, i.escala) }})</span>
              </div>
              
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                stroke-width="2" 
                stroke-linecap="round" 
                stroke-linejoin="round"
                style="transition: transform var(--dur-base) var(--ease-out);"
                [style.transform]="alertasExpandidos()[i.id] ? 'rotate(90deg)' : 'rotate(0deg)'"
              >
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </div>

            <!-- Conteúdo expandido -->
            @if (alertasExpandidos()[i.id]) {
              <div 
                style="border-top: 1px solid var(--border-subtle); padding: var(--space-4); display: flex; justify-content: space-between; align-items: center; background: var(--bg-subtle);"
                data-test="alerta-conteudo"
              >
                <div>
                  <span style="font-size: var(--text-sm); color: var(--text-secondary);">
                    Saldo atual: <strong>{{ fmt(i.quantidade_atual, i.escala) }} {{ i.unidade_base }}</strong> | Estoque mínimo ideal: <strong>{{ fmt(i.estoque_minimo, i.escala) }} {{ i.unidade_base }}</strong>
                  </span>
                </div>
                @if (isDonoAdmin()) {
                  <div class="c81-flex-gap-2">
                    <c81-button size="sm" variant="secondary" (click)="abrirEntrada(i)" data-test="b-entrada">Entrada</c81-button>
                    <c81-button size="sm" variant="danger" (click)="pedirPerda(i)" data-test="b-perda">Perda</c81-button>
                    <c81-button size="sm" variant="ghost" (click)="editar(i)">Editar</c81-button>
                  </div>
                }
              </div>
            }
          </div>
        }
      </section>
    }
```

- [ ] **Step 3: Atualizar testes unitários do alerta**

No arquivo [estoque.component.spec.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/apps/portal/src/app/estoque/estoque.component.spec.ts), atualizar o teste `'mostra linha de alerta quando o saldo está no/abaixo do mínimo'` para verificar o comportamento de click e expansão dos botões de Entrada e Perda.

Substituir o teste por:
```typescript
  it('mostra linha de alerta quando o saldo está no/abaixo do mínimo e permite expansão', () => {
    const abaixo: Insumo = { ...INSUMO_BASE, quantidade_atual: '4000' };
    const { fixture, el } = montar(true, [abaixo]);
    expect(el.querySelector('[data-test="alerta-linha"]')).toBeTruthy();
    expect(el.querySelector('[data-test="alertas"]')?.textContent).toContain('ABAIXO DO MÍNIMO');
    
    // Inicialmente o conteúdo com ações está oculto
    expect(el.querySelector('[data-test="alerta-conteudo"]')).toBeNull();

    // Clica no cabeçalho para expandir
    const cabecalho = el.querySelector('[data-test="alerta-cabecalho"]') as HTMLElement;
    cabecalho.click();
    fixture.detectChanges();

    // Conteúdo e botões de ação devem aparecer
    expect(el.querySelector('[data-test="alerta-conteudo"]')).toBeTruthy();
    expect(el.querySelector('[data-test="b-entrada"]')).toBeTruthy();
  });
```

- [ ] **Step 4: Executar testes unitários do Portal**

Executar: `npx nx test portal`  
Esperado: PASS para todos os testes do portal, especialmente estoque.

- [ ] **Step 5: Commit do Accordion**

```bash
git add apps/portal/src/app/estoque/estoque.component.ts apps/portal/src/app/estoque/estoque.component.spec.ts
git commit -m "feat(estoque): renderiza alertas abaixo do minimo como accordion expansivel"
```

---

### Task 2: Formulário de Cadastro/Edição em Modal

**Files:**
* Modify: `cozinha81-core/apps/portal/src/app/estoque/estoque.component.ts`

**Interfaces:**
* Consumes: `mostrandoForm()` signal do componente.
* Produces: Interface modal para o formulário.

- [ ] **Step 1: Envolver o formulário no Modal Overlay**

No arquivo [estoque.component.ts](file:///Users/felipesantana/source/cozinha81/code/cozinha81-core/apps/portal/src/app/estoque/estoque.component.ts), alterar o template na seção do formulário de cadastro:

Substituir a seção de `@if (mostrandoForm()) {` por:
```html
    <!-- Formulário de cadastro/edição em modal -->
    @if (mostrandoForm()) {
      <div 
        class="c81-modal-overlay" 
        (click)="fecharForm()" 
        data-test="modal-cadastro"
        style="animation: fadeIn var(--dur-fast) var(--ease-out);"
      >
        <c81-card 
          [raised]="true" 
          [pad]="true" 
          style="max-width: 640px; width: 100%; margin: var(--space-4); max-height: 90vh; overflow-y: auto;"
          (click)="$event.stopPropagation()"
        >
          <h2>{{ editandoId() ? 'Editar' : 'Cadastrar' }} insumo</h2>
          <form (submit)="salvar($event)" class="c81-grid-2col" style="margin-top: var(--space-4);">
            <label>Nome<input class="c81-input" [(ngModel)]="form.nome" name="nome" data-test="f-nome" /></label>
            <label>Unidade base<input class="c81-input" [(ngModel)]="form.unidade_base" name="unidade_base" placeholder="kg, L, un" data-test="f-unidade" /></label>
            <label>Escala (casas)<input class="c81-input" type="number" [(ngModel)]="form.escala" name="escala" /></label>
            <label>Estoque mínimo (base)<input class="c81-input" type="number" [(ngModel)]="form.estoque_minimo" name="min" /></label>
            <label>Unidade de uso<input class="c81-input" [(ngModel)]="form.unidade_uso" name="uso" placeholder="g, ml" /></label>
            <label>Fator de conversão<input class="c81-input" type="number" [(ngModel)]="form.fator_conversao" name="fator" /></label>
            <label class="c81-col-full"><input type="checkbox" [(ngModel)]="form.lote_validade" name="lote" /> Controla lote/validade</label>
            <div class="c81-col-full c81-flex-gap-3" style="margin-top: var(--space-2); border-top: 1px solid var(--border-subtle); padding-top: var(--space-4);">
              <c81-button type="submit" variant="primary" data-test="f-salvar">Salvar</c81-button>
              <c81-button type="button" variant="ghost" (click)="fecharForm()">Cancelar</c81-button>
            </div>
          </form>
        </c81-card>
      </div>
    }
```

- [ ] **Step 2: Executar testes unitários do Portal**

Executar: `npx nx test portal`  
Esperado: PASS para todos os testes do portal.

- [ ] **Step 3: Commit do Modal**

```bash
git add apps/portal/src/app/estoque/estoque.component.ts
git commit -m "feat(estoque): renderiza formulario de cadastro e edicao como modal flutuante"
```
