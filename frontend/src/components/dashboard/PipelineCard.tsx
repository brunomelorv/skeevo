"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { KanbanColumn } from "@/hooks/useKanbanColumns";

interface PipelineCardProps {
  leads: Array<{ status: string }>;
  columns?: KanbanColumn[];
}

export default function PipelineCard({ leads, columns = [] }: PipelineCardProps) {
  const total = leads.length || 1;

  // Usa as colunas passadas via prop ou fallback
  const stages = columns.length > 0 ? columns : [
    { id: "novo", label: "Novo", color: "bg-chart-1" },
    { id: "em_atendimento", label: "Em Atendimento", color: "bg-chart-2" },
    { id: "qualificado", label: "Qualificado", color: "bg-chart-3" },
    { id: "ganho", label: "Ganho", color: "bg-chart-4" },
    { id: "perdido", label: "Perdido", color: "bg-chart-5" },
  ];

  const stageData = stages.map((stage) => {
    const count = leads.filter((l) => l.status === stage.id).length;
    const pct = Math.round((count / total) * 100);
    return { ...stage, count, pct };
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Pipeline de Conversão
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex h-4 w-full overflow-hidden rounded-full bg-muted/30">
          {stageData.map(
            (stage) =>
              stage.count > 0 && (
                <div
                  key={stage.id}
                  className={`${stage.color} transition-all`}
                  style={{ width: `${stage.pct}%` }}
                  title={`${stage.label}: ${stage.count} (${stage.pct}%)`}
                />
              )
          )}
        </div>
        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {stageData.map((stage) => (
            <div key={stage.id} className="flex items-center gap-3">
              <div className={`h-3 w-3 shrink-0 rounded-full ${stage.color}`} />
              <div className="flex-1 flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{stage.label}</span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {stage.count} leads
                  </span>
                </div>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {stage.pct}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
