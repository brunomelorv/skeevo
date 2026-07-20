import pytest
from app.schemas import AgentSettingsUpdate, AgentSettingsRead


def test_agent_humanization_defaults():
    update_data = AgentSettingsUpdate()
    assert update_data.simulate_typing is True
    assert update_data.split_long_messages is True
    assert update_data.min_typing_delay == 3
    assert update_data.max_typing_delay == 8

    read_data = AgentSettingsRead(id=1)
    assert read_data.simulate_typing is True
    assert read_data.split_long_messages is True
    assert read_data.min_typing_delay == 3
    assert read_data.max_typing_delay == 8


def test_agent_humanization_custom_values():
    update_data = AgentSettingsUpdate(
        simulate_typing=False,
        split_long_messages=False,
        min_typing_delay=5,
        max_typing_delay=12,
    )
    assert update_data.simulate_typing is False
    assert update_data.split_long_messages is False
    assert update_data.min_typing_delay == 5
    assert update_data.max_typing_delay == 12

    read_data = AgentSettingsRead(
        id=1,
        simulate_typing=False,
        split_long_messages=False,
        min_typing_delay=5,
        max_typing_delay=12,
    )
    assert read_data.simulate_typing is False
    assert read_data.split_long_messages is False
    assert read_data.min_typing_delay == 5
    assert read_data.max_typing_delay == 12
