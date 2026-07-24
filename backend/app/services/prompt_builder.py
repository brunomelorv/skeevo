def build_system_prompt(
    settings,
    lead_memory: list = None,
    lessons: list = None,
    kanban_columns: list = None,
) -> str:
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

    if not kanban_columns:
        kanban_block = "Nenhuma etapa configurada."
    else:
        formatted_cols = []
        for col in kanban_columns:
            slug = _get_val(col, "slug", "")
            label = _get_val(col, "label", slug)
            goal = (_get_val(col, "goal_description", "") or "").strip()
            goal_text = f": {goal}" if goal else ""
            if slug:
                formatted_cols.append(f"- {label} (slug: \"{slug}\"){goal_text}")
        kanban_block = "\n".join(formatted_cols) if formatted_cols else "Nenhuma etapa configurada."

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

    if not lessons:
        lessons_block = "Ainda não há lições acumuladas de conversas anteriores."
    else:
        positives = []
        negatives = []
        for item in lessons:
            if isinstance(item, dict):
                outcome = item.get("outcome")
                text = (item.get("lesson") or "").strip()
            else:
                outcome = getattr(item, "outcome", None)
                text = (getattr(item, "lesson", "") or "").strip()
            if not text:
                continue
            if outcome == "positivo":
                positives.append(f"- {text}")
            elif outcome == "negativo":
                negatives.append(f"- {text}")

        parts = []
        if positives:
            parts.append("O que costuma funcionar:\n" + "\n".join(positives))
        if negatives:
            parts.append("O que evitar:\n" + "\n".join(negatives))
        lessons_block = "\n\n".join(parts) if parts else "Ainda não há lições acumuladas de conversas anteriores."

    return f"""# Diretrizes do Agente

Agente: {agent_name}
Empresa: {business_name}

<identidade>
{identidade}
</identidade>

<instrucoes>
{instrucoes}
</instrucoes>

<etapas_kanban>
{kanban_block}
</etapas_kanban>

<memoria_do_lead>
{memory_block}
</memoria_do_lead>

<licoes_aprendidas>
{lessons_block}
</licoes_aprendidas>

<exemplos>
{examples_block}
</exemplos>

<contexto>
{contexto}
</contexto>"""



