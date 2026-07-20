"use client";

import { useEffect, useState } from "react";
import { Bot, Loader2, Sparkles } from "lucide-react";
import ApiKeyCard from "@/components/agent/ApiKeyCard";
import AgentForm, { AgentSettingsData } from "@/components/agent/AgentForm";
import XmlPreview from "@/components/agent/XmlPreview";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function AgentPage() {
  const [settings, setSettings] = useState<AgentSettingsData>({
    is_enabled: false,
    model: "gpt-4o-mini",
    agent_name: "Assistente",
    business_name: "Empresa",
    identidade: "",
    instrucoes: "",
    contexto: "",
    exemplos: [],
    openai_api_key: "",
    openai_api_key_masked: "",
    has_api_key: false,
    simulate_typing: true,
    split_long_messages: true,
    min_typing_delay: 3,
    max_typing_delay: 8,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  useEffect(() => {
    async function fetchSettings() {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/agent/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings((prev) => ({
            ...prev,
            ...data,
            openai_api_key: "", // Keep input blank for security, server provides masked
          }));
        } else {
          // Try relative fallback
          const fallbackRes = await fetch("/api/agent/settings");
          if (fallbackRes.ok) {
            const data = await fallbackRes.json();
            setSettings((prev) => ({
              ...prev,
              ...data,
              openai_api_key: "",
            }));
          }
        }
      } catch (err) {
        console.warn("Não foi possível carregar as configurações do agente:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleChangeSetting = <K extends keyof AgentSettingsData>(
    field: K,
    value: AgentSettingsData[K]
  ) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus({ type: null, message: "" });

    try {
      const payload: Record<string, any> = {
        is_enabled: settings.is_enabled,
        model: settings.model,
        agent_name: settings.agent_name,
        business_name: settings.business_name,
        identidade: settings.identidade,
        instrucoes: settings.instrucoes,
        contexto: settings.contexto,
        exemplos: settings.exemplos || [],
        simulate_typing: settings.simulate_typing ?? true,
        split_long_messages: settings.split_long_messages ?? true,
        min_typing_delay: settings.min_typing_delay ?? 3,
        max_typing_delay: settings.max_typing_delay ?? 8,
      };

      if (settings.openai_api_key && settings.openai_api_key.trim()) {
        payload.openai_api_key = settings.openai_api_key.trim();
      }

      let res = await fetch(`${API_BASE}/api/agent/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Fallback relative route
        res = await fetch("/api/agent/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        throw new Error(`Erro ao salvar configurações (${res.status})`);
      }

      const updatedData = await res.json();
      setSettings((prev) => ({
        ...prev,
        ...updatedData,
        openai_api_key: "",
      }));

      setSaveStatus({
        type: "success",
        message: "Configurações do agente salvas com sucesso!",
      });

      setTimeout(() => {
        setSaveStatus({ type: null, message: "" });
      }, 4000);
    } catch (err: any) {
      setSaveStatus({
        type: "error",
        message: err.message || "Falha ao salvar as configurações.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-sm font-medium">Carregando configurações do Agente...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <Bot className="size-7 text-primary" /> Agente de IA
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure a personalidade, instrução e exemplos de atendimento do seu assistente WhatsApp.
          </p>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: ApiKeyCard + AgentForm */}
        <div className="lg:col-span-7 space-y-6">
          <ApiKeyCard
            apiKey={settings.openai_api_key || ""}
            onChangeApiKey={(val) => handleChangeSetting("openai_api_key", val)}
            hasApiKey={!!settings.has_api_key}
            apiKeyMasked={settings.openai_api_key_masked || ""}
          />

          <AgentForm
            settings={settings}
            onChange={handleChangeSetting}
            onSave={handleSave}
            isSaving={isSaving}
            saveStatus={saveStatus}
          />
        </div>

        {/* Right Column: Live XML Preview */}
        <div className="lg:col-span-5">
          <div className="sticky top-6">
            <XmlPreview
              agentName={settings.agent_name}
              businessName={settings.business_name}
              identidade={settings.identidade}
              instrucoes={settings.instrucoes}
              contexto={settings.contexto}
              exemplos={settings.exemplos}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
