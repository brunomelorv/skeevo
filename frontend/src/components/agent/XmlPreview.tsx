"use client";

import { useState } from "react";
import { Copy, Check, Code2, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface ExamplePair {
  lead: string;
  reply: string;
}

interface XmlPreviewProps {
  agentName: string;
  businessName: string;
  identidade: string;
  instrucoes: string;
  contexto: string;
  exemplos: ExamplePair[];
}

export function buildSystemPromptText({
  agentName,
  businessName,
  identidade,
  instrucoes,
  contexto,
  exemplos,
}: XmlPreviewProps): string {
  const formattedExamples = (exemplos || [])
    .filter((ex) => (ex.lead && ex.lead.trim()) || (ex.reply && ex.reply.trim()))
    .map(
      (ex, idx) =>
        `Exemplo ${idx + 1}\nLead: ${ex.lead || ""}\n${agentName || "Assistente"}: ${ex.reply || ""}`
    )
    .join("\n\n");

  return `# Diretrizes do Agente

Agente: ${agentName || "Assistente"}
Empresa: ${businessName || "Empresa"}

<identidade>
${identidade || ""}
</identidade>

<instrucoes>
${instrucoes || ""}
</instrucoes>

<exemplos>
${formattedExamples}
</exemplos>

<contexto>
${contexto || ""}
</contexto>`;
}

export default function XmlPreview({
  agentName,
  businessName,
  identidade,
  instrucoes,
  contexto,
  exemplos,
}: XmlPreviewProps) {
  const [copied, setCopied] = useState(false);

  const fullPromptText = buildSystemPromptText({
    agentName,
    businessName,
    identidade,
    instrucoes,
    contexto,
    exemplos,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullPromptText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Erro ao copiar prompt:", err);
    }
  };

  const formattedExamples = (exemplos || []).filter(
    (ex) => (ex.lead && ex.lead.trim()) || (ex.reply && ex.reply.trim())
  );

  return (
    <Card className="h-full flex flex-col shadow-xs border-border bg-card">
      <CardHeader className="pb-3 border-b flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Code2 className="size-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-1.5">
              Visualização do Prompt XML
              <Sparkles className="size-3.5 text-amber-500 animate-pulse" />
            </CardTitle>
            <CardDescription className="text-xs">
              Estrutura formatada enviada à IA a cada atendimento
            </CardDescription>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-1.5 text-xs h-8 border-border hover:bg-accent"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copiar Prompt</span>
            </>
          )}
        </Button>
      </CardHeader>

      <CardContent className="p-4 flex-1 overflow-auto">
        <div className="rounded-lg bg-zinc-950 p-4 text-zinc-100 font-mono text-xs leading-relaxed space-y-4 shadow-inner border border-zinc-800">
          {/* Header block */}
          <div className="border-b border-zinc-800 pb-3">
            <div className="text-amber-400 font-semibold text-sm"># Diretrizes do Agente</div>
            <div className="mt-1 space-y-0.5 text-zinc-300">
              <div>
                <span className="text-zinc-500">Agente: </span>
                <span className="text-emerald-400">{agentName || "Assistente"}</span>
              </div>
              <div>
                <span className="text-zinc-500">Empresa: </span>
                <span className="text-emerald-400">{businessName || "Empresa"}</span>
              </div>
            </div>
          </div>

          {/* Identidade block */}
          <div className="space-y-1">
            <div className="text-sky-400">&lt;identidade&gt;</div>
            <div className="pl-3 text-zinc-300 whitespace-pre-wrap min-h-6">
              {identidade || <span className="text-zinc-600 italic">Defina a identidade do agente...</span>}
            </div>
            <div className="text-sky-400">&lt;/identidade&gt;</div>
          </div>

          {/* Instrucoes block */}
          <div className="space-y-1">
            <div className="text-sky-400">&lt;instrucoes&gt;</div>
            <div className="pl-3 text-zinc-300 whitespace-pre-wrap min-h-6">
              {instrucoes || <span className="text-zinc-600 italic">Defina as instruções de comportamento...</span>}
            </div>
            <div className="text-sky-400">&lt;/instrucoes&gt;</div>
          </div>

          {/* Exemplos block */}
          <div className="space-y-1">
            <div className="text-sky-400">&lt;exemplos&gt;</div>
            <div className="pl-3 text-zinc-300 space-y-3 min-h-6">
              {formattedExamples.length > 0 ? (
                formattedExamples.map((ex, idx) => (
                  <div key={idx} className="bg-zinc-900/80 p-2.5 rounded border border-zinc-800/80 space-y-1">
                    <div className="text-amber-400/90 font-semibold text-[11px]">Exemplo {idx + 1}</div>
                    <div>
                      <span className="text-zinc-500">Lead: </span>
                      <span className="text-zinc-200">{ex.lead || "(vazio)"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">{agentName || "Assistente"}: </span>
                      <span className="text-emerald-300">{ex.reply || "(vazio)"}</span>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-zinc-600 italic">Nenhum exemplo adicionado...</span>
              )}
            </div>
            <div className="text-sky-400">&lt;/exemplos&gt;</div>
          </div>

          {/* Contexto block */}
          <div className="space-y-1">
            <div className="text-sky-400">&lt;contexto&gt;</div>
            <div className="pl-3 text-zinc-300 whitespace-pre-wrap min-h-6">
              {contexto || <span className="text-zinc-600 italic">Defina a base de conhecimento ou contexto...</span>}
            </div>
            <div className="text-sky-400">&lt;/contexto&gt;</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
