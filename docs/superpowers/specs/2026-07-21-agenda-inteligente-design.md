# Spec de Design: Módulo de Agenda Inteligente (CRM + Google Calendar + OpenAI Tools)

**Data**: 2026-07-21  
**Status**: Aprovado pelo Usuário  

---

## 1. Visão Geral do Módulo

O módulo de **Agenda Inteligente** permite que empresas gerenciem suas janelas de atendimento no CRM, sincronizem compromissos bidirecionalmente com o Google Calendar e habilitem o Agente de IA para consultar vagas e realizar agendamentos de forma autônoma durante as conversas no WhatsApp via OpenAI Function Calling (Tools).

---

## 2. Requisitos & Regras de Negócio

1. **Agenda Local Simplificada**:
   - Uma agenda principal com chave de ativação/desativação (*is_active*).
   - Janela padrão de atendimento: **09:00 às 12:00** e **14:00 às 18:00** (Segunda a Sexta livres por padrão, Sábado e Domingo fechados).
   - Duração do slot configurável (15, 30, 45 ou 60 minutos, padrão 30 min).
   - Margem de segurança / Antecedência mínima configurável (ex: 24 horas).
   - Fuso horário IANA (padrão `America/Sao_Paulo`).

2. **Integração com Google Calendar (OAuth 2.0)**:
   - Fluxo de autenticação OAuth 2.0 para conectar contas do Google Workspace / Gmail.
   - Sincronização e consulta da API `freebusy.query` do Google Calendar para bloquear horários que já possuem compromissos pessoais ou externos.
   - Criação automática de eventos no Google Calendar quando uma reunião for agendada pelo CRM ou pela IA.

3. **Interação com a LLM / Agente de IA (Function Calling)**:
   - **`get_available_slots(date)`**: Ferramenta que calcula as vagas disponíveis cruzando a janela do CRM com os bloqueios do Google Calendar.
   - **`book_appointment(lead_id, date_time, notes)`**: Ferramenta que realiza o agendamento, salva no banco de dados, insere no Google Calendar e envia confirmação no chat.

4. **Interface no CRM (Frontend)**:
   - **Aba Calendário**: Componente visual nativo (FullCalendar / React Calendar) que exibe agendamentos e reuniões com filtros por dia/semana/mês.
   - **Aba Agendas e Horários**: Painel para ativação/desativação e edição dos horários livres.
   - **Aba Integrações**: Card de conexão OAuth com o Google Calendar.

---

## 3. Modelo de Dados (PostgreSQL)

### 3.1. Tabela `schedules`
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
```

### 3.2. Tabela `google_oauth_tokens`
```python
class GoogleOAuthTokenModel(Base):
    __tablename__ = "google_oauth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    calendar_id = Column(String(255), default="primary")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 3.3. Tabela `appointments`
```python
class AppointmentModel(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="scheduled", index=True)  # scheduled, completed, cancelled
    summary = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    google_event_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
```

---

## 4. Endpoints REST da API (Backend FastAPI)

- `GET /api/calendar/schedule` - Obtém configuração da agenda local.
- `PUT /api/calendar/schedule` - Atualiza a agenda local (horários, status, slot).
- `GET /api/calendar/slots?date=YYYY-MM-DD` - Retorna horários vagos calculando janelas CRM vs Google FreeBusy.
- `GET /api/calendar/appointments` - Lista compromissos para o FullCalendar.
- `POST /api/calendar/appointments` - Cria novo agendamento.
- `DELETE /api/calendar/appointments/{id}` - Cancela um agendamento.
- `GET /api/calendar/google/auth-url` - Retorna URL de autorização OAuth 2.0 do Google.
- `GET /api/calendar/google/callback` - Callback OAuth 2.0 para salvar tokens.

---

## 5. Auditoria 360°
Todas as operações de agendamento, alteração de horários e conexão do Google gravam registros na tabela `audit_logs` com `category="agenda"`.
