"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Activity, Target } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { KanbanColumn } from "@/hooks/useKanbanColumns";

interface StatsCardsProps {
  totalLeads: number | null;
  todayLeads: number | null;
  loading: boolean;
  columns?: KanbanColumn[];
  allLeads?: Array<{ status: string }>;
}

export default function StatsCards({
  totalLeads,
  todayLeads,
  loading,
  columns = [],
  allLeads = [],
}: StatsCardsProps) {
  // Define a coluna padrão para o card de conversão (preferência por "ganho", se não existir pega a última)
  const defaultSlug = useMemo(() => {
    if (columns.some((c) => c.id === "ganho")) return "ganho";
    return columns.length > 0 ? columns[columns.length - 1].id : "ganho";
  }, [columns]);

  const [selectedSlug, setSelectedSlug] = useState<string>(defaultSlug);

  useEffect(() => {
    if (columns.length > 0 && !columns.some((c) => c.id === selectedSlug)) {
      setSelectedSlug(defaultSlug);
    }
  }, [columns, selectedSlug, defaultSlug]);

  const selectedCol = useMemo(
    () => columns.find((c) => c.id === selectedSlug) || { id: selectedSlug, label: selectedSlug },
    [columns, selectedSlug]
  );

  // Cálculos de métricas
  const total = totalLeads ?? allLeads.length;
  const denominator = total > 0 ? total : 1;

  // Pipeline Ativo: leads que não estão com status 'perdido'
  const activePipelineCount = useMemo(
    () => allLeads.filter((l) => l.status !== "perdido").length,
    [allLeads]
  );

  // Conversão da coluna selecionada
  const selectedColCount = useMemo(
    () => allLeads.filter((l) => l.status === selectedSlug).length,
    [allLeads, selectedSlug]
  );

  const conversionPct = Math.round((selectedColCount / denominator) * 100);

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {/* Card 1: Total de Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Leads
          </CardTitle>
          <div className="flex size-10 items-center justify-center rounded-full border bg-chart-1/10 border-chart-1/20">
            <Users className="size-5 text-chart-1" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold lg:text-3xl">
            {loading ? "..." : total}
          </div>
          <p className="text-xs text-muted-foreground">Cadastrados no banco de dados</p>
        </CardContent>
      </Card>

      {/* Card 2: Leads Hoje */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Leads Hoje
          </CardTitle>
          <div className="flex size-10 items-center justify-center rounded-full border bg-chart-2/10 border-chart-2/20">
            <UserCheck className="size-5 text-chart-2" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold lg:text-3xl">
            {loading ? "..." : todayLeads ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">Capturados no dia de hoje</p>
        </CardContent>
      </Card>

      {/* Card 3: Pipeline Ativo (Substitui o antigo card do WhatsApp) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Pipeline Ativo
          </CardTitle>
          <div className="flex size-10 items-center justify-center rounded-full border bg-chart-3/10 border-chart-3/20">
            <Activity className="size-5 text-chart-3" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold lg:text-3xl">
            {loading ? "..." : activePipelineCount}
          </div>
          <p className="text-xs text-muted-foreground">Leads em atendimento no funil</p>
        </CardContent>
      </Card>

      {/* Card 4: Conversão {Nome da Coluna} com Seletor Interativo */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground font-medium">Conversão</span>
            {columns.length > 0 && (
              <Select value={selectedSlug} onValueChange={(val) => val && setSelectedSlug(val)}>
                <SelectTrigger className="h-6 text-xs px-2 py-0 border-none bg-muted/60 hover:bg-muted font-semibold focus:ring-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id} className="text-xs">
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex size-10 items-center justify-center rounded-full border bg-chart-4/10 border-chart-4/20 shrink-0">
            <Target className="size-5 text-chart-4" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold lg:text-3xl">
            {loading ? "..." : `${selectedColCount} (${conversionPct}%)`}
          </div>
          <p className="text-xs text-muted-foreground">Taxa de conversão sobre o total</p>
        </CardContent>
      </Card>
    </div>
  );
}
