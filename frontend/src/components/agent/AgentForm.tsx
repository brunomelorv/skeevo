"use client";

import React from "react";
import {
  Bot,
  Building2,
  User,
  Cpu,
  Plus,
  Trash2,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  MessageSquare,
  BookOpen,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface ExamplePair {
  lead: string;
  reply: string;
}

export interface AgentSettingsData {
  id?: number;
  is_enabled: boolean;
  model: string;
  agent_name: string;
  business_name: string;
  identidade: string;
  instrucoes: string;
  contexto: string;
  exemplos: ExamplePair[];
  max_history_messages?: number;
  openai_api_key?: string;
  openai_api_key_masked?: string;
  has_api_key?: boolean;
  simulate_typing?: boolean;
  split_long_messages?: boolean;
  min_typing_delay?: number;
  max_typing_delay?: number;
}

interface AgentFormProps {
  settings: AgentSettingsData;
  onChange: <K extends keyof AgentSettingsData>(field: K, value: AgentSettingsData[K]) => void;
  onSave: () => void;
  isSaving: boolean;
  saveStatus: { type: "success" | "error" | null; message: string };
}

export default function AgentForm({
  settings,
  onChange,
  onSave,
  isSaving,
  saveStatus,
}: AgentFormProps) {
  const handleAddExample = () => {
    const newExemplos = [...(settings.exemplos || []), { lead: "", reply: "" }];
    onChange("exemplos", newExemplos);
  };

  const handleRemoveExample = (index: number) => {
    const newExemplos = (settings.exemplos || []).filter((_, i) => i !== index);
    onChange("exemplos", newExemplos);
  };

  const handleExampleChange = (index: number, key: "lead" | "reply", value: string) => {
    const newExemplos = (settings.exemplos || []).map((ex, i) => {
      if (i === index) {
        return { ...ex, [key]: value };
      }
      return ex;
    });
    onChange("exemplos", newExemplos);
  };

  return (
    <div className="space-y-6">
      {/* Status feedback banner */}
      {saveStatus.type && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-lg border text-sm transition-all ${
            saveStatus.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-800 dark:text-red-300"
          }`}
        >
          {saveStatus.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{saveStatus.message}</span>
        </div>
      )}

      {/* Main Settings Card */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot className="size-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold">Configurações Gerais do Agente</CardTitle>
                <CardDescription className="text-xs">
                  Ajuste o modelo e o comportamento do atendimento automatizado
                </CardDescription>
              </div>
            </div>

            {/* Toggle Switch: Ativar Atendimento Automático */}
            <div className="flex items-center gap-3 bg-muted/50 p-2.5 rounded-lg border border-border">
              <span className="text-xs font-medium">Atendimento Automático</span>
              <button
                type="button"
                role="switch"
                aria-checked={settings.is_enabled}
                onClick={() => onChange("is_enabled", !settings.is_enabled)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  settings.is_enabled ? "bg-emerald-600" : "bg-zinc-400 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    settings.is_enabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-5">
          {/* Row 1: Model select, Agent name, Business name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Modelo LLM */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Cpu className="size-3.5" /> Modelo IA
              </label>
              <select
                value={settings.model}
                onChange={(e) => onChange("model", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-900"
              >
                <option value="gpt-4o-mini">gpt-4o-mini (Rápido & Econômico)</option>
                <option value="gpt-4o">gpt-4o (Alta Precisão)</option>
                <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legado)</option>
              </select>
            </div>

            {/* Nome do Agente */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <User className="size-3.5" /> Nome do Agente
              </label>
              <Input
                type="text"
                value={settings.agent_name}
                onChange={(e) => onChange("agent_name", e.target.value)}
                placeholder="Ex: Assistente, Pedro, Ana"
                className="h-9 text-sm"
              />
            </div>

            {/* Nome da Empresa */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Building2 className="size-3.5" /> Nome da Empresa
              </label>
              <Input
                type="text"
                value={settings.business_name}
                onChange={(e) => onChange("business_name", e.target.value)}
                placeholder="Ex: Skeevo CRM, Barbearia Silva"
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Textarea 1: Identidade */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <User className="size-3.5 text-sky-500" /> Identidade do Agente
            </label>
            <textarea
              rows={3}
              value={settings.identidade}
              onChange={(e) => onChange("identidade", e.target.value)}
              placeholder="Quem é o agente? Qual o tom de voz? Ex: Você é a Ana, assistente virtual simpática e direta da Barbearia Silva..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-900"
            />
          </div>

          {/* Textarea 2: Instruções */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <FileText className="size-3.5 text-emerald-500" /> Instruções de Atendimento
            </label>
            <textarea
              rows={4}
              value={settings.instrucoes}
              onChange={(e) => onChange("instrucoes", e.target.value)}
              placeholder="Regras e passos a seguir. Ex: 1. Qualifique o cliente perguntando o nome; 2. Envie o link de agendamento; 3. Nunca prometa descontos sem autorização..."
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-900"
            />
          </div>

          {/* Textarea 3: Contexto / Base de Conhecimento */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
              <BookOpen className="size-3.5 text-amber-500" /> Contexto & Informações da Empresa
            </label>
            <textarea
              rows={4}
              value={settings.contexto}
              onChange={(e) => onChange("contexto", e.target.value)}
              placeholder="Informações sobre produtos, preços, horários de atendimento, perguntas frequentes (FAQ)..."
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-900"
            />
          </div>

          {/* Dynamic Exemplos Editor */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <MessageSquare className="size-3.5 text-purple-500" /> Exemplos de Diálogo (Few-Shot Prompting)
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Adicione exemplos de mensagens de clientes e como o agente deve responder.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExample}
                className="gap-1 text-xs h-8"
              >
                <Plus className="size-3.5" /> Adicionar Exemplo
              </Button>
            </div>

            {settings.exemplos && settings.exemplos.length > 0 ? (
              <div className="space-y-3">
                {settings.exemplos.map((ex, index) => (
                  <Card key={index} className="bg-muted/30 border-border p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-[11px] font-medium bg-background">
                        Exemplo {index + 1}
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveExample(index)}
                        className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1 px-2"
                      >
                        <Trash2 className="size-3.5" /> Remover
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Mensagem do Lead (Cliente):
                        </label>
                        <textarea
                          rows={2}
                          value={ex.lead}
                          onChange={(e) => handleExampleChange(index, "lead", e.target.value)}
                          placeholder="Ex: Qual o valor do corte de cabelo?"
                          className="flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Resposta Esperada do {settings.agent_name || "Agente"}:
                        </label>
                        <textarea
                          rows={2}
                          value={ex.reply}
                          onChange={(e) => handleExampleChange(index, "reply", e.target.value)}
                          placeholder="Ex: Olá! O corte masculino tradicional é R$ 45,00. Gostaria de agendar um horário?"
                          className="flex w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:bg-zinc-900"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 rounded-lg border border-dashed text-xs text-muted-foreground">
                Nenhum exemplo cadastrado. Adicione exemplos para guiar o estilo de resposta da IA.
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="border-t pt-4 flex justify-end">
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="gap-2 font-medium"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Humanization Card */}
      <Card className="shadow-xs border-border">
        <CardHeader className="pb-4 border-b">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Sparkles className="size-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Humanização e Comportamento Orgânico
              </CardTitle>
              <CardDescription className="text-xs">
                Simule comportamento humano natural com atrasos de digitação e envio fracionado
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Switch 1: simulate_typing */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label className="text-sm font-medium leading-none cursor-pointer">
                Simular status &quot;Digitando...&quot; no WhatsApp
              </label>
              <p className="text-xs text-muted-foreground">
                Exibe a notificação de digitação no aplicativo do lead antes de entregar a mensagem.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.simulate_typing ?? true}
              onClick={() =>
                onChange("simulate_typing", !(settings.simulate_typing ?? true))
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                (settings.simulate_typing ?? true)
                  ? "bg-emerald-600"
                  : "bg-zinc-400 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  (settings.simulate_typing ?? true)
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Switch 2: split_long_messages */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <label className="text-sm font-medium leading-none cursor-pointer">
                Dividir respostas longas em múltiplos balões
              </label>
              <p className="text-xs text-muted-foreground">
                Quebra parágrafos da resposta em mensagens curtas enviadas em sequência.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.split_long_messages ?? true}
              onClick={() =>
                onChange(
                  "split_long_messages",
                  !(settings.split_long_messages ?? true)
                )
              }
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                (settings.split_long_messages ?? true)
                  ? "bg-emerald-600"
                  : "bg-zinc-400 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  (settings.split_long_messages ?? true)
                    ? "translate-x-5"
                    : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Number Inputs: min_typing_delay & max_typing_delay */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border/60">
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5 text-blue-500" />
                Delay Mínimo de Digitação (segundos)
              </label>
              <Input
                type="number"
                min={1}
                max={30}
                value={settings.min_typing_delay ?? 3}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChange("min_typing_delay", isNaN(val) ? 1 : Math.max(1, Math.min(30, val)));
                }}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center gap-1.5 text-muted-foreground">
                <Clock className="size-3.5 text-indigo-500" />
                Delay Máximo de Digitação (segundos)
              </label>
              <Input
                type="number"
                min={1}
                max={60}
                value={settings.max_typing_delay ?? 8}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onChange("max_typing_delay", isNaN(val) ? 1 : Math.max(1, Math.min(60, val)));
                }}
                className="h-9 text-sm"
              />
            </div>
          </div>
        </CardContent>

        <CardFooter className="border-t pt-4 flex justify-end">
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="gap-2 font-medium"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="size-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
