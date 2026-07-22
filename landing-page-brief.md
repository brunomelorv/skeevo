# Landing Page Brief — Skeevo

> Documento de avaliação técnica e estratégica do produto, para embasar a construção da landing page.
> Gerado a partir da análise completa do código-fonte do repositório.

---

## 1. Resumo do Produto

O Skeevo é um sistema que conecta seu WhatsApp a um painel de gestão inteligente. Toda vez que um possível cliente manda mensagem, a IA responde na hora, registra o contato automaticamente e continua fazendo follow-up até você fechar o atendimento. É como ter uma recepcionista virtual 24h que nunca esquece de retornar um lead.

---

## 2. Proposta de Valor Central

**Dor:** Clínicas, consultórios e negócios de serviço recebem dezenas de mensagens no WhatsApp por dia, mas não conseguem responder rápido o suficiente. Leads esfriam em minutos, follow-ups são esquecidos, e agendamentos se perdem.

**Resultado concreto:**

- ⚡ **Resposta em segundos** — a IA responde o lead antes dele ir pro concorrente.
- 🔁 **Follow-up automático** — nenhum lead é esquecido; mensagens de retorno são enviadas no momento certo.
- 📅 **Mais agendamentos fechados** — integração direta com o Google Agenda pra marcar horários sem atrito.
- 📉 **Menos no-show** — com o acompanhamento contínuo, o paciente lembra que tem consulta.
- 🧠 **Zero trabalho manual de triagem** — todo lead entra organizado no pipeline, com status, histórico e dados do WhatsApp.

---

## 3. Funcionalidades Identificadas no Código

| # | Feature técnica | Benefício para a landing page |
|---|---|---|
| 1 | **Agente de IA (OpenAI GPT-4o)** com prompt customizável, identidade, instruções e exemplos de conversa | "A IA fala com a cara do seu negócio. Você define o tom, as respostas e as regras — ela executa 24h." |
| 2 | **Agendamento automático via IA (Function Calling)** — a IA consulta horários livres e marca consultas durante a própria conversa no WhatsApp | "O lead pede um horário, a IA olha sua agenda, oferece opções e confirma o agendamento — tudo no WhatsApp, sem você intervir." |
| 3 | **Simulação de digitação** com delays configuráveis e split de mensagens longas (incluindo marcador `[PAUSA]`) | "Respostas naturais, como se fosse uma pessoa digitando. Ninguém percebe que é automação." |
| 4 | **Transcrição de áudio (Whisper)** — áudios de WhatsApp convertidos em texto para a IA responder | "Seu lead pode mandar áudio, e a IA entende e responde. Zero mensagem ignorada." |
| 5 | **Visão computacional (GPT-4o Vision)** — a IA recebe e interpreta imagens enviadas pelo lead | "O lead manda uma foto do exame, da receita ou do antes/depois — a IA entende e responde com contexto." |
| 6 | **Follow-up automático multi-etapa** com modo texto fixo ou IA contextual, janela de horário comercial, anti-spam com jitter | "Configure uma sequência de mensagens (2h depois, 24h depois, 3 dias depois). A IA envia, respeita horário comercial, e para quando o lead responde." |
| 7 | **Pipeline Kanban visual** com drag-and-drop nativo, colunas customizáveis, cores e editor de colunas com migração guiada | "Veja todos os seus leads num quadro visual: Novo → Em Atendimento → Agendado → Convertido. Arraste e organize." |
| 8 | **Captura automática de leads via webhook** com upsert inteligente, deduplicação por message_id e normalização de telefone (WhatsApp LID) | "Todo lead que manda mensagem já aparece no seu painel. Sem digitar nada, sem copiar número." |
| 9 | **Chat estilo WhatsApp Web integrado** — interface split-view com lista de conversas, balões de chat, busca e mudança de status em tempo real | "Atenda pelo painel como se fosse o WhatsApp Web. Quando quiser assumir, basta digitar. A IA para e você continua." |
| 10 | **Agenda com slots de disponibilidade e integração Google Calendar via OAuth** | "Defina seus horários disponíveis, e o sistema evita choques. Consultas vão direto pro Google Agenda." |
| 11 | **Gerenciamento da sessão WhatsApp via QR Code** com wizard de conexão e polling de status em tempo real | "Conecte seu WhatsApp em 30 segundos escaneando o QR code no painel. Sem instalar nada." |
| 12 | **Cancelamento inteligente de follow-ups** — ao receber resposta do lead, intervenção humana ou mudança de status no kanban | "A IA sabe quando parar. Se o lead respondeu ou você assumiu, ela para de mandar mensagem." |
| 13 | **Log de auditoria completo** com diffs detalhados, filtros por categoria e busca textual | "Histórico completo de tudo que aconteceu: quem mudou o quê, quando, e como era antes." |
| 14 | **Dashboard com métricas e gráficos em tempo real** — cards de KPI, gráfico pizza por status, gráfico de barras (7 dias), barra de pipeline acumulada, auto-refresh a cada 8s | "Abra o painel e veja tudo de um relance: quantos leads chegaram, como estão distribuídos no funil, e a evolução diária." |
| 15 | **Foto de perfil do WhatsApp** puxada automaticamente com fallback para iniciais | "Você vê a foto do lead direto no painel — facilita identificar quem é quem." |
| 16 | **Dark mode / Light mode** com persistência | "Interface moderna com modo escuro. Conforto visual o dia todo." |

---

## 4. Público-Alvo e ICP

### Perfil primário (decisor):
- **Dono(a) de clínica ou consultório** (estética, odontologia, dermatologia, nutrição, psicologia, veterinária)
- **Gestores de clínicas multi-profissionais**
- 30-55 anos, pouco técnico, quer resultado sem complexidade
- Já recebe leads via Instagram Ads / Google Ads que caem no WhatsApp
- Dor principal: **perde leads porque demora pra responder ou esquece de retornar**

### Perfil secundário:
- **Gerente comercial / coordenador de recepção** — quem cuida do operacional
- **Profissional autônomo** que agenda consultas sozinho e não tem tempo de ficar no WhatsApp

### O que essa pessoa mais valoriza:
1. **Velocidade de resposta** — sabe que cada minuto sem responder é lead perdido
2. **Não depender de funcionário** — recepcionista sai, adoece, esquece
3. **Simplicidade** — não quer aprender sistema complexo
4. **Controle** — quer poder ver tudo, intervir quando quiser
5. **Resultado mensurável** — mais agendamentos, menos leads perdidos

---

## 5. Diferenciais Competitivos

| vs. CRM genérico (HubSpot, Pipedrive) | vs. Atendente humano | vs. Chatbot simples (ManyChat, Typebot) |
|---|---|---|
| Nativo em WhatsApp — não é adaptação, é feito pra isso | Não cansa, não esquece, não falta | Usa IA contextual (GPT-4o), não fluxograma rígido |
| IA que responde com linguagem natural, não formulários | Responde em 3 segundos, 24h/dia | Entende áudios (transcrição Whisper) e imagens (Vision) |
| Pipeline Kanban visual (não precisa de planilha) | Segue todas as regras, todos os dias | Simula digitação — parece humano, não bot |
| Follow-up automático inteligente com múltiplas etapas | Custa uma fração de um salário | Follow-ups com IA contextual, não mensagens genéricas |
| Integração direta com Google Agenda | Escala sem contratar | Cancela follow-ups automaticamente quando lead responde |
| Setup em minutos (QR code no painel) | — | Handoff humano nativo (você assume quando quiser) |
| **IA agenda consultas direto na conversa** (function calling) | — | Não tem agendamento integrado |

---

## 6. Objeções Prováveis

| Objeção | Como a LP deve endereçar |
|---|---|
| **"E se a IA falar besteira?"** | Mostrar que o dono configura identidade, instruções, contexto e exemplos de conversa. A IA segue regras definidas por você. Incluir seção "Você tem controle total". Mostrar print da tela de configuração. |
| **"Meus pacientes vão perceber que é robô?"** | Destacar a simulação de digitação, o split de mensagens e a linguagem natural do GPT-4o. Usar headline tipo "Ninguém percebe que não é você". |
| **"É difícil de configurar?"** | Mostrar que basta escanear QR code + definir instruções em texto. Criar seção "Como funciona" com 3 passos visuais. |
| **"Quanto custa?"** | Ter seção de preço clara ou, se ainda não definido, CTA pra "ver planos" / "agendar demo". Evitar esconder preço — público de clínica odeia surpresa. |
| **"E se o WhatsApp bloquear?"** | Mencionar que usa API oficial/estável e que a IA respeita boas práticas de envio (delays, horário comercial, pausa ao receber resposta). |
| **"Já tentei chatbot e não funcionou"** | Diferenciar IA conversacional (GPT-4o) de chatbot de fluxograma. Usar comparação visual. |
| **"E se eu quiser responder manualmente?"** | Mostrar o chat integrado no painel. "Quando você quer assumir, basta digitar. A IA para e você continua." |
| **"Meus dados ficam seguros?"** | Mencionar que o sistema roda no servidor do cliente, dados não vão pra terceiros (se for self-hosted). Se for SaaS, destacar criptografia e política de privacidade. |
| **"Integra com meu sistema atual?"** | Destacar integração com Google Agenda. Para demais integrações, ter campo de "solicitar integração" ou roadmap. |

---

## 7. Sugestão de Estrutura da Landing Page

### 7.1 — Hero Section
**Direção de copy:** "Seus leads mandam mensagem no WhatsApp. Sua IA responde em 3 segundos, faz follow-up e agenda a consulta — tudo no automático."
- Headline focada no resultado (mais agendamentos, menos leads perdidos)
- Sub-headline com clareza: "CRM + IA + WhatsApp pra quem recebe muitos leads e não pode perder nenhum."
- CTA primário: "Testar Grátis" ou "Agendar Demo"
- Elemento visual: mockup do dashboard ou do chat em ação

### 7.2 — Barra de Prova Social / Logos
**Direção:** Números ou logos de clientes. Se não houver ainda, usar métricas do tipo "X leads respondidos em Y segundos" ou depoimento de beta tester.

### 7.3 — Seção "A Dor"
**Direção:** "Você investe em anúncio, o lead manda mensagem, mas ninguém responde a tempo. O lead foi pro concorrente."
- Listar cenários: recepcionista ocupada, fora do horário, lead esquecido, follow-up nunca feito
- Visual: timeline mostrando lead esfriando

### 7.4 — Seção "Como Funciona" (3 passos)
**Direção:**
1. **Conecte** — "Escaneie o QR code e seu WhatsApp está no Skeevo em 30 segundos."
2. **Configure** — "Diga quem é sua empresa, o tom da conversa e as regras. Pronto."
3. **Receba e converta** — "Cada lead é respondido, acompanhado e organizado automaticamente."

### 7.5 — Seção de Features (com ícones)
**Direção:** 6 blocos visuais, cada um com ícone, título curto e 1 frase:
- 🤖 IA que responde como você
- 🔁 Follow-up automático inteligente
- 📋 Pipeline visual (Kanban)
- 📅 Agenda integrada com Google
- 💬 Chat direto no painel
- 🎙️ Entende áudios do WhatsApp

### 7.6 — Seção "Antes vs. Depois" ou Comparativo
**Direção:** Tabela ou visual comparando "Sem Skeevo" vs. "Com Skeevo":
- Tempo de resposta: 2h → 3 segundos
- Follow-ups feitos: 20% → 100%
- Leads organizados: planilha → pipeline visual
- Agendamentos: manual → automático

### 7.7 — Seção de Depoimentos / Cases
**Direção:** 2-3 depoimentos com foto, nome, cargo e resultado. Se não houver, usar "Resultados dos primeiros usuários" com métricas anônimas.

### 7.8 — Seção "Você tem controle total"
**Direção:** Mostrar que a IA não é caixa-preta. Prints do painel de configuração, do chat manual, dos logs de auditoria. "Veja tudo, mude tudo, assuma quando quiser."

### 7.9 — Seção de Preço
**Direção:** Planos claros com comparativo de features. Se há freemium, destacar. CTA em cada plano. Sem surpresas — transparência é essencial para o ICP.

### 7.10 — FAQ
**Direção:** 6-8 perguntas que espelham as objeções da seção 6. Tom direto, respostas curtas.

### 7.11 — CTA Final
**Direção:** "Não perca mais nenhum lead. Comece agora." com botão grande e campo de WhatsApp/email para cadastro.

---

## 8. Gaps de Informação

Os itens abaixo **precisam ser definidos antes de escrever a copy final**:

| # | Gap | Por que é necessário |
|---|---|---|
| 1 | **Modelo de precificação** — planos, preço, freemium? | Sem isso, não dá pra criar a seção de preço nem calibrar a CTA ("testar grátis" vs. "agendar demo") |
| 2 | **Cases de clientes reais / beta testers** — nomes, números, depoimentos | Prova social é o #1 fator de conversão pra esse público. Sem isso, a LP perde muita força. |
| 3 | **Métricas reais de performance** — tempo médio de resposta, taxa de conversão, taxa de agendamento | Dados concretos para headlines e comparativos. "97% dos leads respondidos em menos de 5 segundos" é muito mais forte que "resposta rápida". |
| 4 | **Modelo de deploy** — SaaS na nuvem ou self-hosted? | Afeta o discurso de segurança de dados, o onboarding e o pricing. |
| 5 | **Nome final do produto e domínio** — "Skeevo" é definitivo? | Para consistência de marca na LP. |
| 6 | **Assets de marca** — logo vetorizado, paleta de cores, tipografia | Para construir a LP com identidade visual consistente. |
| 7 | **Público inicial foco** — clínicas de estética? Odontologia? Todos? | O copy muda muito dependendo da vertical. "Dono de clínica" é diferente de "dono de academia". Quanto mais específico, mais converte. |
| 8 | **Regulamentação / compliance** — LGPD, termos de uso, política de privacidade | Necessário para footer e para endereçar objeção de segurança. |
| 9 | **Limite de mensagens / leads por plano** | Afeta diretamente a comunicação de preço e o sizing do público. |
| 10 | **Roadmap de features futuro** — multi-atendente, relatórios avançados, integrações com Hotmart/RD Station etc. | Pode ser usado como "Em breve" para engajar leads que precisam dessas features. |
| 11 | **Fluxo de onboarding atual** — quantos passos até o primeiro lead respondido? | Para validar a promessa de "começa em X minutos" na LP. |
| 12 | **Capturas de tela / vídeo do produto em uso** | Fundamentais para as seções de features e "como funciona". Screenshots reais convertem muito mais que mockups. |

---

> **Próximo passo:** definir os gaps acima e produzir os wireframes + copy da LP.
