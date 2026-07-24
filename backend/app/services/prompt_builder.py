def build_system_prompt(settings, lead_memory: list = None) -> str:
    def _get_val(obj, key, default=""):
        if isinstance(obj, dict):
            val = obj.get(key, default)
        else:
            val = getattr(obj, key, default)
        return val if val is not None else default

    agent_name = _get_val(settings, 'agent_name', 'Assistente') or 'Assistente'
    business_name = _get_val(settings, 'business_name', 'Empresa') or 'Empresa'
    identidade = _get_val(settings, 'identidade', '')
    instrucoes = _get_val(settings, 'instrucoes', '')
    contexto = _get_val(settings, 'contexto', '')
    exemplos_raw = _get_val(settings, 'exemplos', []) or []

    formatted_examples = []
    for idx, ex in enumerate(exemplos_raw):
        lead_msg = _get_val(ex, 'lead', '')
        reply_msg = _get_val(ex, 'reply', '')
        if lead_msg or reply_msg:
            formatted_examples.append(f"Exemplo {idx + 1}\nLead: {lead_msg}\n{agent_name}: {reply_msg}")

    examples_block = "\n\n".join(formatted_examples)

    if not lead_memory:
        memory_block = "Nenhum fato registrado ainda sobre este lead — é a base zerada."
    else:
        formatted_facts = []
        for item in lead_memory:
            if isinstance(item, dict):
                fact_str = (item.get("fact") or "").strip()
            else:
                fact_str = str(item).strip()
            if fact_str:
                formatted_facts.append(f"- {fact_str}")
        memory_block = "\n".join(formatted_facts) if formatted_facts else "Nenhum fato registrado ainda sobre este lead — é a base zerada."

    return f"""# Diretrizes do Agente

Agente: {agent_name}
Empresa: {business_name}

<identidade>
{identidade}
</identidade>

<instrucoes>
{instrucoes}
</instrucoes>

<memoria_do_lead>
{memory_block}
</memoria_do_lead>

<exemplos>
{examples_block}
</exemplos>

<contexto>
{contexto}
</contexto>"""

