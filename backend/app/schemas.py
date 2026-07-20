from pydantic import BaseModel
from typing import Optional
from datetime import datetime


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
