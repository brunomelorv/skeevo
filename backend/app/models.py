from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, JSON
from sqlalchemy.sql import func

from app.database import Base


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    push_name = Column(String(255), nullable=True)
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


