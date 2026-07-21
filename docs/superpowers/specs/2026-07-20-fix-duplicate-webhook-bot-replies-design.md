# Design Spec: Prevenção de Respostas Duplicadas, Filtragem de Webhook e Correção de PushName do Lead

**Data**: 2026-07-20  
**Status**: Investigado e Aprovado pelo Usuário  

---

## 1. Descrição do Problema

### Problema 1: Respostas Triplicadas do Bot
Quando um novo contato inicia uma conversa no WhatsApp ou abre o chat do bot pela primeira vez, o WhatsApp dispara eventos de notificação do sistema (ex: criptografia ponta a ponta, notificação de contato não salvo, trocas de chaves de segurança). 
O WAHA converte esses eventos em webhooks do tipo `event == "message"`. Como o payload desses eventos possui o texto do corpo da mensagem vazio (`body == ""`) ou tipo de mensagem de sistema (`_data.type` ou `type` diferente de `"chat"`), o backend FastAPI atualmente:
1. Processava payloads com corpo vazio ou mensagens que não são texto de chat.
2. Não verificava a duplicidade do `message_id` recebido no banco de dados.
3. Como resultado, o `process_incoming_lead_message` era acionado 3 vezes para uma única mensagem ("Oi"), fazendo o bot enviar 3 respostas consecutivas.

### Problema 2: Nome do Lead Sobrescrito pelo Nome da Conta do Bot
No arquivo `webhook.py`, a extração do nome do lead fazia um fallback incorreto para `payload.get("me", {}).get("pushName")`.
Como `payload["me"]` é a própria conta do WhatsApp do robô ("Bruno Melo - Automações"), quando o campo `notifyName` não vinha preenchido no payload da mensagem, o sistema atribuía o nome da conta do robô ao lead em vez de buscar o `pushName` da mensagem do contato ou deixar `None`.

---

## 2. Causas Raiz Identificadas

1. **Falta de Validação do Conteúdo do Corpo (`body`) e Tipo da Mensagem**:
   - `webhook.py` aceitava qualquer evento com `event == "message"` e `fromMe == False`, mesmo quando `body.strip() == ""` ou tipo de notificação interna.
2. **Ausência de Desduplicação por `message_id`**:
   - O serviço `upsert_lead` não verificava se já existia um registro na tabela `messages` com o mesmo `message_id`. Retentativas do webhook ou mensagens idênticas gravavam múltiplos registros e acionavam a IA repetidamente.
3. **Fallback Incorreto no Nome do Lead (`push_name`)**:
   - `payload.get("me", {}).get("pushName")` pega a identidade do robô. A extração correta deve buscar apenas nos dados do remetente (`msg.get("_data", {}).get("notifyName") or msg.get("pushName") or msg.get("_data", {}).get("pushName")`).

---

## 3. Mudanças Propostas

### 3.1 Filtro e Correção do `push_name` no Webhook (`app/routes/webhook.py`)
No endpoint `POST /webhook/waha`:
1. Ignorar mensagens cujo `event != "message"` ou `fromMe == True`.
2. Extrair o `push_name` exclusivo do remetente:
   `push_name = msg.get("_data", {}).get("notifyName") or msg.get("pushName") or msg.get("_data", {}).get("pushName")` (nunca usar `payload["me"]`).
3. Verificar se o corpo da mensagem `body` está vazio após `strip()` (e não possui mídia). Se `body.strip() == ""` e `hasMedia == False`, ignorar o evento (`status: ignored`).
4. Verificar se o tipo da mensagem (ex: `msg.get("_data", {}).get("type")` ou `msg.get("type")`) é um tipo suportado de conversa (ou `chat`/`location`/`vcard`/`media`) e ignorar notificações de protocolo de sistema (`e2e_notification`, `notification_template`, `protocol`, etc.).

### 3.2 Desduplicação no Banco (`app/services/lead_service.py`)
No serviço `upsert_lead`:
1. Antes de inserir a nova mensagem no banco, consultar se já existe uma mensagem cadastrada com o mesmo `message_id` (`select(Message).where(Message.message_id == message_id)`).
2. Se o `message_id` já existir, não inserir novamente e retornar `(lead, False)` indicando que a mensagem é duplicada.
3. Apenas chamar `process_incoming_lead_message` se `is_new_message == True`.

---

## 4. Plano de Verificação

### Testes Automatizados
- Teste unitário em `backend/tests/test_webhook_filtering.py`:
  - Enviar payload de notificação sem corpo (`body: ""`) -> Verificar resposta `status: ignored`.
  - Enviar payload sem `notifyName` em `_data` -> Verificar que não salva o nome do bot.
  - Enviar mensagem duplicada (`message_id` já cadastrado) -> Verificar que `process_incoming_lead_message` não é chamado duas vezes.
  - Enviar mensagem válida de chat ("Oi") com `pushName: "Shirley"` -> Verificar que salva o nome correto e processa 1 única vez.

### Teste Manual
- Simular webhook via `curl` enviando evento com `body: ""` e verificar retorno `ignored`.
- Simular envio do mesmo `message_id` 2 vezes e confirmar que apenas 1 mensagem do assistente é gerada.
