# Design Spec: Movimentação Automática no Kanban pela IA via Function Tool

## Visão Geral
Esta especificação define o mecanismo pelo qual o agente de IA do Skeevo move leads entre as colunas do Kanban em tempo real via Function Calling (`move_lead_kanban`), orientado por objetivos configurados por coluna no frontend.

## Arquitetura & Fluxo de Dados

1. **Configuração dos Objetivos de Coluna**:
   - Cada coluna do Kanban (`KanbanColumnModel`) possui o campo `goal_description`.
   - O usuário edita o objetivo de cada etapa no modal `KanbanColumnsEditor` do frontend.

2. **Injeção de Contexto no Prompt**:
   - O `agent_service.py` busca as colunas ativas e repassa para `build_system_prompt`.
   - `prompt_builder.py` renderiza a seção XML `<etapas_kanban>` com cada slug, label e objetivo.

3. **Invocação da Ferramenta `move_lead_kanban`**:
   - Registrada em `AGENDA_TOOLS`.
   - Recebe `target_slug` e `reason`.
   - Quando executada em `agent_service.py`:
     - Atualiza `lead.status`.
     - Grava Log de Auditoria (`category="lead_movement"`, `action="ai_status_changed"`).
     - Avalia réguas de follow-up (cancela ou agenda).
     - Se a coluna de destino tiver `outcome_signal` (`"positivo"` ou `"negativo"`), dispara `analyze_lead_outcome` em background.

---

## Modificações Detalhadas

### Backend
- **`app/models.py`**: Adicionar `goal_description = Column(Text, nullable=True)` em `KanbanColumnModel`.
- **`app/main.py`**: `ALTER TABLE kanban_columns ADD COLUMN IF NOT EXISTS goal_description TEXT;` no `lifespan`.
- **`app/schemas.py`**: `KanbanColumnBase` e `KanbanColumnUpdate` ganham `goal_description: Optional[str] = None`.
- **`app/routes/kanban.py`**: `update_kanban_column` trata `data.goal_description`.
- **`app/services/prompt_builder.py`**: Suporte ao bloco `<etapas_kanban>`.
- **`app/services/agent_service.py`**:
  - `AGENDA_TOOLS` com `move_lead_kanban`.
  - Busca de colunas e repasse ao prompt builder.
  - Execução de `move_lead_kanban` com atualizações, audit log, follow-up e disparo de aprendizado cross-lead.

### Frontend
- **`useKanbanColumns.ts`**: Mapeamento do campo `goal_description` e função `updateGoalDescription`.
- **`KanbanColumnsEditor.tsx`**: Input/Textarea de objetivo para a IA em cada coluna.
- **`page.tsx`**: Repasse da prop de atualização de objetivo.
