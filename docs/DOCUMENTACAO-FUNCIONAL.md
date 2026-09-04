# Documentação Funcional e de Produto — `cozinha81-core`

> **Objetivo deste documento:** Servir como guia funcional e de produto para a transição do sistema `cozinha81-core`. Este documento descreve detalhadamente a visão de negócio, os perfis de usuário, as regras de cada funcionalidade e o status atual de cada feature a nível de produto (o que está pronto para o usuário, o que utiliza simulações/mocks e o que ainda precisa ser construído).

---

## 1. Visão Geral do Produto

A **Cozinha81** é uma plataforma de cozinhas compartilhadas para delivery que aluga **o espaço físico juntamente com o software de gestão e operação**. O grande diferencial competitivo é o ecossistema integrado que automatiza desde o controle de estoque e custos até a expedição de pedidos no KDS e faturamento do aluguel.

O produto é composto por 3 aplicações web integradas:

1. **Portal do Inquilino (`apps/portal`):** Usado pelos restaurantes inquilinos para gerenciar insumos, estoque, fichas técnicas, produção de alimentos, acompanhar o CMV (Custo da Mercadoria Vendida) e configurar integrações.
2. **KDS - Kitchen Display System (`apps/kds`):** Painel de cozinha em tempo real (para tablets ou TVs na praça de produção) para aceitar, preparar e despachar pedidos com resiliência a quedas de internet.
3. **Backoffice (`apps/backoffice`):** Painel interno da equipe Cozinha81 para cadastrar unidades/cozinhas, controlar agendamento de slots, validar documentos sanitários/legais, registrar presenças/checklist e emitir a cobrança mensal de aluguel e consumo.

---

## 2. Perfis de Usuário e Permissões de Acesso

O sistema opera com 3 perfis principais com níveis de acesso estritamente controlados:

| Perfil de Usuário | Aplicação Acessível | Descrição e Permissões |
|---|---|---|
| **Dono / Admin do Inquilino** | Portal do Inquilino & KDS | Possui visão total do restaurante. Pode ver custos de insumos, margens de lucro, CMV, criar fichas técnicas, gerenciar colaboradores e convidar novos operadores. |
| **Operador do Inquilino** | Portal do Inquilino & KDS | Focado na operação da cozinha. **Regra de Negócio Crucial (Redação de Custos):** O sistema esconde automaticamente todos os preços de insumos, custos de fichas e porcentagens de CMV para este perfil. Pode registrar entradas de estoque, perdas, lançar produção e operar o KDS. |
| **Staff Cozinha81 (Plataforma)** | Backoffice | Equipe interna da Cozinha81. Não possui acesso aos dados operacionais privados dos inquilinos (receitas, vendas), mas gerencia a infraestrutura predial, agendas de cozinhas, contratos e billing. |

---

## 3. Mapeamento Detalhado por Épicos e Funcionalidades

### 🔴 Épico 1: Contas, Acessos e Multi-Tenancy
- **Objetivo:** Garantir isolamento absoluto entre inquilinos e permitir convite de novos usuários.
- **Funcionalidades Entregues:**
  - **Provisionamento de Inquilino:** Staff cria o inquilino no Backoffice e um token de convite é gerado para o Dono.
  - **Aceite de Convite & Senha:** O Dono acessa `/aceitar-convite?token=...` no Portal e define sua senha.
  - **Login Seguro:** Autenticação separada por perfil (Inquilino no Portal, Staff no Backoffice).
  - **Convite de Colaboradores:** Dono convida Operadores via e-mail direto do Portal.
  - **Módulos & Upsell:** Bloqueio automático de telas caso o inquilino não tenha contratado determinado módulo (ex: `gestao_cozinha` ou `pedidos_kds`).
- **Status do Épico:** 🟢 **100% Funcional** (Backend + Banco + Frontend).

---

### 🔴 Épico 2: Gestão de Estoque
- **Objetivo:** Dar controle total das matérias-primas e insumos do restaurante sem perdas ocultas.
- **Funcionalidades Entregues:**
  - **Cadastro de Insumos:** Nome, unidade de medida principal (kg, g, L, ml, un) e estoque mínimo.
  - **Entrada de Estoque:** Registro de compras informando quantidade, custo total e data. Utiliza modelo *ledger* (histórico imutável de movimentos).
  - **Registro de Perda:** Lançamento de descarte por validade, avaria ou erro de preparo (abate do estoque automaticamente).
  - **Conversão de Unidades:** Permite comprar em caixa/fardo (ex: caixa com 12 unidades) e dar entrada convertendo para a unidade de uso na receita.
  - **Alertas de Estoque Mínimo:** Destaque visual na interface para insumos que atingiram o limite crítico.
- **Status do Épico:** 🟢 **100% Funcional** (Backend + Banco + Frontend).

---

### 🔴 Épico 3: Fichas Técnicas & Custeio
- **Objetivo:** Calcular o custo exato de cada prato do cardápio em tempo real.
- **Funcionalidades Entregues:**
  - **Editor de Ficha Técnica:** Cadastro de pratos com seus respetivos insumos e quantidades.
  - **Sub-receitas:** Suporte a fichas com até 3 níveis de profundidade (ex: Molho de Tomate usado na Pizza de Calabresa), com trava automática contra ciclos infinitos.
  - **Custo On-Read (Em Tempo Real):** O valor do prato recarrega dinamicamente conforme os preços dos insumos mudam.
  - **Métodos de Custeio:** Alternância entre PEPS (Primeiro que Entra, Primeiro que Sai), UEPS e Custo Médio Ponderado.
- **Status do Épico:** 🟢 **100% Funcional** (Backend + Banco + Frontend).

---

### 🔴 Épico 4: Produção & Baixa Automática de Estoque
- **Objetivo:** Dar baixa nos insumos à medida que a cozinha produz os alimentos.
- **Funcionalidades Entregues:**
  - **Registro de Produção:** O cozinheiro informa quantas porções/unidades de uma receita produziu.
  - **Baixa Automática:** O sistema calcula os insumos consumidos pela Ficha Técnica e realiza a baixa em lote no estoque.
  - **Baixa Manual:** Opção para revisar e ajustar os insumos consumidos manualmente antes da efetivação.
- **Status do Épico:** 🟢 **100% Funcional** (Backend + Banco + Frontend).

---

### 🔴 Épico 5: CMV (Custo da Mercadoria Vendida)
- **Objetivo:** Oferecer relatórios financeiros precisos de rentabilidade da cozinha.
- **Funcionalidades Entregues:**
  - **CMV Unitário:** Exibição do custo por porção vendida.
  - **CMV em Valor (R$):** Total financeiro gasto em estoque consumido num período selecionado.
  - **CMV Percentual (%):** Relação entre o custo do estoque e o faturamento bruto das vendas.
- **Status do Épico:** 🟢 **100% Funcional** (Backend + Banco + Frontend).

---

### 🔴 Épico 6: Operação de KDS (Kitchen Display System)
- **Objetivo:** Gerenciar o fluxo da praça de produção em tempo real com tela tátil para a cozinha.
- **Funcionalidades Entregues:**
  - **Display Kanban em Tempo Real:** Visualização colunar (*Aceitar* → *Em Preparo* → *Pronto* → *Despachado*).
  - **Lançamento Manual de Pedidos:** Card na própria tela para balcão ou pedidos fora de integração.
  - **Comandos Idempotentes:** Botões de avanço de status imunes a múltiplos cliques acidentais.
  - **Resiliência Offline (IndexedDB):** Caso o Wi-Fi da cozinha caia, o KDS armazena os toques localmente no navegador e sincroniza com o servidor assim que a conexão retorna.
- **Status do Épico:** 🟢 **100% Funcional** (Backend + WebSocket + Frontend + Queue Offline).

---

### 🔴 Épico 7: Integração de Delivery (iFood / 99Food)
- **Objetivo:** Ingerir pedidos das plataformas de delivery diretamente no KDS e deduzir o CMV automaticamente.
- **Funcionalidades Entregues:**
  - **Tela de Conexão de Contas:** No Portal, o inquilino gerencia os canais integrados.
  - **Ingestão por Webhook (Inbox/Outbox):** Recebimento e fila confiável de eventos externos.
  - **Pausar/Retomar Recebimento:** Botão de emergência para suspender vendas em horários de pico.
  - **Tratamento de Cancelamentos:** Estorno de estoque em caso de pedido cancelado antes do preparo.
- **Status do Épico:** 🟡 **Funcional com Adapters Simulados / Mockados**.
  - *Nota de Transição:* Toda a infraestrutura técnica (webhooks, inbox, outbox, faturamento CMV, UI) está 100% construída. Os adaptadores do iFood e 99Food estão operando com dados simulados (`fake-delivery.adapter.ts`). Para entrar em produção real, basta substituir os mocks pelas chaves de API/OAuth oficiais das plataformas.

---

### 🔴 Épicos 8, 9 e 10: Backoffice (Gestão Predial, Presença e Billing)
- **Objetivo:** Permitir à Cozinha81 administrar as cozinhas físicas, contratos, check-ins e cobranças.
- **Funcionalidades Entregues:**
  - **Cadastro de Cozinhas (Épico 8):** Gerenciamento de unidades físicas, indicando se a cozinha é equipada ou bruta.
  - **Agenda & Reservas (Épico 8):** Alocação de horários e slots para os inquilinos.
  - **Repositório de Documentos & Alertas (Épico 8):** Controle de alvarás e licenças sanitárias com avisos de vencimento.
  - **Check-in / Check-out & Presença (Épico 9):** Registro de entrada/saída da equipe do inquilino na unidade com checklist de vistoria.
  - **Controle de Materiais e Utensílios (Épico 9):** Empréstimo e conferência de equipamentos fornecidos pela Cozinha81.
  - **Faturamento e Billing (Épico 10):** Cálculo automatizado da fatura mensal combinando Aluguel Fixo + Módulos Contratados + Horas/Consumo Extra.
- **Status dos Épicos 8, 9 e 10:** 🟡 **Funcional no Backend e Frontend, com Faturamento Financeiro Simulado**.
  - *Nota de Transição:* As telas do Backoffice (Cozinhas, Agenda, Presença, Materiais e Billing) estão implementadas no frontend Angular e conectadas ao backend. A emissão bancária da fatura (Boleto/Pix real) não possui gateway financeiro plugado (é simulada internamente).

---

## 4. Matriz Resumida de Status das Funcionalidades

| Funcionalidade / Módulo | Aplicação | Status Backend | Status Frontend | Observações / Próximos Passos |
|---|---|---|---|---|
| Autenticação & Convites | Portal / Backoffice | 🟢 Pronto | 🟢 Pronto | 100% funcional. |
| Insumos & Movimentos de Estoque | Portal | 🟢 Pronto | 🟢 Pronto | Ledger append-only completo. |
| Fichas Técnicas & Sub-receitas | Portal | 🟢 Pronto | 🟢 Pronto | Custo on-read e árvore até 3 níveis. |
| Produção & Baixa de Estoque | Portal | 🟢 Pronto | 🟢 Pronto | Suporta baixa automática e manual. |
| Relatórios de CMV | Portal | 🟢 Pronto | 🟢 Pronto | Unitário, Período e Percentual. |
| Painel KDS em Tempo Real | KDS | 🟢 Pronto | 🟢 Pronto | Socket.io + Fila Offline IndexedDB. |
| Integração Delivery (iFood / 99Food) | Portal / Backend | 🟡 Simulado | 🟢 Pronto | Backend/UI prontos; API oficial em mock. |
| Cadastro de Cozinhas e Slots | Backoffice | 🟢 Pronto | 🟢 Pronto | CRUD de unidades e agenda de slots. |
| Repositório de Docs Sanitários | Backoffice | 🟢 Pronto | 🟢 Pronto | Alertas ativos; upload de PDF binário pendente. |
| Check-in / Check-out & Utensílios | Backoffice | 🟢 Pronto | 🟢 Pronto | Registro de presença com checklist. |
| Motor de Cobrança / Billing | Backoffice | 🟢 Pronto | 🟢 Pronto | Cálculo de aluguel/extras OK; falta gateway Pix/Boleto. |

---

## 5. Roteiro Recomendado para Continuidade do Desenvolvimento

Para dar sequência ao projeto, a seguinte ordem de prioridade funcional e técnica é recomendada:

1. **Troca dos Mocks de Delivery por APIs Reais (Épico 7):**
   - Implementar a autenticação OAuth real nos arquivos `ifood.adapter.ts` e `99food.adapter.ts`.
2. **Integração com Gateway de Pagamentos (Épico 10):**
   - Conectar um SDK financeiro (ex: Asaas, Stripe ou Mercado Pago) ao `BillingService` para emissão automática de cobranças por Pix/Boleto.
3. **Upload de Binários para Cloud Storage:**
   - Adicionar suporte a upload de arquivos PDF/imagem para os documentos sanitários no Backoffice (Amazon S3 ou Google Cloud Storage).
4. **Isolamento de WebSocket por Tenant:**
   - Adicionar salas Socket.io (`client.join(tenantId)`) no `KdsGateway` do backend.
