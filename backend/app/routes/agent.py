from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models import AgentSettings
from app.schemas import AgentSettingsRead, AgentSettingsUpdate, mask_api_key
from app.services.prompt_builder import build_system_prompt

router = APIRouter(prefix="/api/agent", tags=["Agent"])


async def get_or_create_settings(db: AsyncSession) -> AgentSettings:
    result = await db.execute(select(AgentSettings).where(AgentSettings.id == 1))
    settings = result.scalars().first()
    if not settings:
        settings = AgentSettings(id=1)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("/settings", response_model=AgentSettingsRead)
async def get_agent_settings(db: AsyncSession = Depends(get_db)):
    settings = await get_or_create_settings(db)
    has_key = bool(settings.openai_api_key and settings.openai_api_key.strip())
    masked = mask_api_key(settings.openai_api_key)

    return AgentSettingsRead(
        id=settings.id,
        is_enabled=settings.is_enabled,
        model=settings.model,
        agent_name=settings.agent_name,
        business_name=settings.business_name,
        identidade=settings.identidade,
        instrucoes=settings.instrucoes,
        contexto=settings.contexto,
        exemplos=settings.exemplos or [],
        max_history_messages=settings.max_history_messages,
        has_api_key=has_key,
        openai_api_key_masked=masked,
        updated_at=settings.updated_at,
    )


@router.post("/settings", response_model=AgentSettingsRead)
async def update_agent_settings(
    data: AgentSettingsUpdate, db: AsyncSession = Depends(get_db)
):
    settings = await get_or_create_settings(db)

    settings.is_enabled = data.is_enabled
    settings.model = data.model
    settings.agent_name = data.agent_name
    settings.business_name = data.business_name
    settings.identidade = data.identidade
    settings.instrucoes = data.instrucoes
    settings.contexto = data.contexto
    settings.exemplos = [ex.model_dump() for ex in data.exemplos]
    settings.max_history_messages = data.max_history_messages

    if data.openai_api_key is not None:
        key = data.openai_api_key.strip()
        if key and not key.startswith("sk-..."):
            settings.openai_api_key = key

    await db.commit()
    await db.refresh(settings)
    return await get_agent_settings(db)


@router.get("/preview")
async def preview_prompt(db: AsyncSession = Depends(get_db)):
    settings = await get_or_create_settings(db)
    return {"prompt": build_system_prompt(settings)}
