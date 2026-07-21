# Design Spec: Suporte Multimodal para o Agente de IA (Áudio via Whisper + Imagens via Vision)

**Data**: 2026-07-20  
**Status**: Aprovado pelo usuário  

---

## 1. Visão Geral
Habilitar a capacidade **multimodal** no Skeevo para que o Agente de IA consiga:
1. **Ouvir e entender áudios de voz** enviados pelos leads no WhatsApp (usando a API OpenAI Whisper `whisper-1`).
2. **Ver e interpretar imagens/documentos em foto** enviados pelos leads (usando os recursos de visão nativos do `gpt-4o-mini`).

---

## 2. Fluxo de Processamento de Mídias

### 2.1 Mensagens de Áudio (Voice Notes / PTT)
1. O webhook do WAHA recebe um evento de mensagem com `hasMedia: true` e tipo de mídia `audio` ou `mimetype: audio/ogg` / `audio/opus`.
2. O backend faz o download dos bytes do áudio no endpoint do WAHA ou URL de mídia (`download_waha_media`).
3. O serviço `audio_service.py` envia os bytes para `AsyncOpenAI.audio.transcriptions.create(model="whisper-1", file=...)`.
4. A transcrição retornada é salva no banco de dados na tabela `messages` com a marcação:  
   `[🎙️ Áudio]: "texto transcrito..."`
5. A mensagem entra no histórico e o Agente de IA gera a resposta normalmente.

### 2.2 Mensagens de Imagem (Fotos / Documentos em Imagem)
1. O webhook do WAHA recebe um evento com `hasMedia: true` e tipo `image` ou `mimetype: image/jpeg` / `image/png`.
2. O backend faz o download dos bytes da imagem e converte para Base64.
3. A mensagem é salva na tabela `messages` com a legenda do usuário (se houver) ou `[📷 Imagem enviada]`.
4. Ao invocar a OpenAI `gpt-4o-mini` em `agent_service.py`, se a mensagem mais recente do lead contiver uma imagem, a chamada envia o bloco multimodal:
   ```json
   {
     "role": "user",
     "content": [
       {"type": "text", "text": "Legenda ou '[📷 Imagem enviada]'"},
       {"type": "image_url", "image_url": {"url": "data:image/jpeg;base64,..."}}
     ]
   }
   ```

---

## 3. Componentes do Backend

- **`app/services/waha_service.py`**:
  - `download_waha_media(media_url_or_path: str) -> bytes`: Utilitário para baixar mídias do WAHA.
- **`app/services/audio_service.py`**:
  - `transcribe_audio(audio_bytes: bytes, api_key: str) -> str`: Realiza a chamada para a OpenAI Whisper API.
- **`app/services/agent_service.py`**:
  - Atualização do pipeline `process_incoming_lead_message` para suportar transcrição de áudio e envio de `image_url` em Base64 para a OpenAI.
- **`app/routes/webhook.py`**:
  - Extração de mídias do payload do WAHA (`mediaUrl`, `_data.mediaKey`, `mimetype`).

---

## 4. Plano de Verificação

### Testes Automatizados
- Teste unitário em `backend/tests/test_multimodal_services.py`:
  - Mock da API OpenAI Whisper: verificar formatação `[🎙️ Áudio]: "..."`.
  - Mock da API OpenAI Vision: verificar montagem do payload multimodal `image_url`.

### Teste Manual
1. Enviar um áudio de voz pelo WhatsApp para o número do bot.
2. Verificar se a mensagem aparece no CRM transcrita como `[🎙️ Áudio]: "..."` e se o robô responde o conteúdo falado.
3. Enviar uma foto no WhatsApp e verificar se o robô descreve/responde o conteúdo da imagem.
