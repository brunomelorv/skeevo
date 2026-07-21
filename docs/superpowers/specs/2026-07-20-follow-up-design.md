# Design Spec: Módulo de Follow Up Inteligente (Régua Sequencial + Seleção de Colunas do Kanban + Anti-Enfileiramento)

**Data**: 2026-07-20  
**Status**: Aprovado pelo usuário com filtro por status do Kanban  

---

## 1. Visão Geral
Implementar a aba **Follow Up** (`/follow-up`) no Skeevo para gerenciar réguas automáticas de reengajamento de leads via WhatsApp (WAHA). O sistema permitirá que o cliente configure **1 Régua Ativa** contendo até 5 etapas customizáveis (ex: Etapa 1 em 24h, Etapa 2 em 7 dias, Etapa 3 em 28 dias).

### Recursos Principais:
1. **Filtro por Colunas do Kanban (`target_statuses`)**: O usuário escolhe em quais colunas do Kanban a régua se aplica (ex: apenas `novo` ou `em_atendimento`). Leads nas colunas de `ganho` ou `perdido` não recebem follow-up!
2. **Cancelamento Automático**: Se o lead responder no WhatsApp OU se o status do lead for alterado para uma coluna não selecionada (ex: movido para `ganho` ou `perdido`), todos os agendamentos pendentes desse lead são imediatamente cancelados.
3. **Mensagens Flexíveis (Texto Fixo ou IA)**: Cada etapa pode ser configurada com mensagem de texto estática (com suporte a variáveis como `{nome}`) OU gerada dinamicamente via OpenAI com base nas últimas conversas do lead.
4. **Janela Comercial Configurável (`window_start` às `window_end`)**: Horário de envio seguro definido pelo usuário (padrão: 08:00 às 20:00).
5. **Algoritmo Matemático Anti-Enfileiramento (Staggered Scheduling)**: Evita rajadas de mensagens no mesmo segundo (ex: às 09:00 ou 18:30). Aplica espaçamento mínimo (ex: 3 a 6 minutos + variação aleatória/jitter) entre envios para leads diferentes.

---

## 2. Modelo de Dados (PostgreSQL)

### 2.1 Tabela `followup_configs` (Configuração da Régua Única)
Guarda as regras globais, colunas do Kanban permitidas e o status da régua:

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `INTEGER` | Chave primária (Registro único `id=1`) |
| `is_enabled` | `BOOLEAN` | Ativa/Desativa o envio automático de Follow Up |
| `target_statuses` | `JSON` | Lista de colunas do Kanban aplicáveis (ex: `["novo"]` ou `["novo", "em_atendimento"]`) |
| `window_start` | `VARCHAR(5)` | Horário de início permitido (ex: `"08:00"`) |
| `window_end` | `VARCHAR(5)` | Horário de término permitido (ex: `"20:00"`) |
| `min_interval_minutes` | `INTEGER` | Espaçamento mínimo entre envios para leads diferentes (padrão: 4 min) |
| `updated_at` | `TIMESTAMP WITH TIME ZONE` | Data/hora da última alteração |

### 2.2 Tabela `followup_steps` (Etapas da Régua)
Guarda os passos configurados da régua ativa:

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `SERIAL` | Chave primária |
| `step_number` | `INTEGER` | Ordem da etapa (1, 2, 3...) |
| `delay_hours` | `INTEGER` | Tempo de espera em horas após o 1º contato (ex: 24, 168 [7d], 672 [28d]) |
| `mode` | `VARCHAR(20)` | `"text"` (Texto Fixo) ou `"ai"` (Gerado por IA) |
| `content` | `TEXT` | Texto da mensagem ou Prompt customizado para a IA |
| `created_at` | `TIMESTAMP WITH TIME ZONE` | Data de criação |

### 2.3 Tabela `lead_followups` (Agendamento por Lead)
Fila individual de execuções para cada lead:

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `SERIAL` | Chave primária |
| `lead_id` | `INTEGER` | Chave estrangeira (`leads.id`) |
| `step_id` | `INTEGER` | Chave estrangeira (`followup_steps.id`) |
| `step_number` | `INTEGER` | Número da etapa |
| `scheduled_at` | `TIMESTAMP WITH TIME ZONE` | Data/hora exata calculada para disparo |
| `status` | `VARCHAR(20)` | `'scheduled'`, `'sent'`, `'cancelled'`, `'failed'` |
| `sent_at` | `TIMESTAMP WITH TIME ZONE` | Data/hora em que o envio foi concluído |
| `cancel_reason` | `VARCHAR(255)` | Motivo do cancelamento (ex: `"lead_replied"`, `"status_changed_to_ganho"`) |

---

## 3. Algoritmo Matemático de Agendamento & Anti-Enfileiramento

Quando um lead entra em um status elegível contido em `target_statuses`:

```python
def calculate_next_available_slot(target_dt, config, db):
    # 1. Ajustar se o target_dt cair fora da janela comercial (ex: 03:00 da manhã)
    # Se target_dt < window_start no dia -> ajustar para window_start desse dia
    # Se target_dt > window_end no dia -> ajustar para window_start do dia seguinte
    
    # 2. Evitar Enfileiramento (Staggering Algorithm):
    # Buscar no banco se já existe agendamento próximo
    last_scheduled = db.query(MAX(scheduled_at)).where(
        scheduled_at >= target_dt - timedelta(minutes=config.min_interval_minutes),
        status == 'scheduled'
    )
    
    if last_scheduled and last_scheduled >= target_dt:
        # Empurra o novo agendamento para frente com jitter aleatório (30s a 90s)
        jitter = random.randint(30, 90)
        target_dt = last_scheduled + timedelta(minutes=config.min_interval_minutes, seconds=jitter)

    return target_dt
```

---

## 4. Backend (FastAPI + Periodic Scheduler)

### 4.1 Endpoints da API (`app/routes/followup.py`)
- `GET /api/followup/config`: Retorna a régua ativa, colunas do Kanban permitidas, etapas e janela de horário.
- `POST /api/followup/config`: Salva as etapas, colunas permitidas e configurações da régua.
- `GET /api/followup/queue`: Retorna a lista de follow-ups agendados/enviados/cancelados com filtros e paginação.
- `POST /api/followup/queue/{id}/cancel`: Permite cancelar um agendamento manualmente.

### 4.2 Executor em Background (`app/services/followup_scheduler.py`)
Worker assíncrono que roda a cada 60 segundos no servidor:
1. Busca agendamentos com `status == 'scheduled'` e `scheduled_at <= NOW()`.
2. Para cada agendamento:
   - Verifica se o lead enviou mensagem recente (`last_message_at > created_at`) OU se o `lead.status` atual não pertence a `target_statuses`. Se sim, altera para `status = 'cancelled'`.
   - Se estiver válido:
     - Se `mode == "text"`: substitui `{nome}` por `lead.push_name or 'cliente'` e envia via WAHA (`POST /api/sendText`).
     - Se `mode == "ai"`: busca as últimas mensagens do lead no banco, chama a OpenAI para gerar texto de reengajamento e envia via WAHA.
     - Atualiza `status = 'sent'` e registra a mensagem na tabela `messages`.

---

## 5. Frontend (Next.js + Tailwind + Lucide)

### 5.1 Navegação (`AppSidebar.tsx`)
- Adição do item **"Follow Up"** (`href: "/follow-up"`, Ícone: `CalendarClock`).

### 5.2 Tela do Follow Up (`src/app/follow-up/page.tsx`)
- **Header**: Título "Follow Up", Toggle de Ativação Geral da Régua, Botão "Salvar Régua".
- **Card Configurações de Envio**:
  - **Seleção de Colunas do Kanban**: Checkboxes para escolher onde o follow-up se aplica (`Novo`, `Em Atendimento`, `Qualificado`). Colunas de `Ganho` e `Perdido` desmarcadas por padrão.
  - **Janela de Horário Comercial**: Horário Inicial e Horário Final.
  - **Espaçamento Mínimo entre Disparos**: Em minutos.
- **Construtor da Régua de Etapas**:
  - Lista de cards numerados (Etapa 1, Etapa 2, Etapa 3...).
  - Inputs por etapa: Tempo de Espera (horas/dias), Tipo (Texto Fixo vs IA Prompt), Textarea de Conteúdo.
  - Botão "+ Adicionar Etapa" e botão de exclusão.
- **Tabela de Acompanhamento (Fila em Tempo Real)**:
  - Tabela listando: Nome do Lead, Telefone, Coluna Kanban, Etapa, Data/Hora Agendada, Status (`Agendado`, `Enviado`, `Cancelado`).

---

## 6. Plano de Verificação

### Testes Automatizados
1. Teste do Filtro de Colunas do Kanban (`test_followup_status.py`):
   - Mover lead para `ganho` -> verificar se agendamento é cancelado automaticamente.
2. Teste do Algoritmo de Agendamento (`test_followup_calculator.py`):
   - Testar lead que entra às 03:00 AM -> verificar ajuste para horário comercial.
   - Testar 5 leads entrando juntos -> verificar espaçamento de 4 min + jitter.

### Teste Manual
1. Acessar `/follow-up`, selecionar colunas "Novo" e "Em Atendimento", criar etapas de teste e salvar.
2. Mover um lead no Kanban para "Ganho" e confirmar que o agendamento foi cancelado.
