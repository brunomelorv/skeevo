from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.models import Lead, Message


async def upsert_lead(
    db: AsyncSession,
    phone: str,
    body: str,
    message_id: str,
    chat_id: str,
    timestamp: int,
    push_name: str = None
):
    result = await db.execute(select(Lead).where(Lead.phone == phone))
    lead = result.scalar_one_or_none()

    dt = datetime.fromtimestamp(timestamp, tz=timezone.utc) if timestamp else datetime.now(timezone.utc)

    if lead is None:
        lead = Lead(
            phone=phone,
            push_name=push_name,
            first_message=body,
            first_message_at=dt,
            last_message_at=dt
        )
        db.add(lead)
        await db.flush()
    else:
        if push_name and not lead.push_name:
            lead.push_name = push_name
        lead.last_message_at = dt
        lead.updated_at = func.now()

    msg = Message(
        lead_id=lead.id,
        message_id=message_id,
        body=body,
        from_me=False,
        chat_id=chat_id
    )
    db.add(msg)
    await db.commit()

    return lead
