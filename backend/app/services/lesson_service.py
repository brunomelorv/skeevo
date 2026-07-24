import json
import logging

from openai import AsyncOpenAI
from sqlalchemy import select

from app.database import async_session
from app.models import Lead, Message, AgentLesson, AgentSettings

logger = logging.getLogger(__name__)

LESSON_EXTRACTION_PROMPT = """Você analisa uma conversa de vendas encerrada e extrai lições curtas e reutilizáveis pra melhorar conversas futuras com OUTROS leads.
Responda em JSON: {"licoes": ["lição 1", "lição 2"]}
Cada lição: no máximo 20 palavras, genérica (nunca cite nome, telefone ou detalhe específico demais desse lead), focada no que funcionou ou não na condução da conversa. Se não houver nada de útil pra generalizar, responda {"licoes": []}."""


async def analyze_lead_outcome(lead_id: int, outcome: str):
    # Sessão própria — não reaproveita a sessão da request, que já pode estar fechada
    # quando essa background task rodar.
    async with async_session() as db:
        agent_settings = await db.get(AgentSettings, 1)
        if not agent_settings or not agent_settings.openai_api_key:
            return

        lead = await db.get(Lead, lead_id)
        if not lead:
            return

        msg_result = await db.execute(
            select(Message).where(Message.lead_id == lead_id).order_by(Message.id.asc())
        )
        messages = msg_result.scalars().all()
        if not messages:
            return

        transcript = "\n".join(
            f"{'Agente' if m.from_me else 'Lead'}: {m.body}" for m in messages if m.body
        )
        memory_facts = "\n".join(f"- {f.get('fact', '')}" for f in (lead.memory or []))

        client = AsyncOpenAI(api_key=agent_settings.openai_api_key)
        try:
            response = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": LESSON_EXTRACTION_PROMPT},
                    {
                        "role": "user",
                        "content": f"Resultado: {outcome}\n\nFatos conhecidos sobre o lead:\n{memory_facts}\n\nConversa:\n{transcript}",
                    },
                ],
                response_format={"type": "json_object"},
            )
            data = json.loads(response.choices[0].message.content or "{}")
            licoes = data.get("licoes", [])
        except Exception as e:
            logger.warning(f"Falha ao extrair lições do lead {lead_id}: {e}")
            return

        for licao in licoes:
            texto = (licao or "").strip()
            if texto:
                db.add(AgentLesson(lead_id=lead_id, outcome=outcome, lesson=texto))
        await db.commit()
