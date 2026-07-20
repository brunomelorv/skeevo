from app.schemas import AgentSettingsBase, ExamplePair
from app.services.prompt_builder import build_system_prompt


def test_build_system_prompt():
    settings = AgentSettingsBase(
        agent_name="Sofia",
        business_name="Imobiliária Top",
        identidade="Você é uma corretora experiente.",
        instrucoes="Seja gentil e atenciosa.",
        contexto="Temos apartamentos no centro.",
        exemplos=[ExamplePair(lead="Valores?", reply="A partir de R$ 300k.")],
    )
    prompt = build_system_prompt(settings)
    assert "# Diretrizes do Agente" in prompt
    assert "<identidade>" in prompt
    assert "Você é uma corretora experiente." in prompt
    assert "<instrucoes>" in prompt
    assert "Seja gentil e atenciosa." in prompt
    assert "<exemplos>" in prompt
    assert "Lead: Valores?" in prompt
    assert "Sofia: A partir de R$ 300k." in prompt
    assert "<contexto>" in prompt


def test_build_system_prompt_dict():
    settings_dict = {
        "agent_name": "Assistente",
        "business_name": "Empresa",
        "identidade": "Id",
        "instrucoes": "Inst",
        "contexto": "Ctx",
        "exemplos": [{"lead": "Oi", "reply": "Olá"}],
    }
    prompt = build_system_prompt(settings_dict)
    assert "# Diretrizes do Agente" in prompt
    assert "<identidade>" in prompt
    assert "Lead: Oi" in prompt
    assert "Assistente: Olá" in prompt
