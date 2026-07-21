# Humanização Orgânica (WAHA Presence + Typing Delays + Message Splitter) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement organic human-like message behavior for AI agent and Follow Up responses, including WAHA typing status ("composing"), dynamic character-length delays (min/max bounds), and automatic message splitting into natural short bubbles.

**Architecture:** Extend `AgentSettings` ORM model & schemas with `simulate_typing`, `split_long_messages`, `min_typing_delay`, and `max_typing_delay`. Update `agent_service.py` with `send_waha_presence` and `send_organic_response_chunks` pipeline. Add Humanization settings card in `frontend/src/components/agent/AgentForm.tsx`.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, httpx, AsyncOpenAI, Next.js 15, Tailwind CSS.

## Global Constraints
- WAHA presence endpoint: `POST {WAHA_API_URL}/api/presence` with payload `{"session": "default", "chatId": chat_id, "presence": "composing"}`.
- Split text by double newlines (`\n\n`) or `[PAUSA]`. Merge chunks shorter than 10 chars.
- Calculate delay: `min(max(len(chunk) * 0.04, min_delay), max_delay)`.

---

### Task 1: Backend Settings Model & Schemas Extension

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/app/schemas.py`
- Create: `backend/tests/test_agent_humanization_model.py`

- [ ] **Step 1: Write test for humanization fields in model & schema**

```python
# backend/tests/test_agent_humanization_model.py
from app.schemas import AgentSettingsUpdate, AgentSettingsRead

def test_humanization_schema_defaults():
    update_data = AgentSettingsUpdate(
        simulate_typing=True,
        split_long_messages=True,
        min_typing_delay=3,
        max_typing_delay=8
    )
    assert update_data.simulate_typing is True
    assert update_data.split_long_messages is True
    assert update_data.min_typing_delay == 3
    assert update_data.max_typing_delay == 8
```

- [ ] **Step 2: Run test to verify failure**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/test_agent_humanization_model.py -v`

- [ ] **Step 3: Update `AgentSettings` model and schemas**

In `backend/app/models.py`:
Add columns to `AgentSettings`:
- `simulate_typing = Column(Boolean, default=True)`
- `split_long_messages = Column(Boolean, default=True)`
- `min_typing_delay = Column(Integer, default=3)`
- `max_typing_delay = Column(Integer, default=8)`

In `backend/app/schemas.py`:
Add fields to `AgentSettingsBase`:
- `simulate_typing: bool = True`
- `split_long_messages: bool = True`
- `min_typing_delay: int = 3`
- `max_typing_delay: int = 8`

In `backend/app/routes/agent.py`:
Update `get_agent_settings` and `update_agent_settings` to pass through these fields.

- [ ] **Step 4: Run test to verify pass**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/test_agent_humanization_model.py -v`

- [ ] **Step 5: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py backend/app/routes/agent.py backend/tests/test_agent_humanization_model.py
git commit -m "feat(backend): add humanization settings to AgentSettings model and schemas"
```

---

### Task 2: Backend WAHA Presence & Message Splitter Pipeline

**Files:**
- Modify: `backend/app/services/agent_service.py`
- Create: `backend/tests/test_agent_humanization_service.py`

- [ ] **Step 1: Write test for message splitter and presence helpers**

```python
# backend/tests/test_agent_humanization_service.py
from app.services.agent_service import split_text_into_chunks, calculate_typing_delay

def test_split_text_into_chunks():
    text = "Olá! Como vai?\n\nPodemos agendar uma reunião amanhã para falar sobre os imóveis."
    chunks = split_text_into_chunks(text)
    assert len(chunks) == 2
    assert chunks[0] == "Olá! Como vai?"

def test_calculate_typing_delay():
    # Short chunk -> should hit min_delay
    assert calculate_typing_delay("Olá!", min_delay=3, max_delay=8) == 3.0
    # Medium/long chunk -> proportional
    long_text = "A" * 150 # 150 * 0.04 = 6.0s
    assert calculate_typing_delay(long_text, min_delay=3, max_delay=8) == 6.0
    # Extremely long chunk -> should cap at max_delay
    very_long_text = "A" * 500
    assert calculate_typing_delay(very_long_text, min_delay=3, max_delay=8) == 8.0
```

- [ ] **Step 2: Run test to verify failure**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/test_agent_humanization_service.py -v`

- [ ] **Step 3: Implement `send_waha_presence`, `split_text_into_chunks` and organic pipeline in `agent_service.py`**

In `backend/app/services/agent_service.py`:
- Add `send_waha_presence(chat_id: str, presence: str = "composing")`
- Add `split_text_into_chunks(text: str) -> list[str]`
- Add `calculate_typing_delay(text: str, min_delay: int, max_delay: int) -> float`
- Update `process_incoming_lead_message` to iterate over text chunks:
  - If `simulate_typing`: call `await send_waha_presence(chat_id, "composing")`
  - Sleep for `calculate_typing_delay(...)`
  - Send message via `send_waha_message`
  - Save `Message` row to database.

- [ ] **Step 4: Run test to verify pass**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/ -v`

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/agent_service.py backend/tests/test_agent_humanization_service.py
git commit -m "feat(backend): implement WAHA typing presence, text splitter, and dynamic typing delays"
```

---

### Task 3: Frontend Humanization Controls UI

**Files:**
- Modify: `frontend/src/components/agent/AgentForm.tsx`
- Modify: `frontend/src/app/agent/page.tsx`

- [ ] **Step 1: Add Humanization Card to AgentForm.tsx**

Add Card "Humanização e Comportamento Orgânico":
- Switch: "Simular status 'Digitando...' no WhatsApp" (`simulate_typing`)
- Switch: "Dividir respostas em múltiplos balões curtos" (`split_long_messages`)
- Inputs: "Delay Mínimo (segundos)" (`min_typing_delay`), "Delay Máximo (segundos)" (`max_typing_delay`)

- [ ] **Step 2: Verify build**

Run: `npm --prefix frontend run build`

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/agent/AgentForm.tsx frontend/src/app/agent/page.tsx
git commit -m "feat(frontend): add humanization settings controls to Agente de IA form"
```

---

### Task 4: End-to-End Verification & Testing

- [ ] **Step 1: Run pytest backend test suite**
- [ ] **Step 2: Run frontend build verification**
- [ ] **Step 3: Rebuild docker containers (`docker compose up -d --build backend frontend`)**
