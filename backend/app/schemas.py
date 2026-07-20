from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


def mask_api_key(key: Optional[str]) -> str:
    if not key or not key.strip():
        return ""
    stripped = key.strip()
    if len(stripped) <= 8:
        return "sk-..." + stripped[-4:] if len(stripped) >= 4 else "sk-..."
    return "sk-..." + stripped[-4:]


class ExamplePair(BaseModel):
    lead: str = ""
    reply: str = ""


class AgentSettingsBase(BaseModel):
    is_enabled: bool = False
    model: str = "gpt-4o-mini"
    agent_name: str = "Assistente"
    business_name: str = "Empresa"
    identidade: str = ""
    instrucoes: str = ""
    contexto: str = ""
    exemplos: List[ExamplePair] = []
    max_history_messages: int = 15
    simulate_typing: bool = True
    split_long_messages: bool = True
    min_typing_delay: int = 3
    max_typing_delay: int = 8


class AgentSettingsRead(AgentSettingsBase):
    id: int
    openai_api_key_masked: str = ""
    has_api_key: bool = False
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AgentSettingsUpdate(AgentSettingsBase):
    openai_api_key: Optional[str] = None


class LeadStatusUpdate(BaseModel):
    status: str


class LeadResponse(BaseModel):
    id: int
    phone: str
    name: Optional[str] = None
    push_name: Optional[str] = None
    first_message: Optional[str] = None
    first_message_at: Optional[datetime] = None
    last_message_at: Optional[datetime] = None
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    lead_id: int
    message_id: Optional[str] = None
    body: Optional[str] = None
    from_me: bool
    chat_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FollowupStepSchema(BaseModel):
    id: Optional[int] = None
    step_number: int
    delay_hours: int
    mode: str = "text"
    content: str = ""

    class Config:
        from_attributes = True


class FollowupConfigBase(BaseModel):
    is_enabled: bool = False
    target_statuses: List[str] = ["novo", "em_atendimento"]
    window_start: str = "08:00"
    window_end: str = "20:00"
    min_interval_minutes: int = 4
    steps: List[FollowupStepSchema] = []


class FollowupConfigRead(FollowupConfigBase):
    id: int = 1
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FollowupConfigUpdate(FollowupConfigBase):
    pass


class LeadFollowupRead(BaseModel):
    id: int
    lead_id: int
    step_id: Optional[int] = None
    step_number: int
    scheduled_at: Optional[datetime] = None
    status: str = "scheduled"
    sent_at: Optional[datetime] = None
    cancel_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    lead_name: Optional[str] = None
    lead_phone: Optional[str] = None
    lead_status: Optional[str] = None

    class Config:
        from_attributes = True


