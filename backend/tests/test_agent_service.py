import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.models import AgentSettings, Message
from app.services.agent_service import send_waha_message, process_incoming_lead_message


@pytest.mark.asyncio
async def test_process_incoming_lead_message_disabled():
    db = AsyncMock()
    db.add = MagicMock()

    # AgentSettings disabled
    settings = AgentSettings(
        id=1,
        is_enabled=False,
        openai_api_key="sk-test-key",
        model="gpt-4o-mini",
    )

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = settings
    db.execute.return_value = mock_result

    with patch("app.services.agent_service.AsyncOpenAI") as mock_openai_cls, \
         patch("app.services.agent_service.send_waha_message") as mock_send_waha:

        res = await process_incoming_lead_message(db, lead_id=1, chat_id="5511999999999@c.us")

        assert res is False
        mock_openai_cls.assert_not_called()
        mock_send_waha.assert_not_called()


@pytest.mark.asyncio
async def test_process_incoming_lead_message_empty_api_key():
    db = AsyncMock()
    db.add = MagicMock()

    # Enabled but no API key
    settings = AgentSettings(
        id=1,
        is_enabled=True,
        openai_api_key="",
        model="gpt-4o-mini",
    )

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = settings
    db.execute.return_value = mock_result

    with patch("app.services.agent_service.AsyncOpenAI") as mock_openai_cls, \
         patch("app.services.agent_service.send_waha_message") as mock_send_waha:

        res = await process_incoming_lead_message(db, lead_id=1, chat_id="5511999999999@c.us")

        assert res is False
        mock_openai_cls.assert_not_called()
        mock_send_waha.assert_not_called()


@pytest.mark.asyncio
async def test_process_incoming_lead_message_enabled():
    db = AsyncMock()
    db.add = MagicMock()

    settings = AgentSettings(
        id=1,
        is_enabled=True,
        openai_api_key="sk-valid-key",
        model="gpt-4o-mini",
        max_history_messages=15,
    )

    lead_message = Message(
        id=10,
        lead_id=1,
        body="Quero saber o valor do apartamento",
        from_me=False,
        chat_id="5511999999999@c.us",
    )

    # First db.execute for settings, second for messages
    mock_settings_res = MagicMock()
    mock_settings_res.scalar_one_or_none.return_value = settings

    mock_msgs_res = MagicMock()
    mock_msgs_res.scalars.return_value.all.return_value = [lead_message]

    db.execute.side_effect = [mock_settings_res, mock_msgs_res]

    # Mock OpenAI AsyncClient
    mock_openai_instance = AsyncMock()
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="O valor é R$ 500.000."))]
    mock_openai_instance.chat.completions.create.return_value = mock_response

    with patch("app.services.agent_service.AsyncOpenAI", return_value=mock_openai_instance) as mock_openai_cls, \
         patch("app.services.agent_service.send_waha_message", new_callable=AsyncMock) as mock_send_waha:

        res = await process_incoming_lead_message(db, lead_id=1, chat_id="5511999999999@c.us")

        assert res is True
        mock_openai_cls.assert_called_once_with(api_key="sk-valid-key")
        mock_openai_instance.chat.completions.create.assert_called_once()
        
        # Check call args to completions.create
        call_kwargs = mock_openai_instance.chat.completions.create.call_args.kwargs
        assert call_kwargs["model"] == "gpt-4o-mini"
        assert len(call_kwargs["messages"]) == 2  # system + 1 user msg
        assert call_kwargs["messages"][0]["role"] == "system"
        assert call_kwargs["messages"][1]["role"] == "user"
        assert call_kwargs["messages"][1]["content"] == "Quero saber o valor do apartamento"

        # Check DB saving assistant response
        db.add.assert_called_once()
        added_msg = db.add.call_args[0][0]
        assert added_msg.from_me is True
        assert added_msg.body == "O valor é R$ 500.000."
        assert added_msg.lead_id == 1
        db.commit.assert_called_once()

        # Check send_waha_message invocation
        mock_send_waha.assert_called_once_with("5511999999999@c.us", "O valor é R$ 500.000.")


@pytest.mark.asyncio
async def test_send_waha_message():
    mock_client_instance = AsyncMock()
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_client_instance.post.return_value = mock_response

    mock_client_cls = MagicMock()
    mock_client_cls.return_value.__aenter__.return_value = mock_client_instance

    with patch("httpx.AsyncClient", new=mock_client_cls):
        res = await send_waha_message("5511999999999@c.us", "Mensagem de teste")

        assert res.status_code == 200
        mock_client_instance.post.assert_called_once()
        args, kwargs = mock_client_instance.post.call_args
        assert kwargs["json"] == {
            "session": "default",
            "chatId": "5511999999999@c.us",
            "text": "Mensagem de teste",
        }
