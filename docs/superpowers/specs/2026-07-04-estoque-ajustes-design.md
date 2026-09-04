# Design Spec: Ajustes na Tela de Estoque (Alertas Expandíveis e Modal de Cadastro)

**Data:** 2026-07-04  
**Status:** Aprovado pelo Usuário  
**Autor:** Sally (UX Designer)  

---

## 📌 Contexto e Problema

Na tela de Estoque (`estoque.component.ts`), identificamos duas oportunidades de melhoria de usabilidade e interface:
1. **Duplicação de Informações do Item:** Os insumos que estão com a quantidade abaixo do mínimo ideal aparecem duas vezes na tela: uma vez no card de alerta da seção superior (`section`) e outra na tabela principal (`c81-card`). 
2. **Formulário Dentro da Tela:** O formulário de cadastro/edição de insumos abre diretamente integrado ao fluxo de scroll da tela, dividindo a atenção do usuário com a listagem.

---

## 🎨 Soluções de Design Propostas

### 1. Alertas de Estoque Mínimo Expandíveis (Accordion)
Para remover a duplicação e permitir ações rápidas, a seção de alertas superior passará a ter comportamento expansível (estilo Accordion):
* Cada linha de alerta será renderizada com um cabeçalho clicável exibindo o badge `ABAIXO DO MÍNIMO`, o nome do item, quantidade e um ícone visual de seta (chevron SVG).
* O chevron rotacionará suavemente de `0deg` para `90deg` ao expandir.
* Ao expandir a linha do alerta, o usuário verá o saldo detalhado e as ações rápidas de **Entrada**, **Perda** e **Editar** para o insumo.
* O estado de expansão de cada alerta será gerenciado reativamente por meio de um signal no Angular (`alertasExpandidos`).

### 2. Formulário de Cadastro e Edição em Modal Overlay
O formulário de cadastro de insumo passará a abrir centralizado em um modal flutuante:
* O card do formulário será envolto por um contêiner `.c81-modal-overlay` com fundo escuro semi-transparente.
* Clicar no botão "Cancelar" ou na área de fundo escurecida (overlay) fechará o formulário.
* Cliques dentro do formulário não fecharão o modal, prevenindo perda acidental de dados digitados (`$event.stopPropagation()`).
* O card do modal terá rolagem vertical e limites de altura para dispositivos móveis ou telas compactas.

---

## 📐 Especificação Técnica e Layout

### Lógica do Componente (`estoque.component.ts`)

Adição dos controles de estado:
```typescript
protected readonly alertasExpandidos = signal<Record<string, boolean>>({});

protected toggleAlerta(id: string): void {
  this.alertasExpandidos.update(map => ({
    ...map,
    [id]: !map[id]
  }));
}
```

E alteração do template conforme o design aprovado:
1. Wrap do formulário (`mostrandoForm()`) com `.c81-modal-overlay`.
2. Substituição do layout interno do laço de alertas (`abaixoDoMinimo()`) para implementar o Accordion.

---

## 🧪 Plano de Verificação

### Testes Manuais
1. **Validação do Alerta:** Adicionar ou editar um insumo para que sua quantidade atual fique abaixo do estoque mínimo.
2. **Teste de Expansão:** Clicar no card de alerta gerado, validar que a seta rotaciona e os botões de Entrada/Perda/Editar aparecem.
3. **Teste do Modal:** Clicar em "+ Cadastrar insumo", validar que o modal centraliza na tela e o fundo fica escurecido.
4. **Teste de Fechamento do Modal:** Clicar fora do card de formulário (na overlay) e validar que ele fecha.

### Testes Automatizados
* Atualizar e rodar os testes em `estoque.component.spec.ts` para garantir que o comportamento de exibição de alertas e botões continua íntegro após a refatoração do layout.
