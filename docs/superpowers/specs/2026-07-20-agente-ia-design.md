# Design Spec: Agente de IA (SDK OpenAI + WAHA Integration)

**Data**: 2026-07-20  
**Status**: Aprovado pelo usuário  

---

## 1. Visão Geral
Adicionar o módulo **Agente de IA** ao Skeevo. O agente processará automaticamente as mensagens recebidas via WhatsApp (WAHA), consultará as últimas conversas do lead e gerará respostas inteligentes usando a API da OpenAI. As regras e comportamentos do agente serão configuradas através de um System Prompt estruturado em blocos XML (`<identidade>`, `<instrucoes>`, `<exemplos>`, `<contexto>`), com interface inspirada no arquivo `08 - Prompt inicial editável.html`.

---

## 2. Modelo de Dados (PostgreSQL)

### Tabela `agent_settings`
Criação do modelo `AgentSettings` para persistir as configurações globais do agente de IA:

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Chave primária (Registro único `id=1`) |
| `is_enabled` | `BOOLEAN` | Ativa/Desativa o atendimento automático da IA |
| `openai_api_key` | `TEXT` | Chave da API OpenAI (salva criptografada/segura) |
| `model` | `VARCHAR(50)` | Modelo OpenAI selecionado (ex: `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`) |
| `agent_name` | `VARCHAR(255)` | Nome do assistente (ex: "Skeevo Bot") |
| `business_name` | `VARCHAR(255)` | Nome da empresa |
| `identidade` | `TEXT` | Texto para o bloco `<identidade>` |
| `instrucoes` | `TEXT` | Texto para o bloco `<instrucoes>` |
| `contexto` | `TEXT` | Texto para o bloco `<contexto>` |
| `exemplos` | `JSONB` | Lista de pares `[{"lead": "...", "reply": "..."}]` |
| `max_history_messages` | `INTEGER` | Quantidade de mensagens passadas enviadas como contexto (padrão: 15) |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Data/hora da última atualização |

---

## 3. Backend (FastAPI + OpenAI + WAHA)

### 3.1 Schemas e Endpoints (`app/routes/agent.py`)
- `GET /api/agent/settings`: Retorna a configuração atual. Se a chave OpenAI existir, ela é retornada mascarada (ex: `sk-proj-...a8F9`).
- `POST /api/agent/settings`: Atualiza a configuração. Se o campo `openai_api_key` for enviado como texto mascarado ou vazio, a chave anterior é preservada no banco.

### 3.2 Montagem do System Prompt XML
Função utilitária que renderiza o prompt estruturado:
```markdown
# Diretrizes do Agente

Agente: {agent_name}
Empresa: {business_name}

<identidade>
{identidade}
</identidade>

<instrucoes>
{instrucoes}
</instrucoes>

<exemplos>
Exemplo 1:
Lead: {exemplo_1_lead}
{agent_name}: {exemplo_1_reply}
</exemplos>

<contexto>
{contexto}
</contexto>
```

### 3.3 Fluxo do Webhook WAHA (`webhook.py` + `agent_service.py`)
Quando o WAHA envia um evento de mensagem recebida (`event == "message"` e `fromMe == False`):
1. O backend salva a mensagem recebida no PostgreSQL (`leads` e `messages`).
2. O backend consulta `agent_settings`. Se `is_enabled == False` ou `openai_api_key` estiver vazia, o fluxo encerra sem responder.
3. Se o agente estiver ativo:
   - Busca as últimas N mensagens do `lead_id` ordenadas cronologicamente.
   - Formata as mensagens passadas no formato `messages` da OpenAI (`role: "user"` ou `role: "assistant"`).
   - Instancia o `AsyncOpenAI(api_key=...)`.
   - Chama `client.chat.completions.create(model=..., messages=[system_message, *history_messages])`.
   - Salva a resposta gerada no banco de dados (`messages` com `from_me=True`).
   - Dispara a mensagem via WAHA para o telefone do lead através de `POST /api/sendText`.

---

## 4. Frontend (Next.js + Shadcn UI + Tailwind)

### 4.1 Navegação (`AppSidebar.tsx`)
- Adição do item **"Agente de IA"** (`href: "/agent"`, Ícone: `Bot` ou `Sparkles`).

### 4.2 Tela do Agente de IA (`src/app/agent/page.tsx`)
- **Header da Página**: Título "Agente de IA", Badges de Status ("Ativo"/"Inativo", "Chave Configurada"), Botão de Salvar Alterações.
- **Card Chave de API OpenAI**:
  - Input tipo `password` com suporte a ocultar/revelar.
  - Indicador visual (ícone de cadeado e status de configuração).
  - A chave anterior nunca é exibida em texto claro após salva.
- **Card Configuração Principal**:
  - Switch Toggle: Ativar/Desativar Atendimento por IA.
  - Select: Seleção do Modelo OpenAI (`gpt-4o-mini` por padrão, `gpt-4o`, `gpt-3.5-turbo`).
- **Editor de Prompt XML (2 Colunas)**:
  - **Coluna da Esquerda (Formulário)**:
    - Inputs: Nome do Agente, Nome da Empresa.
    - Textareas: Identidade, Instruções e Contexto.
    - Gerenciador Dinâmico de Exemplos: Adicionar/Remover exemplos com campos para "Mensagem do Lead" e "Resposta do Agente".
  - **Coluna da Direita (Preview em Tempo Real)**:
    - Visualizador de código estilizado mostrando exatamente como o System Prompt em XML é renderizado.
    - Botão "Copiar Prompt XML".

---

## 5. Plano de Verificação

### Testes Automatizados e de Integração
1. **Modelos e Schemas**: Verificar se a tabela `agent_settings` é criada e atualizada corretamente no PostgreSQL via SQLAlchemy.
2. **Endpoints de API**: Testar `GET` e `POST /api/agent/settings` garantindo o mascaramento da chave de API.
3. **Serviço de IA**: Executar teste unitário/integração do formatador de XML e chamada OpenAI.
4. **Build do Frontend**: Executar `npm run build` na pasta `frontend` para garantir compilação sem erros de TypeScript ou Lint.

### Teste Manual
1. Acessar `http://localhost:3000/agent` (ou via app Next.js em `:3001` / `:3000`).
2. Configurar a chave OpenAI, os blocos do prompt XML e ativar o robô.
3. Atualizar a página para verificar se a chave permanece mascarada e as configurações salvas.
4. Simular/enviar uma mensagem via WAHA no WhatsApp e verificar se o robô responde automaticamente mantendo o histórico de conversas.
