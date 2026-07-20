from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.agent_service import process_incoming_lead_message
from app.services.lead_service import upsert_lead

router = APIRouter()


@router.post("/webhook/waha")
async def webhook_waha(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.json()

    event = payload.get("event")
    msg = payload.get("payload", {})

    if event != "message" or msg.get("fromMe", True):
        return {"status": "ignored"}

    phone = msg.get("from", "").replace("@c.us", "").replace("@s.whatsapp.net", "")

    if not phone:
        return {"status": "ignored"}

    push_name = msg.get("_data", {}).get("notifyName") or payload.get("me", {}).get("pushName")

    lead = await upsert_lead(
        db=db,
        phone=phone,
        body=msg.get("body", ""),
        message_id=msg.get("id", ""),
        chat_id=msg.get("from", ""),
        timestamp=msg.get("timestamp", 0),
        push_name=push_name
    )

    await process_incoming_lead_message(db=db, lead_id=lead.id, chat_id=msg.get("from", ""))

    return {"status": "ok"}

