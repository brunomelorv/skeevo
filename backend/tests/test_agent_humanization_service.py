import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.models import AgentSettings, Message
from app.services.agent_service import (
    split_text_into_chunks,
    calculate_typing_delay,
    send_waha_presence,
    process_incoming_lead_message,
)


def test_split_text_into_chunks():
    # Splitting on double newline
    text1 = "Primeiro parágrafo longo para teste.\n\nSegundo parágrafo longo para teste."
    chunks1 = split_text_into_chunks(text1)
    assert len(chunks1) == 2
    assert chunks1[0] == "Primeiro parágrafo longo para teste."
    assert chunks1[1] == "Segundo parágrafo longo para teste."

    # Splitting on [PAUSA]
    text2 = "Primeira frase suficientemente longa. [PAUSA] Segunda frase suficientemente longa."
    chunks2 = split_text_into_chunks(text2)
    assert len(chunks2) == 2
    assert chunks2[0] == "Primeira frase suficientemente longa."
    assert chunks2[1] == "Segunda frase suficientemente longa."

    # Short chunk (< 10 chars) merged with adjacent chunk
    text3 = "Olá!\n\nEsta é uma mensagem bem mais longa para o teste de agrupamento."
    chunks3 = split_text_into_chunks(text3)
    assert len(chunks3) == 1
    assert chunks3[0] == "Olá! Esta é uma mensagem bem mais longa para o teste de agrupamento."

    # Trailing short chunk merged with previous chunk
    text4 = "Esta mensagem principal é bem longa para o teste.\n\n[PAUSA]\n\nOk!"
    chunks4 = split_text_into_chunks(text4)
    assert len(chunks4) == 1
    assert chunks4[0] == "Esta mensagem principal é bem longa para o teste. Ok!"


def test_calculate_typing_delay():
    # Short chunk -> returns min_delay
    short_text = "Olá!"
    assert calculate_typing_delay(short_text, min_delay=3, max_delay=8) == 3.0

    # Long chunk -> returns len(chunk) * 0.04
    long_text = "A" * 150  # 150 * 0.04 = 6.0s
    assert calculate_typing_delay(long_text, min_delay=3, max_delay=8) == 6.0

    # Very long chunk -> clamped to max_delay
    very_long_text = "A" * 500  # 500 * 0.04 = 20.0s -> max 8.0s
    assert calculate_typing_delay(very_long_text, min_delay=3, max_delay=8) == 8.0


@pytest.mark.asyncio
async def test_send_waha_presence():
    mock_client_instance = AsyncMock()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_client_instance.post.return_value = mock_response

    mock_client_cls = MagicMock()
    mock_client_cls.return_value.__aenter__.return_value = mock_client_instance

    with patch("httpx.AsyncClient", new=mock_client_cls):
        res = await send_waha_presence("5511999999999@c.us", "composing")

        assert res.status_code == 200
        mock_client_instance.post.assert_called_once()
        args, kwargs = mock_client_instance.post.call_args
        assert "/api/presence" in args[0]
        assert kwargs["json"] == {
            "session": "default",
            "chatId": "5511999999999@c.us",
            "presence": "composing",
        }


@pytest.mark.asyncio
async def test_process_incoming_lead_message_organic_pipeline():
    db = AsyncMock()
    db.add = MagicMock()

    settings = AgentSettings(
        id=1,
        is_enabled=True,
        openai_api_key="sk-valid-key",
        model="gpt-4o-mini",
        max_history_messages=15,
        simulate_typing=True,
        split_long_messages=True,
        min_typing_delay=3,
        max_typing_delay=8,
    )

    lead_message = Message(
        id=10,
        lead_id=1,
        body="Quero informações sobre os imóveis",
        from_me=False,
        chat_id="5511999999999@c.us",
    )

    mock_settings_res = MagicMock()
    mock_settings_res.scalar_one_or_none.return_value = settings

    mock_msgs_res = MagicMock()
    mock_msgs_res.scalars.return_value.all.return_value = [lead_message]

    db.execute.side_effect = [mock_settings_res, mock_msgs_res]

    mock_openai_instance = AsyncMock()
    ai_reply = "Primeiro parágrafo longo para teste.\n\nSegundo parágrafo longo para teste."
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content=ai_reply))]
    mock_openai_instance.chat.completions.create.return_value = mock_response

    with patch("app.services.agent_service.AsyncOpenAI", return_value=mock_openai_instance), \
         patch("app.services.agent_service.send_waha_presence", new_callable=AsyncMock) as mock_presence, \
         patch("app.services.agent_service.send_waha_message", new_callable=AsyncMock) as mock_send_waha, \
         patch("asyncio.sleep", new_callable=AsyncMock) as mock_sleep:

        res = await process_incoming_lead_message(db, lead_id=1, chat_id="5511999999999@c.us")

        assert res is True
        assert mock_presence.call_count == 2
        mock_presence.assert_any_call("5511999999999@c.us", "composing")

        assert mock_sleep.call_count == 2

        assert mock_send_waha.call_count == 2
        mock_send_waha.assert_any_call("5511999999999@c.us", "Primeiro parágrafo longo para teste.")
        mock_send_waha.assert_any_call("5511999999999@c.us", "Segundo parágrafo longo para teste.")

        assert db.add.call_count == 2
