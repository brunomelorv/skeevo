import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.audio_service import (
    format_audio_transcript,
    transcribe_audio_bytes,
    download_waha_media,
)


def test_format_audio_transcript():
    raw_text = "  Olá, este é um teste de áudio.  "
    expected = '[🎙️ Áudio]: "Olá, este é um teste de áudio."'
    assert format_audio_transcript(raw_text) == expected


@pytest.mark.asyncio
async def test_transcribe_audio_bytes():
    fake_audio_bytes = b"fake audio content"
    fake_api_key = "sk-fake-key"
    mock_transcription_result = MagicMock()
    mock_transcription_result.text = "Transcrição de teste"

    with patch("app.services.audio_service.AsyncOpenAI") as mock_openai_cls:
        mock_client = MagicMock()
        mock_openai_cls.return_value = mock_client
        mock_client.audio.transcriptions.create = AsyncMock(return_value=mock_transcription_result)

        result = await transcribe_audio_bytes(fake_audio_bytes, api_key=fake_api_key)

        assert result == "Transcrição de teste"
        mock_openai_cls.assert_called_once_with(api_key=fake_api_key)
        mock_client.audio.transcriptions.create.assert_called_once_with(
            model="whisper-1",
            file=("voice.ogg", fake_audio_bytes, "audio/ogg"),
        )


@pytest.mark.asyncio
async def test_download_waha_media():
    fake_url = "http://localhost:3000/media/123.ogg"
    fake_content = b"audio content bytes"

    mock_response = MagicMock()
    mock_response.content = fake_content
    mock_response.raise_for_status = MagicMock()

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.return_value = mock_response

        content = await download_waha_media(fake_url)

        assert content == fake_content
        mock_get.assert_called_once_with(fake_url)
