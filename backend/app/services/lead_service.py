import logging
import httpx
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timezone

from app.config import settings
from app.models import Lead, Message

logger = logging.getLogger(__name__)


async def fetch_waha_profile_picture(phone: str) -> str | None:
    if not phone:
        return None
    waha_url = settings.WAHA_API_URL.rstrip('/')
    headers = {
        "X-Api-Key": settings.WAHA_API_KEY,
        "Content-Type": "application/json",
    }

    clean_phone = phone.split('@')[0]
    candidate_ids = [f"{clean_phone}@c.us", phone]

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            for cid in candidate_ids:
                res = await client.get(
                    f"{waha_url}/api/contacts/profile-picture",
                    params={"contactId": cid, "session": "default"},
                    headers=headers
                )
                if res.status_code == 200:
                    data = res.json()
                    url = data.get("profilePictureURL") or data.get("profilePictureUrl") or data.get("url") or data.get("picture")
                    if url:
                        return url

            res = await client.get(
                f"{waha_url}/api/contacts/all",
                params={"session": "default"},
                headers=headers
            )
            if res.status_code != 200:
                res = await client.get(
                    f"{waha_url}/api/contacts",
                    params={"session": "default"},
                    headers=headers
                )
            if res.status_code == 200:
                contacts = res.json()
                if isinstance(contacts, list):
                    for c in contacts:
                        c_id = c.get("id")
                        c_num = c.get("number")
                        if c_num == clean_phone or c_id == phone or (isinstance(c_id, str) and c_id.startswith(clean_phone)):
                            target_id = c_id if isinstance(c_id, str) else f"{c_num}@c.us"
                            pic_res = await client.get(
                                f"{waha_url}/api/contacts/profile-picture",
                                params={"contactId": target_id, "session": "default"},
                                headers=headers
                            )
                            if pic_res.status_code == 200:
                                data = pic_res.json()
                                url = data.get("profilePictureURL") or data.get("profilePictureUrl") or data.get("url") or data.get("picture")
                                if url:
                                    return url
    except Exception as e:
        logger.warning(f"Failed to fetch WAHA profile picture for {phone}: {e}")
    return None


async def resolve_real_phone(phone: str) -> str:
    if not phone:
        return phone
    clean = phone.replace("@lid", "").replace("@c.us", "").replace("@s.whatsapp.net", "")
    if not phone.endswith("@lid") and phone.startswith("55") and len(clean) <= 13:
        return clean

    waha_url = settings.WAHA_API_URL.rstrip('/')
    headers = {"X-Api-Key": settings.WAHA_API_KEY}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.get(
                f"{waha_url}/api/contacts/all",
                params={"session": "default"},
                headers=headers
            )
            if res.status_code != 200:
                res = await client.get(
                    f"{waha_url}/api/contacts",
                    params={"session": "default"},
                    headers=headers
                )
            if res.status_code == 200:
                contacts = res.json()
                for c in contacts:
                    c_id = c.get("id", "")
                    c_num = c.get("number", "")
                    if isinstance(c_id, str) and c_id.endswith("@c.us"):
                        real_num = c_id.replace("@c.us", "")
                        if c_num == clean or c_id.startswith(clean):
                            return real_num
    except Exception as e:
        logger.warning(f"Error resolving real phone for {phone}: {e}")
    return clean


async def upsert_lead(
    db: AsyncSession,
    phone: str,
    body: str,
    message_id: str,
    chat_id: str,
    timestamp: int,
    push_name: str = None
):
    phone = await resolve_real_phone(phone)

    if message_id:
        existing_msg_res = await db.execute(select(Message).where(Message.message_id == message_id))
        existing_msg = existing_msg_res.scalar_one_or_none()
        if existing_msg:
            lead_res = await db.execute(select(Lead).where(Lead.phone == phone))
            lead = lead_res.scalar_one_or_none()
            return lead, False

    result = await db.execute(select(Lead).where(Lead.phone == phone))
    lead = result.scalar_one_or_none()

    dt = datetime.fromtimestamp(timestamp, tz=timezone.utc) if timestamp else datetime.now(timezone.utc)

    is_new_lead = False
    if lead is None:
        is_new_lead = True
        profile_pic = await fetch_waha_profile_picture(phone)
        lead = Lead(
            phone=phone,
            push_name=push_name,
            profile_picture_url=profile_pic,
            first_message=body,
            first_message_at=dt,
            last_message_at=dt
        )
        db.add(lead)
        await db.flush()
    else:
        if push_name and not lead.push_name:
            lead.push_name = push_name
        if not lead.profile_picture_url:
            profile_pic = await fetch_waha_profile_picture(phone)
            if profile_pic:
                lead.profile_picture_url = profile_pic
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

    lead._is_new_lead = is_new_lead
    return lead, True

