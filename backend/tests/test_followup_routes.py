import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import select

from app.main import app
from app.database import get_db, Base
from app.models import Lead, LeadFollowup, FollowupConfig, FollowupStep, Message

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


@pytest_asyncio.fixture
async def client(test_db):
    async def override_get_db():
        yield test_db

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_get_and_post_followup_config(client):
    # GET config default
    res = await client.get("/api/followup/config")
    assert res.status_code == 200
    data = res.json()
    assert data["is_enabled"] is False
    assert data["target_statuses"] == ["novo", "em_atendimento"]
    assert data["steps"] == []

    # POST config update
    payload = {
        "is_enabled": True,
        "target_statuses": ["novo"],
        "window_start": "09:00",
        "window_end": "18:00",
        "min_interval_minutes": 5,
        "steps": [
            {"step_number": 1, "delay_hours": 24, "mode": "text", "content": "Passo 1"},
            {"step_number": 2, "delay_hours": 48, "mode": "text", "content": "Passo 2"}
        ]
    }
    res_post = await client.post("/api/followup/config", json=payload)
    assert res_post.status_code == 200
    updated_data = res_post.json()
    assert updated_data["is_enabled"] is True
    assert updated_data["target_statuses"] == ["novo"]
    assert len(updated_data["steps"]) == 2
    assert updated_data["steps"][0]["content"] == "Passo 1"
    assert updated_data["steps"][1]["step_number"] == 2


@pytest.mark.asyncio
async def test_get_queue_and_manual_cancel(client, test_db):
    # Setup Lead and LeadFollowup in DB
    lead = Lead(phone="5511999999999", name="Lead Teste", status="novo")
    test_db.add(lead)
    await test_db.commit()
    await test_db.refresh(lead)

    step = FollowupStep(step_number=1, delay_hours=24, content="Teste queue")
    test_db.add(step)
    await test_db.commit()
    await test_db.refresh(step)

    from datetime import datetime
    followup = LeadFollowup(
        lead_id=lead.id,
        step_id=step.id,
        step_number=1,
        scheduled_at=datetime.now(),
        status="scheduled"
    )
    test_db.add(followup)
    await test_db.commit()
    await test_db.refresh(followup)

    # GET queue
    res_queue = await client.get("/api/followup/queue")
    assert res_queue.status_code == 200
    queue_data = res_queue.json()
    assert len(queue_data) == 1
    assert queue_data[0]["id"] == followup.id
    assert queue_data[0]["lead_id"] == lead.id
    assert queue_data[0]["lead_phone"] == "5511999999999"

    # POST queue/{id}/cancel
    res_cancel = await client.post(f"/api/followup/queue/{followup.id}/cancel")
    assert res_cancel.status_code == 200
    cancelled_data = res_cancel.json()
    assert cancelled_data["status"] == "cancelled"
    assert cancelled_data["cancel_reason"] == "manual"


@pytest.mark.asyncio
async def test_cancel_lead_followups_on_status_change(client, test_db):
    # Setup config enabled
    config_payload = {
        "is_enabled": True,
        "target_statuses": ["novo"],
        "window_start": "08:00",
        "window_end": "20:00",
        "min_interval_minutes": 4,
        "steps": [{"step_number": 1, "delay_hours": 24, "mode": "text", "content": "Passo 1"}]
    }
    await client.post("/api/followup/config", json=config_payload)

    # Create lead
    lead = Lead(phone="5511888888888", name="Status Change Lead", status="novo")
    test_db.add(lead)
    await test_db.commit()
    await test_db.refresh(lead)

    from app.routes.followup import schedule_lead_followups
    await schedule_lead_followups(test_db, lead)

    # Verify followup scheduled
    queue_res = await client.get("/api/followup/queue")
    assert len(queue_res.json()) == 1

    # Update status to "ganho" (not in target_statuses)
    patch_res = await client.patch(f"/leads/{lead.id}/status", json={"status": "ganho"})
    assert patch_res.status_code == 200

    # Verify followup is cancelled with reason status_changed_to_ganho
    db_followups = await test_db.execute(select(LeadFollowup).where(LeadFollowup.lead_id == lead.id))
    items = db_followups.scalars().all()
    assert len(items) == 1
    assert items[0].status == "cancelled"
    assert items[0].cancel_reason == "status_changed_to_ganho"


@pytest.mark.asyncio
async def test_cancel_lead_followups_on_lead_replied(client, test_db):
    # Enable config
    config_payload = {
        "is_enabled": True,
        "target_statuses": ["novo"],
        "window_start": "08:00",
        "window_end": "20:00",
        "min_interval_minutes": 4,
        "steps": [{"step_number": 1, "delay_hours": 24, "mode": "text", "content": "Passo 1"}]
    }
    await client.post("/api/followup/config", json=config_payload)

    # Send first message via webhook (creates new lead and schedules followup)
    payload_msg1 = {
        "event": "message",
        "payload": {
            "from": "5511777777777@c.us",
            "fromMe": False,
            "id": "msg_reply_1",
            "body": "Olá, tenho interesse",
            "type": "chat"
        }
    }
    res1 = await client.post("/webhook/waha", json=payload_msg1)
    assert res1.status_code == 200

    # Verify followup is scheduled for the lead
    lead_res = await test_db.execute(select(Lead).where(Lead.phone == "5511777777777"))
    lead = lead_res.scalar_one()

    db_followups = await test_db.execute(select(LeadFollowup).where(LeadFollowup.lead_id == lead.id))
    items = db_followups.scalars().all()
    assert len(items) == 1
    assert items[0].status == "scheduled"

    # Send second message from lead (lead replied)
    payload_msg2 = {
        "event": "message",
        "payload": {
            "from": "5511777777777@c.us",
            "fromMe": False,
            "id": "msg_reply_2",
            "body": "Mais informações por favor",
            "type": "chat"
        }
    }
    res2 = await client.post("/webhook/waha", json=payload_msg2)
    assert res2.status_code == 200

    # Verify followup was cancelled with reason lead_replied
    await test_db.refresh(items[0])
    assert items[0].status == "cancelled"
    assert items[0].cancel_reason == "lead_replied"
