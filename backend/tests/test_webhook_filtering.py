import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_db


@pytest.fixture(autouse=True)
def override_db_dependency():
    mock_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    yield mock_db
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_webhook_waha_push_name_extraction():
    mock_lead = MagicMock()
    mock_lead.id = 1

    payload = {
        "event": "message",
        "me": {"id": "5511999999999@c.us", "pushName": "Bruno Melo - Automações"},
        "payload": {
            "from": "5511888888888@c.us",
            "fromMe": False,
            "id": "msg_pushname_1",
            "body": "Olá, gostaria de informações",
            "pushName": "Shirley",
            "_data": {
                "notifyName": "Shirley"
            }
        }
    }

    with patch("app.routes.webhook.upsert_lead", new_callable=AsyncMock) as mock_upsert, \
         patch("app.routes.webhook.process_incoming_lead_message", new_callable=AsyncMock) as mock_process:
        mock_upsert.return_value = (mock_lead, True)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/webhook/waha", json=payload)

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        mock_upsert.assert_called_once()
        _, kwargs = mock_upsert.call_args
        assert kwargs["push_name"] == "Shirley"
        assert kwargs["push_name"] != "Bruno Melo - Automações"


@pytest.mark.asyncio
async def test_webhook_waha_empty_body_ignored():
    payload = {
        "event": "message",
        "me": {"id": "5511999999999@c.us", "pushName": "Bruno Melo - Automações"},
        "payload": {
            "from": "5511888888888@c.us",
            "fromMe": False,
            "id": "msg_empty_1",
            "body": "",
            "hasMedia": False,
            "type": "chat"
        }
    }

    with patch("app.routes.webhook.upsert_lead", new_callable=AsyncMock) as mock_upsert, \
         patch("app.routes.webhook.process_incoming_lead_message", new_callable=AsyncMock) as mock_process:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/webhook/waha", json=payload)

        assert response.status_code == 200
        assert response.json() == {"status": "ignored"}
        mock_upsert.assert_not_called()
        mock_process.assert_not_called()


@pytest.mark.asyncio
async def test_webhook_waha_system_notification_ignored():
    payload = {
        "event": "message",
        "me": {"id": "5511999999999@c.us", "pushName": "Bruno Melo - Automações"},
        "payload": {
            "from": "5511888888888@c.us",
            "fromMe": False,
            "id": "msg_e2e_1",
            "body": "Messages and calls are end-to-end encrypted.",
            "type": "e2e_notification"
        }
    }

    with patch("app.routes.webhook.upsert_lead", new_callable=AsyncMock) as mock_upsert, \
         patch("app.routes.webhook.process_incoming_lead_message", new_callable=AsyncMock) as mock_process:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/webhook/waha", json=payload)

        assert response.status_code == 200
        assert response.json() == {"status": "ignored"}
        mock_upsert.assert_not_called()
        mock_process.assert_not_called()


@pytest.mark.asyncio
async def test_webhook_waha_valid_chat_message():
    mock_lead = MagicMock()
    mock_lead.id = 42

    payload = {
        "event": "message",
        "me": {"id": "5511999999999@c.us", "pushName": "Bruno Melo - Automações"},
        "payload": {
            "from": "5511888888888@c.us",
            "fromMe": False,
            "id": "msg_valid_1",
            "body": "Tenho interesse no imóvel",
            "type": "chat"
        }
    }

    with patch("app.routes.webhook.upsert_lead", new_callable=AsyncMock) as mock_upsert, \
         patch("app.routes.webhook.process_incoming_lead_message", new_callable=AsyncMock) as mock_process:
        mock_upsert.return_value = (mock_lead, True)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/webhook/waha", json=payload)

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
        mock_upsert.assert_called_once()
        mock_process.assert_called_once_with(db=pytest.any, lead_id=42, chat_id="5511888888888@c.us") if hasattr(pytest, "any") else None
        assert mock_process.call_args.kwargs["lead_id"] == 42
        assert mock_process.call_args.kwargs["chat_id"] == "5511888888888@c.us"


@pytest.mark.asyncio
async def test_webhook_waha_duplicate_message_ignored():
    mock_lead = MagicMock()
    mock_lead.id = 42

    payload = {
        "event": "message",
        "me": {"id": "5511999999999@c.us", "pushName": "Bruno Melo - Automações"},
        "payload": {
            "from": "5511888888888@c.us",
            "fromMe": False,
            "id": "msg_dup_1",
            "body": "Mensagem duplicada",
            "type": "chat"
        }
    }

    with patch("app.routes.webhook.upsert_lead", new_callable=AsyncMock) as mock_upsert, \
         patch("app.routes.webhook.process_incoming_lead_message", new_callable=AsyncMock) as mock_process:
        mock_upsert.return_value = (mock_lead, False)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/webhook/waha", json=payload)

        assert response.status_code == 200
        assert response.json() == {"status": "duplicate_ignored"}
        mock_upsert.assert_called_once()
        mock_process.assert_not_called()
