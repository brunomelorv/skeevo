import json
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.models import AgentSettings, Message, Lead, KanbanColumnModel
from app.services.agent_service import send_waha_message, process_incoming_lead_message
from app.services.lead_service import upsert_lead



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

    test_lead = Lead(
        id=1,
        phone="5511999999999",
        memory=[],
    )

    lead_message = Message(
        id=10,
        lead_id=1,
        body="Quero saber o valor do apartamento",
        from_me=False,
        chat_id="5511999999999@c.us",
    )

    # First db.execute for settings, second for lead, third for messages
    mock_settings_res = MagicMock()
    mock_settings_res.scalar_one_or_none.return_value = settings

    mock_lead_res = MagicMock()
    mock_lead_res.scalar_one_or_none.return_value = test_lead

    mock_msgs_res = MagicMock()
    mock_msgs_res.scalars.return_value.all.return_value = [lead_message]

    mock_lessons_res = MagicMock()
    mock_lessons_res.scalars.return_value.all.return_value = []

    mock_cols_res = MagicMock()
    mock_cols_res.scalars.return_value.all.return_value = []

    db.execute.side_effect = [mock_settings_res, mock_lead_res, mock_msgs_res, mock_lessons_res, mock_cols_res]

    # Mock OpenAI AsyncClient
    mock_openai_instance = AsyncMock()
    mock_response = MagicMock()
    mock_response.choices = [MagicMock(message=MagicMock(content="O valor é R$ 500.000.", tool_calls=None))]
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
async def test_process_incoming_lead_save_memory_tool():
    db = AsyncMock()
    db.add = MagicMock()

    settings = AgentSettings(
        id=1,
        is_enabled=True,
        openai_api_key="sk-valid-key",
        model="gpt-4o-mini",
        max_history_messages=15,
    )

    test_lead = Lead(
        id=1,
        phone="5511999999999",
        memory=[],
    )

    lead_message = Message(
        id=10,
        lead_id=1,
        body="Tenho uma barbearia chamada Silva Barber",
        from_me=False,
        chat_id="5511999999999@c.us",
    )

    mock_settings_res = MagicMock()
    mock_settings_res.scalar_one_or_none.return_value = settings

    mock_lead_res = MagicMock()
    mock_lead_res.scalar_one_or_none.return_value = test_lead

    mock_msgs_res = MagicMock()
    mock_msgs_res.scalars.return_value.all.return_value = [lead_message]

    mock_lessons_res = MagicMock()
    mock_lessons_res.scalars.return_value.all.return_value = []

    mock_cols_res = MagicMock()
    mock_cols_res.scalars.return_value.all.return_value = []

    db.execute.side_effect = [mock_settings_res, mock_lead_res, mock_msgs_res, mock_lessons_res, mock_cols_res]

    # Mock tool call in response 1
    mock_tool_call = MagicMock()
    mock_tool_call.id = "call_mem_123"
    mock_tool_call.type = "function"
    mock_tool_call.function.name = "save_lead_memory"
    mock_tool_call.function.arguments = '{"fact": "Nome do negócio é Silva Barber"}'

    mock_msg1 = MagicMock()
    mock_msg1.content = None
    mock_msg1.tool_calls = [mock_tool_call]
    mock_resp1 = MagicMock()
    mock_resp1.choices = [MagicMock(message=mock_msg1)]

    mock_msg2 = MagicMock()
    mock_msg2.content = "Anotado! Qual a sua maior dificuldade hoje?"
    mock_msg2.tool_calls = None
    mock_resp2 = MagicMock()
    mock_resp2.choices = [MagicMock(message=mock_msg2)]

    mock_openai_instance = AsyncMock()
    mock_openai_instance.chat.completions.create.side_effect = [mock_resp1, mock_resp2]

    with patch("app.services.agent_service.AsyncOpenAI", return_value=mock_openai_instance), \
         patch("app.services.agent_service.send_waha_message", new_callable=AsyncMock) as mock_send_waha:

        res = await process_incoming_lead_message(db, lead_id=1, chat_id="5511999999999@c.us")

        assert res is True
        assert mock_openai_instance.chat.completions.create.call_count == 2

        # Verify fact was saved into test_lead.memory
        assert len(test_lead.memory) == 1
        assert test_lead.memory[0]["fact"] == "Nome do negócio é Silva Barber"
        assert "at" in test_lead.memory[0]

        # Verify tool response message appended in second OpenAI call
        second_call_messages = mock_openai_instance.chat.completions.create.call_args_list[1].kwargs["messages"]
        tool_resp = next(m for m in second_call_messages if isinstance(m, dict) and m.get("role") == "tool")
        assert tool_resp["name"] == "save_lead_memory"
        assert tool_resp["tool_call_id"] == "call_mem_123"
        assert json.loads(tool_resp["content"]) == {"status": "saved"}

        mock_send_waha.assert_called_once_with("5511999999999@c.us", "Anotado! Qual a sua maior dificuldade hoje?")


@pytest.mark.asyncio
async def test_process_incoming_lead_move_kanban_tool():
    db = AsyncMock()
    db.add = MagicMock()

    settings = AgentSettings(
        id=1,
        is_enabled=True,
        openai_api_key="sk-valid-key",
        model="gpt-4o-mini",
        max_history_messages=15,
    )

    test_lead = Lead(
        id=1,
        phone="5511999999999",
        status="novo",
        memory=[],
    )

    lead_message = Message(
        id=10,
        lead_id=1,
        body="Gostaria de agendar uma reunião amanhã",
        from_me=False,
        chat_id="5511999999999@c.us",
    )

    qualificado_col = KanbanColumnModel(id=2, slug="qualificado", label="Qualificado", position=2, outcome_signal="positivo")

    mock_settings_res = MagicMock()
    mock_settings_res.scalar_one_or_none.return_value = settings

    mock_lead_res = MagicMock()
    mock_lead_res.scalar_one_or_none.return_value = test_lead

    mock_msgs_res = MagicMock()
    mock_msgs_res.scalars.return_value.all.return_value = [lead_message]

    mock_lessons_res = MagicMock()
    mock_lessons_res.scalars.return_value.all.return_value = []

    mock_cols_res = MagicMock()
    mock_cols_res.scalars.return_value.all.return_value = [qualificado_col]

    db.execute.side_effect = [mock_settings_res, mock_lead_res, mock_msgs_res, mock_lessons_res, mock_cols_res]

    # Mock tool call
    mock_tool_call = MagicMock()
    mock_tool_call.id = "call_move_123"
    mock_tool_call.type = "function"
    mock_tool_call.function.name = "move_lead_kanban"
    mock_tool_call.function.arguments = '{"target_slug": "qualificado", "reason": "Lead solicitou reunião"}'

    mock_msg1 = MagicMock()
    mock_msg1.content = None
    mock_msg1.tool_calls = [mock_tool_call]
    mock_resp1 = MagicMock()
    mock_resp1.choices = [MagicMock(message=mock_msg1)]

    mock_msg2 = MagicMock()
    mock_msg2.content = "Perfeito, movi você para a etapa Qualificado!"
    mock_msg2.tool_calls = None
    mock_resp2 = MagicMock()
    mock_resp2.choices = [MagicMock(message=mock_msg2)]

    mock_openai_instance = AsyncMock()
    mock_openai_instance.chat.completions.create.side_effect = [mock_resp1, mock_resp2]

    with patch("app.services.agent_service.AsyncOpenAI", return_value=mock_openai_instance), \
         patch("app.services.agent_service.send_waha_message", new_callable=AsyncMock) as mock_send_waha, \
         patch("app.routes.followup.get_or_create_config", new_callable=AsyncMock) as mock_get_config, \
         patch("app.routes.followup.cancel_lead_followups", new_callable=AsyncMock) as mock_cancel_followups, \
         patch("app.routes.followup.schedule_lead_followups", new_callable=AsyncMock) as mock_sched_followups:

        mock_config = MagicMock()
        mock_config.target_statuses = ["novo"]
        mock_get_config.return_value = mock_config

        res = await process_incoming_lead_message(db, lead_id=1, chat_id="5511999999999@c.us")

        assert res is True
        assert test_lead.status == "qualificado"
        assert db.add.call_count >= 2  # AuditLogModel and Message added
        db.commit.assert_called()
        mock_cancel_followups.assert_called_once_with(db, 1, reason="ai_moved_to_qualificado")
        mock_send_waha.assert_called_once_with("5511999999999@c.us", "Perfeito, movi você para a etapa Qualificado!")




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


@pytest.mark.asyncio
async def test_upsert_lead_deduplication():
    db = AsyncMock()
    db.add = MagicMock()
    added_objects = []
    db.add.side_effect = lambda obj: added_objects.append(obj)


    # First call setup: message_id does not exist, lead does not exist
    mock_msg_res1 = MagicMock()
    mock_msg_res1.scalar_one_or_none.return_value = None

    mock_lead_res1 = MagicMock()
    mock_lead_res1.scalar_one_or_none.return_value = None

    # Second call setup: message_id exists
    existing_msg = Message(id=1, lead_id=10, message_id="msg_duplicate_123")
    mock_msg_res2 = MagicMock()
    mock_msg_res2.scalar_one_or_none.return_value = existing_msg

    existing_lead = Lead(id=10, phone="5511999999999")
    mock_lead_res2 = MagicMock()
    mock_lead_res2.scalar_one_or_none.return_value = existing_lead

    db.execute.side_effect = [
        mock_msg_res1,   # 1st call msg check
        mock_lead_res1,  # 1st call lead check
        mock_msg_res2,   # 2nd call msg check
        mock_lead_res2,  # 2nd call lead check
    ]

    # Call 1: First time with msg_duplicate_123
    lead1, is_new1 = await upsert_lead(
        db,
        phone="5511999999999",
        body="Olá",
        message_id="msg_duplicate_123",
        chat_id="5511999999999@c.us",
        timestamp=1700000000,
    )

    assert is_new1 is True
    assert len(added_objects) == 2  # Lead and Message added

    # Call 2: Second time with same msg_duplicate_123
    lead2, is_new2 = await upsert_lead(
        db,
        phone="5511999999999",
        body="Olá",
        message_id="msg_duplicate_123",
        chat_id="5511999999999@c.us",
        timestamp=1700000000,
    )

    assert is_new2 is False
    assert lead2 == existing_lead
    # Ensure no new objects were added in the second call
    assert len(added_objects) == 2

