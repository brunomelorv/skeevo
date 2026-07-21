# Suporte Multimodal (Áudio Whisper + Visão de Imagens) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable the AI Agent to transcribe audio voice notes using OpenAI Whisper (`whisper-1`) and process images/documents using OpenAI Vision (`gpt-4o-mini`).

**Architecture:** Create `audio_service.py` and `waha_media_service.py`. Update `webhook.py` to extract media files, transcribe audio to `[🎙️ Áudio]: "..."`, and update `agent_service.py` to send `image_url` payloads for image messages.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, httpx, AsyncOpenAI, WAHA API.

## Global Constraints
- Audio messages are transcribed via `AsyncOpenAI.audio.transcriptions.create(model="whisper-1", file=...)`.
- Audio transcripts are prefixed with `[🎙️ Áudio]: "..."`.
- Images are encoded as Base64 data URLs (`data:image/jpeg;base64,...`) and passed in `image_url` OpenAI content arrays.

---

### Task 1: WAHA Media Downloader & Audio Whisper Service

**Files:**
- Create: `backend/app/services/audio_service.py`
- Create: `backend/tests/test_multimodal_audio_service.py`

- [ ] **Step 1: Write test for audio transcription service**

```python
# backend/tests/test_multimodal_audio_service.py
import pytest
from unittest.mock import AsyncMock, patch
from app.services.audio_service import transcribe_audio_bytes, format_audio_transcript

def test_format_audio_transcript():
    result = format_audio_transcript("Olá, gostaria de saber o valor do imóvel.")
    assert result == '[🎙️ Áudio]: "Olá, gostaria de saber o valor do imóvel."'

@pytest.mark.asyncio
async def test_transcribe_audio_bytes_mocked():
    with patch("app.services.audio_service.AsyncOpenAI") as mock_openai:
        mock_client = AsyncMock()
        mock_openai.return_value = mock_client
        mock_client.audio.transcriptions.create.return_value = AsyncMock(text="Teste de áudio")
        
        transcript = await transcribe_audio_bytes(b"dummy_audio_bytes", "sk-fake-key")
        assert transcript == "Teste de áudio"
```

- [ ] **Step 2: Run test to verify failure**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/test_multimodal_audio_service.py -v`

- [ ] **Step 3: Implement `audio_service.py` and `download_waha_media`**

Create `backend/app/services/audio_service.py`:
- `format_audio_transcript(text: str) -> str`: returns `f'[🎙️ Áudio]: "{text.strip()}"'`
- `download_waha_media(media_url: str) -> bytes`: downloads media file using `httpx.AsyncClient`
- `transcribe_audio_bytes(audio_bytes: bytes, api_key: str, filename: str = "voice.ogg") -> str`: calls OpenAI Whisper API.

- [ ] **Step 4: Run test to verify pass**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/test_multimodal_audio_service.py -v`

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/audio_service.py backend/tests/test_multimodal_audio_service.py
git commit -m "feat(backend): add audio transcription service using OpenAI Whisper API"
```

---

### Task 2: Webhook & Agent Service Multimodal Integration

**Files:**
- Modify: `backend/app/routes/webhook.py`
- Modify: `backend/app/services/agent_service.py`
- Create: `backend/tests/test_multimodal_webhook_integration.py`

- [ ] **Step 1: Write test for multimodal webhook & vision processing**

```python
# backend/tests/test_multimodal_webhook_integration.py
import pytest
from app.services.agent_service import build_openai_messages_payload

def test_build_openai_messages_payload_with_image():
    history = [
        {"role": "user", "content": "[📷 Imagem enviada]", "image_base64": "data:image/jpeg;base64,12345"}
    ]
    messages = build_openai_messages_payload("System prompt", history)
    assert len(messages) == 2
    assert messages[1]["role"] == "user"
    assert isinstance(messages[1]["content"], list)
    assert messages[1]["content"][1]["type"] == "image_url"
```

- [ ] **Step 2: Run test to verify failure**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/test_multimodal_webhook_integration.py -v`

- [ ] **Step 3: Update `webhook.py` and `agent_service.py`**

In `backend/app/routes/webhook.py`:
- Check if message has media (`hasMedia` / `mediaUrl` / `mimetype`).
- If Audio (`mimetype` contains `audio` or `ptt` / `voice`):
  - Download media bytes.
  - Call `transcribe_audio_bytes`.
  - Format body as `format_audio_transcript(transcript)`.
- If Image (`mimetype` contains `image`):
  - Download media bytes and convert to Base64.
  - Save `image_url` / Base64 metadata or set body to caption / `"[📷 Imagem enviada]"`.

In `backend/app/services/agent_service.py`:
- Update `process_incoming_lead_message` to pass `image_url` content array to OpenAI if the latest message is an image.

- [ ] **Step 4: Run test to verify pass**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/ -v`

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/webhook.py backend/app/services/agent_service.py backend/tests/test_multimodal_webhook_integration.py
git commit -m "feat(backend): connect audio transcription and vision payloads to webhook and agent service"
```

---

### Task 3: End-to-End Verification & Testing

- [ ] **Step 1: Run pytest backend test suite**
- [ ] **Step 2: Rebuild docker containers (`docker compose up -d --build backend`)**
