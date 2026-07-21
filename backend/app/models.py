from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    push_name = Column(String(255), nullable=True)
    profile_picture_url = Column(Text, nullable=True)
    first_message = Column(Text, nullable=True)
    first_message_at = Column(DateTime(timezone=True), server_default=func.now())
    last_message_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    status = Column(String(50), default="novo", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    message_id = Column(String(255), nullable=True)
    body = Column(Text, nullable=True)
    from_me = Column(Boolean, default=False)
    chat_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AgentSettings(Base):
    __tablename__ = "agent_settings"

    id = Column(Integer, primary_key=True, index=True, default=1)
    is_enabled = Column(Boolean, default=False)
    openai_api_key = Column(Text, nullable=True, default="")
    model = Column(String(50), default="gpt-4o-mini")
    agent_name = Column(String(255), default="Assistente")
    business_name = Column(String(255), default="Empresa")
    identidade = Column(Text, default="")
    instrucoes = Column(Text, default="")
    contexto = Column(Text, default="")
    exemplos = Column(JSON, default=list)
    max_history_messages = Column(Integer, default=15)
    simulate_typing = Column(Boolean, default=True)
    split_long_messages = Column(Boolean, default=True)
    min_typing_delay = Column(Integer, default=3)
    max_typing_delay = Column(Integer, default=8)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class FollowupConfig(Base):
    __tablename__ = "followup_configs"

    id = Column(Integer, primary_key=True, index=True, default=1)
    is_enabled = Column(Boolean, default=False)
    target_statuses = Column(JSON, default=lambda: ["novo", "em_atendimento"])
    window_start = Column(String(5), default="08:00")
    window_end = Column(String(5), default="20:00")
    min_interval_minutes = Column(Integer, default=4)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())


class FollowupStep(Base):
    __tablename__ = "followup_steps"

    id = Column(Integer, primary_key=True, index=True)
    step_number = Column(Integer, nullable=False)
    delay_hours = Column(Integer, nullable=False)
    mode = Column(String(20), default="text")
    content = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LeadFollowup(Base):
    __tablename__ = "lead_followups"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    step_id = Column(Integer, ForeignKey("followup_steps.id"), nullable=True, index=True)
    step_number = Column(Integer, nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(20), default="scheduled")
    sent_at = Column(DateTime(timezone=True), nullable=True)
    cancel_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class KanbanColumnModel(Base):
    __tablename__ = "kanban_columns"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(50), unique=True, nullable=False, index=True)
    label = Column(String(255), nullable=False)
    color = Column(String(50), nullable=False, default="bg-chart-1")
    badge_class = Column(String(255), nullable=False, default="")
    position = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class AuditLogModel(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False, index=True)  # "kanban", "lead_movement", "followup", "agent"
    action = Column(String(50), nullable=False, index=True)    # "lead_status_changed", etc.
    entity_type = Column(String(50), nullable=True)             # "lead", "column", "followup_config"
    entity_id = Column(String(100), nullable=True)
    title = Column(String(255), nullable=False)
    details = Column(JSON, nullable=True)                       # Diffs e metadados da alteração
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class ScheduleModel(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), default="Agenda Principal")
    is_active = Column(Boolean, default=True)
    slot_duration_minutes = Column(Integer, default=30)
    timezone = Column(String(50), default="America/Sao_Paulo")
    min_notice_hours = Column(Integer, default=24)
    weekly_availability = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class GoogleOAuthTokenModel(Base):
    __tablename__ = "google_oauth_tokens"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), nullable=False)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    calendar_id = Column(String(255), default="primary")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AppointmentModel(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    status = Column(String(50), default="scheduled")
    summary = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    google_event_id = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
