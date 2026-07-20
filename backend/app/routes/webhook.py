from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.routes.followup import cancel_lead_followups, schedule_lead_followups
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

    push_name = (
        msg.get("_data", {}).get("notifyName")
        or msg.get("pushName")
        or msg.get("_data", {}).get("pushName")
    )

    body = (msg.get("body") or "").strip()
    msg_type = msg.get("type") or msg.get("_data", {}).get("type") or "chat"
    has_media = msg.get("hasMedia", False)

    ignored_types = {"e2e_notification", "notification_template", "protocol", "ciphertext", "gp2", "revoked"}
    if msg_type in ignored_types:
        return {"status": "ignored"}

    if not body and not has_media:
        return {"status": "ignored"}

    lead, is_new = await upsert_lead(
        db=db,
        phone=phone,
        body=body,
        message_id=msg.get("id", ""),
        chat_id=msg.get("from", ""),
        timestamp=msg.get("timestamp", 0),
        push_name=push_name
    )

    if not is_new:
        return {"status": "duplicate_ignored"}

    await cancel_lead_followups(db, lead.id, reason="lead_replied")

    if getattr(lead, "_is_new_lead", False):
        await schedule_lead_followups(db, lead)

    await process_incoming_lead_message(db=db, lead_id=lead.id, chat_id=msg.get("from", ""))

    return {"status": "ok"}


