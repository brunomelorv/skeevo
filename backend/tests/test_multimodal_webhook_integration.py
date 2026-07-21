import pytest
import base64
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import get_db
from app.models import Message, AgentSettings
from app.services.agent_service import build_openai_messages_payload


@pytest.fixture(autouse=True)
def override_db_dependency():
    mock_db = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    yield mock_db
    app.dependency_overrides.clear()


def test_build_openai_messages_payload_text_only():
    system_prompt = "Você é um assistente imobiliário."
    msg1 = Message(id=1, lead_id=1, body="Olá", from_me=False)
    msg2 = Message(id=2, lead_id=1, body="Como posso ajudar?", from_me=True)
    msg3 = Message(id=3, lead_id=1, body="Qual o preço?", from_me=False)

    payload = build_openai_messages_payload(system_prompt, [msg1, msg2, msg3])

    assert len(payload) == 4
    assert payload[0] == {"role": "system", "content": system_prompt}
    assert payload[1] == {"role": "user", "content": "Olá"}
    assert payload[2] == {"role": "assistant", "content": "Como posso ajudar?"}
    assert payload[3] == {"role": "user", "content": "Qual o preço?"}


def test_build_openai_messages_payload_with_image():
    system_prompt = "Você é um assistente imobiliário."
    msg1 = Message(id=1, lead_id=1, body="Olá", from_me=False)
    msg2 = Message(id=2, lead_id=1, body="[📷 Imagem enviada]", from_me=False)
    img_b64 = "data:image/jpeg;base64,abc123xyz"

    payload = build_openai_messages_payload(system_prompt, [msg1, msg2], current_image_b64=img_b64)

    assert len(payload) == 3
    assert payload[0] == {"role": "system", "content": system_prompt}
    assert payload[1] == {"role": "user", "content": "Olá"}
    assert payload[2] == {
        "role": "user",
        "content": [
            {"type": "text", "text": "[📷 Imagem enviada]"},
            {"type": "image_url", "image_url": {"url": img_b64}},
        ],
    }


@pytest.mark.asyncio
async def test_webhook_audio_message_handling(override_db_dependency):
    mock_db = override_db_dependency
    mock_lead = MagicMock()
    mock_lead.id = 10

    settings = AgentSettings(id=1, is_enabled=True, openai_api_key="sk-test-key")
    mock_settings_res = MagicMock()
    mock_settings_res.scalar_one_or_none.return_value = settings
    mock_db.execute.return_value = mock_settings_res

    payload = {
        "event": "message",
        "payload": {
            "from": "5511999999999@c.us",
            "fromMe": False,
            "id": "msg_audio_1",
            "hasMedia": True,
            "mediaUrl": "http://waha:3000/media/audio.ogg",
            "mimetype": "audio/ogg",
            "type": "ptt",
        },
    }

    fake_audio_bytes = b"fake audio content"
    fake_transcript = "Gostaria de agendar uma visita amanha"

    with patch("app.routes.webhook.download_waha_media", new_callable=AsyncMock) as mock_download, \
         patch("app.routes.webhook.transcribe_audio_bytes", new_callable=AsyncMock) as mock_transcribe, \
         patch("app.routes.webhook.upsert_lead", new_callable=AsyncMock) as mock_upsert, \
         patch("app.routes.webhook.process_incoming_lead_message", new_callable=AsyncMock) as mock_process:

        mock_download.return_value = fake_audio_bytes
        mock_transcribe.return_value = fake_transcript
        mock_upsert.return_value = (mock_lead, True)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/webhook/waha", json=payload)

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

        mock_download.assert_called_once_with("http://waha:3000/media/audio.ogg")
        mock_transcribe.assert_called_once_with(fake_audio_bytes, "sk-test-key")

        mock_upsert.assert_called_once()
        _, kwargs = mock_upsert.call_args
        assert kwargs["body"] == '[🎙️ Áudio]: "Gostaria de agendar uma visita amanha"'


@pytest.mark.asyncio
async def test_webhook_image_message_handling(override_db_dependency):
    mock_lead = MagicMock()
    mock_lead.id = 20

    payload = {
        "event": "message",
        "payload": {
            "from": "5511888888888@c.us",
            "fromMe": False,
            "id": "msg_img_1",
            "hasMedia": True,
            "mediaUrl": "http://waha:3000/media/house.jpg",
            "mimetype": "image/jpeg",
            "type": "image",
            "body": "",
        },
    }

    fake_img_bytes = b"fake image bytes"
    expected_b64 = "data:image/jpeg;base64," + base64.b64encode(fake_img_bytes).decode("utf-8")

    with patch("app.routes.webhook.download_waha_media", new_callable=AsyncMock) as mock_download, \
         patch("app.routes.webhook.upsert_lead", new_callable=AsyncMock) as mock_upsert, \
         patch("app.routes.webhook.process_incoming_lead_message", new_callable=AsyncMock) as mock_process:

        mock_download.return_value = fake_img_bytes
        mock_upsert.return_value = (mock_lead, True)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/webhook/waha", json=payload)

        assert response.status_code == 200
        assert response.json() == {"status": "ok"}

        mock_download.assert_called_once_with("http://waha:3000/media/house.jpg")

        mock_upsert.assert_called_once()
        _, kwargs = mock_upsert.call_args
        assert kwargs["body"] == "[📷 Imagem enviada]"

        mock_process.assert_called_once()
        _, proc_kwargs = mock_process.call_args
        assert proc_kwargs["lead_id"] == 20
        assert proc_kwargs["image_b64"] == expected_b64
