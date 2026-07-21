"use client";

import React, { useState } from "react";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  RefreshCw,
  XCircle,
  Calendar,
  User,
  Phone,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle,
  Ban,
  Loader2,
  Filter,
} from "lucide-react";

export interface LeadFollowupItem {
  id: number;
  lead_id: number;
  step_id?: number;
  step_number: number;
  scheduled_at?: string;
  status: "scheduled" | "sent" | "cancelled" | string;
  sent_at?: string;
  cancel_reason?: string;
  created_at?: string;
  lead_name?: string;
  lead_phone?: string;
  lead_status?: string;
}

interface FollowupQueueTableProps {
  items: LeadFollowupItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onCancelItem: (id: number) => Promise<void>;
}

import { useKanbanColumns } from "@/hooks/useKanbanColumns";

export default function FollowupQueueTable({
  items,
  isLoading,
  onRefresh,
  onCancelItem,
}: FollowupQueueTableProps) {
  const { columns } = useKanbanColumns();
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const handleCancel = async (id: number) => {
    setCancellingId(id);
    try {
      await onCancelItem(id);
    } finally {
      setCancellingId(null);
    }
  };

  const filteredItems = items.filter((item) => {
    if (statusFilter === "all") return true;
    return item.status === statusFilter;
  });

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return date.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 font-medium gap-1">
            <Clock className="size-3" />
            Agendado
          </Badge>
        );
      case "sent":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 font-medium gap-1">
            <CheckCircle2 className="size-3" />
            Enviado
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 font-medium gap-1">
            <Ban className="size-3" />
            Cancelado
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const renderKanbanBadge = (kanbanStatus?: string) => {
    if (!kanbanStatus) return <span className="text-muted-foreground text-xs">-</span>;

    const matched = columns.find((c) => c.id === kanbanStatus);
    if (matched) {
      return (
        <Badge variant="outline" className={`font-normal text-xs ${matched.badgeClass}`}>
          {matched.label}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="font-normal text-xs">
        {kanbanStatus}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="size-5 text-primary" />
            Fila de Envios Agendados
          </CardTitle>
          <CardDescription>
            Monitore as mensagens de follow-up em espera, enviadas ou canceladas.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-muted rounded-md p-1">
            <Button
              variant={statusFilter === "all" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setStatusFilter("all")}
            >
              Todos ({items.length})
            </Button>
            <Button
              variant={statusFilter === "scheduled" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setStatusFilter("scheduled")}
            >
              Agendados ({items.filter((i) => i.status === "scheduled").length})
            </Button>
            <Button
              variant={statusFilter === "sent" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setStatusFilter("sent")}
            >
              Enviados ({items.filter((i) => i.status === "sent").length})
            </Button>
            <Button
              variant={statusFilter === "cancelled" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setStatusFilter("cancelled")}
            >
              Cancelados ({items.filter((i) => i.status === "cancelled").length})
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            title="Atualizar fila"
            className="size-8"
          >
            <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="size-5 animate-spin text-primary" />
            <span>Carregando fila de envios...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground space-y-2">
            <Calendar className="size-8 mx-auto opacity-40" />
            <p className="text-sm font-medium">Nenhum item encontrado na fila</p>
            <p className="text-xs text-muted-foreground">
              {statusFilter !== "all"
                ? `Nenhum item com o status "${statusFilter}".`
                : "Quando novos leads entrarem nas colunas selecionadas, os disparos aparecerão aqui."}
            </p>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold">Lead</TableHead>
                  <TableHead className="font-semibold">Status no Kanban</TableHead>
                  <TableHead className="font-semibold text-center">Etapa</TableHead>
                  <TableHead className="font-semibold">Data / Hora Agendada</TableHead>
                  <TableHead className="font-semibold">Status de Envio</TableHead>
                  <TableHead className="font-semibold text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    {/* Lead info */}
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          <User className="size-3.5 text-muted-foreground shrink-0" />
                          <span>{item.lead_name || "Lead Sem Nome"}</span>
                        </div>
                        {item.lead_phone && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 pl-5">
                            <Phone className="size-3 shrink-0" />
                            <span>{item.lead_phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>

                    {/* Kanban Status */}
                    <TableCell>{renderKanbanBadge(item.lead_status)}</TableCell>

                    {/* Step Number */}
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-mono text-xs">
                        Passo {item.step_number}
                      </Badge>
                    </TableCell>

                    {/* Scheduled Date/Time */}
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-1.5 font-mono text-xs text-foreground/90">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        <span>{formatDateTime(item.scheduled_at)}</span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>{renderStatusBadge(item.status)}</TableCell>

                    {/* Manual Cancel Button */}
                    <TableCell className="text-right">
                      {item.status === "scheduled" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive gap-1"
                          onClick={() => handleCancel(item.id)}
                          disabled={cancellingId === item.id}
                        >
                          {cancellingId === item.id ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <XCircle className="size-3.5" />
                          )}
                          Cancelar
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground pr-2">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
