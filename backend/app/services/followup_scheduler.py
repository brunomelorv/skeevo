import asyncio
import logging
from datetime import datetime, timezone
from openai import AsyncOpenAI
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models import FollowupConfig, FollowupStep, LeadFollowup, Lead, Message, AgentSettings
from app.services.agent_service import send_waha_message
from app.services.prompt_builder import build_system_prompt

logger = logging.getLogger(__name__)


async def process_due_followups(db: AsyncSession):
    config_res = await db.execute(select(FollowupConfig).where(FollowupConfig.id == 1))
    config = config_res.scalar_one_or_none()

    target_statuses = config.target_statuses if (config and config.target_statuses) else ["novo", "em_atendimento"]

    now = datetime.now(timezone.utc)

    stmt = select(LeadFollowup).where(
        LeadFollowup.status == "scheduled",
        LeadFollowup.scheduled_at <= now
    )
    res = await db.execute(stmt)
    due_items = res.scalars().all()

    for item in due_items:
        lead_res = await db.execute(select(Lead).where(Lead.id == item.lead_id))
        lead = lead_res.scalar_one_or_none()

        if not lead:
            item.status = "cancelled"
            item.cancel_reason = "lead_not_found"
            await db.commit()
            continue

        if lead.status not in target_statuses:
            item.status = "cancelled"
            item.cancel_reason = f"status_changed_to_{lead.status}"
            await db.commit()
            continue

        if item.created_at:
            reply_stmt = select(Message).where(
                Message.lead_id == lead.id,
                Message.from_me == False,
                Message.created_at >= item.created_at
            )
            reply_res = await db.execute(reply_stmt)
            if reply_res.scalars().first():
                item.status = "cancelled"
                item.cancel_reason = "lead_replied"
                await db.commit()
                continue

        step = None
        if item.step_id:
            step_res = await db.execute(select(FollowupStep).where(FollowupStep.id == item.step_id))
            step = step_res.scalar_one_or_none()

        mode = step.mode if (step and step.mode) else "text"

        if mode == "ai":
            agent_res = await db.execute(select(AgentSettings).where(AgentSettings.id == 1))
            agent_settings = agent_res.scalar_one_or_none()

            system_prompt = build_system_prompt(agent_settings) if agent_settings else "Você é um assistente de vendas."
            if step and step.content:
                system_prompt += f"\n\nInstrução do Follow-up: {step.content}"

            max_history = (agent_settings.max_history_messages if agent_settings else 15) or 15
            msg_stmt = (
                select(Message)
                .where(Message.lead_id == lead.id)
                .order_by(Message.id.desc())
                .limit(max_history)
            )
            msg_result = await db.execute(msg_stmt)
            history_messages = list(reversed(msg_result.scalars().all()))

            ai_messages = [{"role": "system", "content": system_prompt}]
            for m in history_messages:
                role = "assistant" if m.from_me else "user"
                ai_messages.append({"role": role, "content": m.body or ""})

            api_key = agent_settings.openai_api_key if (agent_settings and agent_settings.openai_api_key) else ""
            client = AsyncOpenAI(api_key=api_key)
            model_name = (agent_settings.model if agent_settings else "gpt-4o-mini") or "gpt-4o-mini"

            response = await client.chat.completions.create(
                model=model_name,
                messages=ai_messages,
            )
            message_text = response.choices[0].message.content or ""
        else:
            raw_content = step.content if (step and step.content) else ""
            lead_name = lead.name or lead.push_name or ""
            message_text = raw_content.replace("{nome}", lead_name)

        chat_id = lead.phone if "@" in lead.phone else f"{lead.phone}@c.us"

        assistant_msg = Message(
            lead_id=lead.id,
            body=message_text,
            from_me=True,
            chat_id=chat_id,
        )
        db.add(assistant_msg)

        await send_waha_message(chat_id, message_text)

        item.status = "sent"
        item.sent_at = datetime.now(timezone.utc)
        await db.commit()


async def run_followup_worker_loop():
    while True:
        try:
            async with async_session() as db:
                await process_due_followups(db)
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.exception("Error in followup worker loop: %s", e)
        await asyncio.sleep(60)
