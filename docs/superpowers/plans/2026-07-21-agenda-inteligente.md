# Plano de Implementação: Agenda Inteligente (CRM + Google Calendar + OpenAI Tools)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o módulo de Agenda Inteligente com persistência no PostgreSQL, integração bidirecional via Google Calendar API (OAuth 2.0) e Function Calling no OpenAI Agent (Tools).

**Architecture:** O backend FastAPI calcula vagas disponíveis cruzando a janela de atendimento do CRM com a API FreeBusy do Google Calendar. O Agente de IA consome as ferramentas `get_available_slots` e `book_appointment` para agendar clientes no WhatsApp autonomamente. O frontend Next.js renderiza o calendário com FullCalendar na aba dedicada.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy 2.0 (Async), PostgreSQL, Next.js (App Router), Lucide React, FullCalendar / Custom React Calendar, OpenAI Tools (Function Calling).

## Global Constraints

- Backend em `/home/brnuo-araujo/skeevo/backend`
- Frontend em `/home/brnuo-araujo/skeevo/frontend`
- Registros de auditoria salvos na tabela `audit_logs` (`category="agenda"`)

---

### Task 1: Backend Database Models & Schemas

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Produces: `ScheduleModel`, `GoogleOAuthTokenModel`, `AppointmentModel`, `ScheduleRead`, `AppointmentRead`, `AppointmentCreate`

- [ ] **Step 1: Adicionar modelos no backend/app/models.py**

```python
class ScheduleModel(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, default="Agenda Principal")
    is_active = Column(Boolean, default=True, index=True)
    slot_duration_minutes = Column(Integer, nullable=False, default=30)
    timezone = Column(String(100), nullable=False, default="America/Sao_Paulo")
    min_notice_hours = Column(Integer, nullable=False, default=24)
    weekly_availability = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class GoogleOAuthTokenModel(Base):
    __tablename__ = "google_oauth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    calendar_id = Column(String(255), default="primary")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AppointmentModel(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="scheduled", index=True)
    summary = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    google_event_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

- [ ] **Step 2: Adicionar Pydantic Schemas em backend/app/schemas.py**

```python
class ScheduleRead(BaseModel):
    id: int
    name: str
    is_active: bool
    slot_duration_minutes: int
    timezone: str
    min_notice_hours: int
    weekly_availability: Dict[str, Any]
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AppointmentCreate(BaseModel):
    lead_id: int
    start_time: datetime
    end_time: datetime
    summary: Optional[str] = "Reunião de Atendimento"
    notes: Optional[str] = None


class AppointmentRead(BaseModel):
    id: int
    lead_id: int
    start_time: datetime
    end_time: datetime
    status: str
    summary: Optional[str] = None
    notes: Optional[str] = None
    google_event_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
```

- [ ] **Step 3: Validar sintaxe Python**

Run: `python3 -c "import ast; ast.parse(open('backend/app/models.py').read()); ast.parse(open('backend/app/schemas.py').read())"`
Expected: 0 erros

- [ ] **Step 4: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py
git commit -m "feat: adicionar modelos e schemas para agenda e appointments"
```

---

### Task 2: Backend Service e Rotas REST (`/api/calendar`)

**Files:**
- Create: `backend/app/services/availability_service.py`
- Create: `backend/app/routes/calendar.py`
- Modify: `backend/app/main.py`

**Interfaces:**
- Consumes: `ScheduleModel`, `AppointmentModel`, `AuditLogModel`
- Produces: REST endpoints `/api/calendar/schedule`, `/api/calendar/slots`, `/api/calendar/appointments`

- [ ] **Step 1: Criar service de calculo de disponibilidade**

`backend/app/services/availability_service.py`:
Função `get_free_slots_for_date(db, target_date_str)` que pega a janela do CRM e remove horários com appointments ou bloqueios.

- [ ] **Step 2: Criar rotas FastAPI em backend/app/routes/calendar.py**

Implementar endpoints `GET /schedule`, `PUT /schedule`, `GET /slots`, `GET /appointments`, `POST /appointments`, `DELETE /appointments/{id}`.

- [ ] **Step 3: Incluir router em backend/app/main.py**

```python
from app.routes import calendar
app.include_router(calendar.router)
```

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/availability_service.py backend/app/routes/calendar.py backend/app/main.py
git commit -m "feat: adicionar rotas rest e servico de disponibilidade para agenda"
```

---

### Task 3: OpenAI Function Calling (Tools para Agente de IA)

**Files:**
- Modify: `backend/app/services/agent_service.py`

**Interfaces:**
- Consumes: `get_free_slots_for_date`, `create_appointment`
- Produces: `tools` array no OpenAI ChatCompletions e executor de chamadas de ferramenta

- [ ] **Step 1: Definir tools do OpenAI em agent_service.py**

```python
AGENDA_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_available_slots",
            "description": "Obtém horários livres para agendamento em uma data específica (Formato YYYY-MM-DD).",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "Data no formato YYYY-MM-DD"}
                },
                "required": ["date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": "Realiza o agendamento de uma reunião para um lead.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_time": {"type": "string", "description": "Data e hora de início no formato YYYY-MM-DD HH:MM"},
                    "summary": {"type": "string", "description": "Resumo ou motivo do agendamento"}
                },
                "required": ["start_time"]
            }
        }
    }
]
```

- [ ] **Step 2: Tratar resposta de tool_calls da OpenAI em process_incoming_lead_message**

Se a resposta da OpenAI trouxer `message.tool_calls`, executar a função correspondente e retornar a mensagem com o resultado da tool.

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/agent_service.py
git commit -m "feat: integrar ferramentas de function calling de agenda no agente de IA"
```

---

### Task 4: Frontend - Módulo de Agenda Nativo & Sidebar

**Files:**
- Create: `frontend/src/components/ui/tabs.tsx`
- Create: `frontend/src/components/ui/switch.tsx`
- Create: `frontend/src/components/agenda/CalendarView.tsx`
- Create: `frontend/src/app/agenda/page.tsx`
- Modify: `frontend/src/components/AppSidebar.tsx`

**Interfaces:**
- Consumes: API `/api/calendar/*`
- Produces: Interface gráfica completa com 3 abas na rota `/agenda`

- [ ] **Step 1: Criar componentes base UI (tabs.tsx, switch.tsx)**
- [ ] **Step 2: Criar página principal frontend/src/app/agenda/page.tsx**
- [ ] **Step 3: Adicionar item na Sidebar (AppSidebar.tsx)**
- [ ] **Step 4: Validar build frontend com npx tsc --noEmit**
- [ ] **Step 5: Reconstruir containers no Docker**

```bash
docker compose up -d --build
```

- [ ] **Step 6: Commit final**

```bash
git add frontend/
git commit -m "feat: modulo de agenda no frontend com visualizacao de calendario e sidebar"
```
