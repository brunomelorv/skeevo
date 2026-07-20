import pytest
import pytest_asyncio
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.database import Base
from app.models import Lead, LeadFollowup, FollowupConfig, FollowupStep, AgentSettings, Message
from app.services.followup_scheduler import process_due_followups

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_db():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    TestingSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with TestingSessionLocal() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.mark.asyncio
async def test_process_due_followups_fixed_text_mode(test_db):
    config = FollowupConfig(id=1, is_enabled=True, target_statuses=["novo", "em_atendimento"])
    test_db.add(config)

    lead = Lead(phone="5511999999999", name="Carlos", status="novo")
    test_db.add(lead)
    await test_db.commit()
    await test_db.refresh(lead)

    step = FollowupStep(step_number=1, delay_hours=24, mode="text", content="Olá {nome}, como posso ajudar?")
    test_db.add(step)
    await test_db.commit()
    await test_db.refresh(step)

    past_time = datetime.now(timezone.utc) - timedelta(minutes=10)
    followup = LeadFollowup(
        lead_id=lead.id,
        step_id=step.id,
        step_number=1,
        scheduled_at=past_time,
        status="scheduled"
    )
    test_db.add(followup)
    await test_db.commit()
    await test_db.refresh(followup)

    with patch("app.services.followup_scheduler.send_waha_message", new_callable=AsyncMock) as mock_send_waha:
        await process_due_followups(test_db)

        mock_send_waha.assert_called_once_with("5511999999999@c.us", "Olá Carlos, como posso ajudar?")

        await test_db.refresh(followup)
        assert followup.status == "sent"
        assert followup.sent_at is not None

        # Verify Message record saved
        msg_res = await test_db.execute(select(Message).where(Message.lead_id == lead.id))
        messages = msg_res.scalars().all()
        assert len(messages) == 1
        assert messages[0].body == "Olá Carlos, como posso ajudar?"
        assert messages[0].from_me is True


@pytest.mark.asyncio
async def test_process_due_followups_ai_mode(test_db):
    config = FollowupConfig(id=1, is_enabled=True, target_statuses=["novo"])
    test_db.add(config)

    agent_settings = AgentSettings(
        id=1,
        is_enabled=True,
        openai_api_key="sk-test-key",
        model="gpt-4o-mini",
        agent_name="Assistente AI",
    )
    test_db.add(agent_settings)

    lead = Lead(phone="5511888888888", name="Maria", status="novo")
    test_db.add(lead)
    await test_db.commit()
    await test_db.refresh(lead)

    step = FollowupStep(step_number=1, delay_hours=24, mode="ai", content="Pergunte se ela precisa de ajuda")
    test_db.add(step)
    await test_db.commit()
    await test_db.refresh(step)

    past_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    followup = LeadFollowup(
        lead_id=lead.id,
        step_id=step.id,
        step_number=1,
        scheduled_at=past_time,
        status="scheduled"
    )
    test_db.add(followup)
    await test_db.commit()
    await test_db.refresh(followup)

    mock_openai_instance = AsyncMock()
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="Olá Maria, precisa de ajuda com o imóvel?"))]
    mock_openai_instance.chat.completions.create.return_value = mock_response

    with patch("app.services.followup_scheduler.AsyncOpenAI", return_value=mock_openai_instance) as mock_openai_cls, \
         patch("app.services.followup_scheduler.send_waha_message", new_callable=AsyncMock) as mock_send_waha:

        await process_due_followups(test_db)

        mock_openai_cls.assert_called_once_with(api_key="sk-test-key")
        mock_openai_instance.chat.completions.create.assert_called_once()
        mock_send_waha.assert_called_once_with("5511888888888@c.us", "Olá Maria, precisa de ajuda com o imóvel?")

        await test_db.refresh(followup)
        assert followup.status == "sent"
        assert followup.sent_at is not None


@pytest.mark.asyncio
async def test_process_due_followups_cancelled_when_not_in_target_statuses(test_db):
    config = FollowupConfig(id=1, is_enabled=True, target_statuses=["novo"])
    test_db.add(config)

    lead = Lead(phone="5511777777777", name="João", status="ganho")
    test_db.add(lead)
    await test_db.commit()
    await test_db.refresh(lead)

    step = FollowupStep(step_number=1, delay_hours=24, mode="text", content="Olá {nome}")
    test_db.add(step)
    await test_db.commit()
    await test_db.refresh(step)

    past_time = datetime.now(timezone.utc) - timedelta(minutes=5)
    followup = LeadFollowup(
        lead_id=lead.id,
        step_id=step.id,
        step_number=1,
        scheduled_at=past_time,
        status="scheduled"
    )
    test_db.add(followup)
    await test_db.commit()
    await test_db.refresh(followup)

    with patch("app.services.followup_scheduler.send_waha_message", new_callable=AsyncMock) as mock_send_waha:
        await process_due_followups(test_db)

        mock_send_waha.assert_not_called()

        await test_db.refresh(followup)
        assert followup.status == "cancelled"
