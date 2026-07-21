import asyncio
import logging
import re
import httpx
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import AgentSettings, Message
from app.services.prompt_builder import build_system_prompt

logger = logging.getLogger(__name__)


async def send_waha_message(chat_id: str, text: str):
    url = f"{settings.WAHA_API_URL}/api/sendText"
    headers = {
        "X-Api-Key": settings.WAHA_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "session": "default",
        "chatId": chat_id,
        "text": text,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(url, json=payload, headers=headers)
        return response


async def send_waha_presence(chat_id: str, presence: str = "composing"):
    waha_url = settings.WAHA_API_URL.rstrip('/')
    headers = {
        "X-Api-Key": settings.WAHA_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "session": "default",
        "chatId": chat_id,
        "presence": presence,
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(f"{waha_url}/api/presence", json=payload, headers=headers)
            return response
    except Exception as e:
        logger.warning(f"Failed to send WAHA presence: {e}")
        return None


def split_text_into_chunks(text: str) -> list[str]:
    if not text or not text.strip():
        return []

    parts = [p.strip() for p in re.split(r'\n\n|\[PAUSA\]', text) if p.strip()]
    if not parts:
        return []

    merged = []
    for part in parts:
        if not merged:
            merged.append(part)
        else:
            if len(merged[-1]) < 10 or len(part) < 10:
                merged[-1] = f"{merged[-1]} {part}"
            else:
                merged.append(part)

    return merged


def calculate_typing_delay(chunk: str, min_delay: int = 3, max_delay: int = 8) -> float:
    min_d = float(min_delay if min_delay is not None else 3)
    max_d = float(max_delay if max_delay is not None else 8)

    calculated = len(chunk) * 0.04
    delay = max(calculated, min_d)
    delay = min(delay, max_d)
    return delay


def build_openai_messages_payload(
    system_prompt: str,
    history_messages: list,
    current_image_b64: str = None,
) -> list:
    ai_messages = [{"role": "system", "content": system_prompt}]
    for idx, msg in enumerate(history_messages):
        is_from_me = getattr(msg, "from_me", False) if not isinstance(msg, dict) else msg.get("from_me", False)
        body = getattr(msg, "body", "") if not isinstance(msg, dict) else msg.get("body", "")
        role = "assistant" if is_from_me else "user"

        if idx == len(history_messages) - 1 and current_image_b64 and role == "user":
            content = [
                {"type": "text", "text": body or ""},
                {"type": "image_url", "image_url": {"url": current_image_b64}},
            ]
        else:
            content = body or ""

        ai_messages.append({"role": role, "content": content})
    return ai_messages


async def process_incoming_lead_message(
    db: AsyncSession, lead_id: int, chat_id: str, image_b64: str = None
) -> bool:
    stmt = select(AgentSettings).where(AgentSettings.id == 1)
    result = await db.execute(stmt)
    agent_settings = result.scalar_one_or_none()

    if not agent_settings or not agent_settings.is_enabled or not agent_settings.openai_api_key or not agent_settings.openai_api_key.strip():
        return False

    max_history = agent_settings.max_history_messages or 15
    msg_stmt = (
        select(Message)
        .where(Message.lead_id == lead_id)
        .order_by(Message.id.desc())
        .limit(max_history)
    )
    msg_result = await db.execute(msg_stmt)
    messages = list(reversed(msg_result.scalars().all()))

    system_prompt = build_system_prompt(agent_settings)
    ai_messages = build_openai_messages_payload(
        system_prompt=system_prompt,
        history_messages=messages,
        current_image_b64=image_b64,
    )

    client = AsyncOpenAI(api_key=agent_settings.openai_api_key)
    response = await client.chat.completions.create(
        model=agent_settings.model or "gpt-4o-mini",
        messages=ai_messages,
    )

    reply_text = response.choices[0].message.content or ""

    if agent_settings.split_long_messages:
        chunks = split_text_into_chunks(reply_text)
    else:
        chunks = [reply_text] if reply_text else []

    min_delay = agent_settings.min_typing_delay if agent_settings.min_typing_delay is not None else 3
    max_delay = agent_settings.max_typing_delay if agent_settings.max_typing_delay is not None else 8

    for chunk in chunks:
        if not chunk:
            continue
        if agent_settings.simulate_typing:
            await send_waha_presence(chat_id, "composing")

        delay = calculate_typing_delay(chunk, min_delay, max_delay)
        await asyncio.sleep(delay)
        await send_waha_message(chat_id, chunk)

        assistant_msg = Message(
            lead_id=lead_id,
            chat_id=chat_id,
            body=chunk,
            from_me=True,
        )
        db.add(assistant_msg)
        await db.commit()

    return True
