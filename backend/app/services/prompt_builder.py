def build_system_prompt(settings) -> str:
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

    return f"""# Diretrizes do Agente

Agente: {agent_name}
Empresa: {business_name}

<identidade>
{identidade}
</identidade>

<instrucoes>
{instrucoes}
</instrucoes>

<exemplos>
{examples_block}
</exemplos>

<contexto>
{contexto}
</contexto>"""
