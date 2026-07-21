# Design Spec: Humanização Orgânica do Agente de IA (Presença WAHA, Delay de Digitação e Splitter)

**Data**: 2026-07-20  
**Status**: Aprovado pelo usuário  

---

## 1. Visão Geral
Implementar o módulo de **Humanização Orgânica** no Skeevo para tornar as interações do Agente de IA e dos Follow-ups indiscutivelmente naturais e parecidas com o comportamento de um atendente humano no WhatsApp.

### Recursos Principais:
1. **Indicador de Presença "Digitando..." (`composing`)**: Integração com o endpoint `POST /api/presence` do WAHA para exibir a notificação de digitação no WhatsApp do lead antes do envio da mensagem.
2. **Delay Dinâmico de Digitação (Typing Delay)**: Pausa proporcional ao tamanho da frase (limitada aos valores mínimo e máximo definidos pelo usuário).
3. **Divisão de Respostas em Múltiplos Balões (Message Splitting)**: Quebra automática de parágrafos extensos da IA em mensagens curtas sequenciais, aplicando a simulação de digitação entre cada balão.
4. **Controles na Interface (Aba Agente de IA)**: Card de configurações de humanização contendo toggles de ativação e ajuste dos tempos de digitação.

---

## 2. Modelo de Dados (PostgreSQL)

### Alterações na tabela `agent_settings`:

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `simulate_typing` | `BOOLEAN` | Ativa/Desativa o envio do status "digitando..." (Padrão: `True`) |
| `split_long_messages` | `BOOLEAN` | Ativa/Desativa a quebra em múltiplos balões (Padrão: `True`) |
| `min_typing_delay` | `INTEGER` | Tempo mínimo de digitação em segundos (Padrão: 3) |
| `max_typing_delay` | `INTEGER` | Tempo máximo de digitação em segundos (Padrão: 8) |

---

## 3. Backend (FastAPI + WAHA Presence API + Agent Service)

### 3.1 Função de Presença WAHA (`app/services/agent_service.py`)
```python
async def send_waha_presence(chat_id: str, presence: str = "composing"):
    waha_url = app_settings.WAHA_API_URL.rstrip('/')
    async with httpx.AsyncClient() as client:
        payload = {
            "session": "default",
            "chatId": chat_id,
            "presence": presence
        }
        try:
            await client.post(f"{waha_url}/api/presence", json=payload, timeout=5.0)
        except Exception as e:
            logger.warning(f"Failed to send WAHA presence: {e}")
```

### 3.2 Motor de Divisão e Envio Sequencial (`split_and_send_messages`)
Algoritmo que processa o texto retornado pela OpenAI ou régua:
1. Se `split_long_messages == True`, divide o texto por quebras duplas de linha (`\n\n`) ou marcador `[PAUSA]`. Parágrafos com menos de 10 caracteres são aglutinados com o parágrafo posterior.
2. Para cada bloco de mensagem:
   - Se `simulate_typing == True`, dispara `send_waha_presence(chat_id, "composing")`.
   - Calcula o delay: `delay = min(max(len(block) * 0.04, min_typing_delay), max_typing_delay)`.
   - Executa `await asyncio.sleep(delay)`.
   - Dispara a mensagem via `send_waha_message(chat_id, block)`.
   - Grava o registro da mensagem no banco de dados (`messages`).

---

## 4. Frontend (Next.js + Tailwind CSS)

### Alterações na Tela do Agente de IA (`src/components/agent/AgentForm.tsx`)
Inclusão do Card **"Humanização e Comportamento Orgânico"**:
- **Switch 1**: *Simular digitação no WhatsApp ("digitando...")* (`simulate_typing`)
- **Switch 2**: *Dividir respostas em mensagens curtas* (`split_long_messages`)
- **Input Mínimo**: *Delay mínimo de digitação (segundos)* (`min_typing_delay`)
- **Input Máximo**: *Delay máximo de digitação (segundos)* (`max_typing_delay`)

---

## 5. Plano de Verificação

### Testes Automatizados
- Teste unitário em `backend/tests/test_agent_humanization.py`:
  - Testar a função de divisão de parágrafos (`split_text_into_chunks`).
  - Testar a chamada de envio de presença `send_waha_presence`.
  - Testar o cálculo de delay proporcional com limites mín/máx.

### Teste Manual
1. Acessar `http://localhost:3000/agent`, ativar "Simular Digitação", ajustar o delay (ex: 3 a 6s) e salvar.
2. Enviar mensagem para o robô no WhatsApp.
3. Observar na tela do celular o aparecimento da notificação *"digitando..."* durante alguns segundos antes de cada mensagem chegar em balões separados.
