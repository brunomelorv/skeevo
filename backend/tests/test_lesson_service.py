import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.models import AgentSettings, Lead, Message, AgentLesson
from app.services.lesson_service import analyze_lead_outcome


@pytest.mark.asyncio
async def test_analyze_lead_outcome_success():
    mock_db = AsyncMock()

    settings = AgentSettings(id=1, is_enabled=True, openai_api_key="sk-test")
    lead = Lead(id=10, phone="5511999999999", memory=[{"fact": "PetShop"}])
    msg1 = Message(id=1, lead_id=10, body="Olá", from_me=False)
    msg2 = Message(id=2, lead_id=10, body="Olá! Como posso ajudar?", from_me=True)

    mock_db.get.side_effect = lambda model, key: settings if model == AgentSettings else (lead if model == Lead else None)

    mock_msg_res = MagicMock()
    mock_msg_res.scalars.return_value.all.return_value = [msg1, msg2]
    mock_db.execute.return_value = mock_msg_res

    mock_session_cls = MagicMock()
    mock_session_cls.return_value.__aenter__.return_value = mock_db

    mock_openai_instance = AsyncMock()
    mock_response = MagicMock()
    mock_response.choices = [
        MagicMock(message=MagicMock(content='{"licoes": ["Ser empático funciona."]}'))
    ]
    mock_openai_instance.chat.completions.create.return_value = mock_response

    with patch("app.services.lesson_service.async_session", mock_session_cls), \
         patch("app.services.lesson_service.AsyncOpenAI", return_value=mock_openai_instance):

        await analyze_lead_outcome(10, "positivo")

        assert mock_db.add.call_count == 1
        added_lesson = mock_db.add.call_args[0][0]
        assert isinstance(added_lesson, AgentLesson)
        assert added_lesson.lead_id == 10
        assert added_lesson.outcome == "positivo"
        assert added_lesson.lesson == "Ser empático funciona."
        mock_db.commit.assert_called_once()


@pytest.mark.asyncio
async def test_analyze_lead_outcome_no_messages():
    mock_db = AsyncMock()

    settings = AgentSettings(id=1, is_enabled=True, openai_api_key="sk-test")
    lead = Lead(id=10, phone="5511999999999", memory=[])

    mock_db.get.side_effect = lambda model, key: settings if model == AgentSettings else (lead if model == Lead else None)

    mock_msg_res = MagicMock()
    mock_msg_res.scalars.return_value.all.return_value = []
    mock_db.execute.return_value = mock_msg_res

    mock_session_cls = MagicMock()
    mock_session_cls.return_value.__aenter__.return_value = mock_db

    with patch("app.services.lesson_service.async_session", mock_session_cls), \
         patch("app.services.lesson_service.AsyncOpenAI") as mock_openai_cls:

        await analyze_lead_outcome(10, "negativo")

        mock_openai_cls.assert_not_called()
        mock_db.add.assert_not_called()
