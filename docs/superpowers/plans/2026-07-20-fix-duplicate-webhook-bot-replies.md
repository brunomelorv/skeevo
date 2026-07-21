# Fix Duplicate Webhook Bot Replies & Lead PushName Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate AI agent responses and fix lead pushName misassignment by adding payload filtering, lead sender pushName extraction, and database message_id deduplication.

**Architecture:** Update `webhook_waha` route in `backend/app/routes/webhook.py` to extract `push_name` strictly from sender fields (removing fallback to `payload["me"]`), ignore empty-body/system notification payloads, and skip duplicate `message_id` payloads returned by `upsert_lead`.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy, PostgreSQL, pytest.

## Global Constraints
- Extract push_name ONLY from sender fields: `msg.get("_data", {}).get("notifyName") or msg.get("pushName") or msg.get("_data", {}).get("pushName")`. Never fallback to `payload.get("me")`.
- Ignore messages with empty `body` unless `hasMedia` is True.
- Ignore protocol and notification message types (`e2e_notification`, `notification_template`, `protocol`, `ciphertext`, etc.).
- Deduplicate by `message_id`.

---

### Task 1: Message Deduplication in Lead Service

**Files:**
- Modify: `backend/app/services/lead_service.py`
- Modify: `backend/tests/test_agent_service.py`

- [ ] **Step 1: Write test for message deduplication**

Add a test in `backend/tests/test_agent_service.py` verifying that calling `upsert_lead` twice with the same `message_id` returns `(lead, is_new=False)` on the second call.

- [ ] **Step 2: Run pytest to verify failure**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/test_agent_service.py -v`

- [ ] **Step 3: Update `upsert_lead` in `lead_service.py`**

In `backend/app/services/lead_service.py`:
Check if `message_id` exists in `Message` table before creating a new `Message` record:
```python
existing_msg = None
if message_id:
    res_msg = await db.execute(select(Message).where(Message.message_id == message_id))
    existing_msg = res_msg.scalar_one_or_none()

if existing_msg is not None:
    return lead, False
```

- [ ] **Step 4: Run pytest to verify pass**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/test_agent_service.py -v`

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/lead_service.py backend/tests/test_agent_service.py
git commit -m "fix(backend): add message_id deduplication in upsert_lead service"
```

---

### Task 2: Webhook Payload Filtering, Lead pushName Fix & Deduplication Routing

**Files:**
- Modify: `backend/app/routes/webhook.py`
- Create: `backend/tests/test_webhook_filtering.py`

- [ ] **Step 1: Write test for webhook payload filtering and pushName extraction**

Create `backend/tests/test_webhook_filtering.py` testing:
1. `push_name` extraction from sender only (verify `payload["me"]["pushName"]` "Bruno Melo - Automações" is NOT assigned to lead).
2. `body: ""` (empty text) -> returns `{"status": "ignored"}`
3. System notification type `e2e_notification` -> returns `{"status": "ignored"}`
4. Valid chat message "Oi" with `pushName: "Shirley"` -> returns `{"status": "ok"}` and updates lead with "Shirley".
5. Duplicate `message_id` -> returns `{"status": "duplicate_ignored"}`.

- [ ] **Step 2: Run pytest to verify failure**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/test_webhook_filtering.py -v`

- [ ] **Step 3: Update `webhook.py` route**

In `backend/app/routes/webhook.py`:
```python
    # Extract push_name ONLY from sender message object, NEVER from payload["me"]
    push_name = (
        msg.get("_data", {}).get("notifyName")
        or msg.get("pushName")
        or msg.get("_data", {}).get("pushName")
    )

    body = (msg.get("body") or "").strip()
    msg_type = msg.get("type") or msg.get("_data", {}).get("type") or "chat"
    has_media = msg.get("hasMedia", False)

    # Ignore empty messages without media or system/protocol notifications
    ignored_types = {"e2e_notification", "notification_template", "protocol", "ciphertext", "gp2", "revoked"}
    if msg_type in ignored_types:
        return {"status": "ignored"}

    if not body and not has_media:
        return {"status": "ignored"}

    lead, is_new = await upsert_lead(
        db=db,
        phone=phone,
        body=body,
        message_id=msg.get("id", ""),
        chat_id=msg.get("from", ""),
        timestamp=msg.get("timestamp", 0),
        push_name=push_name
    )

    if not is_new:
        return {"status": "duplicate_ignored"}

    await process_incoming_lead_message(db=db, lead_id=lead.id, chat_id=msg.get("from", ""))
    return {"status": "ok"}
```

- [ ] **Step 4: Run pytest to verify pass**

Run: `PYTHONPATH=backend backend/venv/bin/pytest backend/tests/ -v`

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/webhook.py backend/tests/test_webhook_filtering.py
git commit -m "fix(backend): fix lead pushName extraction, empty body and system notification filtering"
```
