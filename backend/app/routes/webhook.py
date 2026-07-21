import base64
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import AgentSettings
from app.routes.followup import cancel_lead_followups, schedule_lead_followups
from app.services.agent_service import process_incoming_lead_message
from app.services.audio_service import (
    download_waha_media,
    format_audio_transcript,
    transcribe_audio_bytes,
)
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
    media_url = msg.get("mediaUrl") or msg.get("_data", {}).get("mediaUrl") or msg.get("media", {}).get("url") or ""
    mimetype = msg.get("mimetype") or msg.get("_data", {}).get("mimetype") or ""

    ignored_types = {"e2e_notification", "notification_template", "protocol", "ciphertext", "gp2", "revoked"}
    if msg_type in ignored_types:
        return {"status": "ignored"}

    image_b64 = None

    if has_media or media_url or mimetype:
        if mimetype.startswith("audio/") or msg_type in ["audio", "ptt", "voice"]:
            if media_url:
                audio_bytes = await download_waha_media(media_url)
                stmt = select(AgentSettings).where(AgentSettings.id == 1)
                result = await db.execute(stmt)
                agent_settings = result.scalar_one_or_none()
                api_key = agent_settings.openai_api_key if agent_settings else None
                if api_key:
                    transcript = await transcribe_audio_bytes(audio_bytes, api_key)
                    body = format_audio_transcript(transcript)
        elif mimetype.startswith("image/") or msg_type == "image":
            if media_url:
                img_bytes = await download_waha_media(media_url)
                b64_str = base64.b64encode(img_bytes).decode("utf-8")
                image_b64 = f"data:{mimetype or 'image/jpeg'};base64,{b64_str}"
            if not body:
                body = "[📷 Imagem enviada]"

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

    await process_incoming_lead_message(
        db=db,
        lead_id=lead.id,
        chat_id=msg.get("from", ""),
        image_b64=image_b64
    )

    return {"status": "ok"}
