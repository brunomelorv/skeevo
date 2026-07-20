"use client";

import { Bot } from "lucide-react";

export default function AgentPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="size-5" /> Agente de IA
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure as respostas automáticas do seu assistente WhatsApp.
          </p>
        </div>
      </div>
    </div>
  );
}
