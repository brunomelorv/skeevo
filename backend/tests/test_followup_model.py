import pytest
from datetime import datetime
from app.schemas import (
    FollowupStepSchema,
    FollowupConfigBase,
    FollowupConfigRead,
    FollowupConfigUpdate,
    LeadFollowupRead,
)
from app.models import FollowupConfig, FollowupStep, LeadFollowup


def test_followup_config_schema_defaults():
    config = FollowupConfigUpdate()
    assert config.is_enabled is False
    assert config.target_statuses == ["novo", "em_atendimento"]
    assert config.window_start == "08:00"
    assert config.window_end == "20:00"
    assert config.min_interval_minutes == 4
    assert config.steps == []


def test_followup_step_schema():
    step = FollowupStepSchema(step_number=1, delay_hours=24, content="Olá, tudo bem?")
    assert step.step_number == 1
    assert step.delay_hours == 24
    assert step.mode == "text"
    assert step.content == "Olá, tudo bem?"


def test_followup_config_read_schema():
    read = FollowupConfigRead(
        id=1,
        is_enabled=True,
        target_statuses=["novo"],
        window_start="09:00",
        window_end="18:00",
        min_interval_minutes=5,
        steps=[FollowupStepSchema(id=1, step_number=1, delay_hours=2, content="Test")],
    )
    assert read.id == 1
    assert read.is_enabled is True
    assert read.target_statuses == ["novo"]
    assert len(read.steps) == 1


def test_lead_followup_read_schema():
    lead_followup = LeadFollowupRead(
        id=1,
        lead_id=10,
        step_id=1,
        step_number=1,
        scheduled_at=datetime(2026, 7, 20, 10, 0, 0),
        status="scheduled",
    )
    assert lead_followup.id == 1
    assert lead_followup.lead_id == 10
    assert lead_followup.status == "scheduled"
