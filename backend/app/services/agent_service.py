import httpx
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import AgentSettings, Message
from app.services.prompt_builder import build_system_prompt


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


async def process_incoming_lead_message(db: AsyncSession, lead_id: int, chat_id: str) -> bool:
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

    ai_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages:
        role = "assistant" if msg.from_me else "user"
        ai_messages.append({"role": role, "content": msg.body or ""})

    client = AsyncOpenAI(api_key=agent_settings.openai_api_key)
    response = await client.chat.completions.create(
        model=agent_settings.model or "gpt-4o-mini",
        messages=ai_messages,
    )

    reply_text = response.choices[0].message.content or ""

    assistant_msg = Message(
        lead_id=lead_id,
        chat_id=chat_id,
        body=reply_text,
        from_me=True,
    )
    db.add(assistant_msg)
    await db.commit()

    await send_waha_message(chat_id, reply_text)

    return True
