import pytest
from app.schemas import (
    AgentSettingsUpdate,
    AgentSettingsRead,
    ExamplePair,
    mask_api_key,
)


def test_mask_api_key():
    assert mask_api_key("sk-proj-1234567890abcdef") == "sk-...cdef"
    assert mask_api_key("sk-short") == "sk-...hort"
    assert mask_api_key("") == ""
    assert mask_api_key(None) == ""


def test_schema_validation():
    update_data = AgentSettingsUpdate(
        is_enabled=True,
        openai_api_key="sk-1234567890123456",
        model="gpt-4o-mini",
        agent_name="Assistente Skeevo",
        business_name="Skeevo Imóveis",
        identidade="Você é um corretor de imóveis",
        instrucoes="Colete nome e email",
        contexto="Imobiliária em SP",
        exemplos=[ExamplePair(lead="Olá", reply="Oi! Como posso ajudar?")],
        max_history_messages=15,
    )
    assert update_data.is_enabled is True
    assert update_data.model == "gpt-4o-mini"
    assert update_data.exemplos[0].lead == "Olá"

    read_data = AgentSettingsRead(
        id=1,
        is_enabled=True,
        openai_api_key_masked="sk-...3456",
        has_api_key=True,
        model="gpt-4o-mini",
        agent_name="Assistente Skeevo",
        business_name="Skeevo Imóveis",
        identidade="Você é um corretor de imóveis",
        instrucoes="Colete nome e email",
        contexto="Imobiliária em SP",
        exemplos=[ExamplePair(lead="Olá", reply="Oi! Como posso ajudar?")],
        max_history_messages=15,
    )
    assert read_data.id == 1
    assert read_data.openai_api_key_masked == "sk-...3456"
    assert read_data.has_api_key is True
