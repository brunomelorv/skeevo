"use client";

import { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck,
  Search,
  RefreshCw,
  Tag,
  ArrowRightLeft,
  CalendarClock,
  Bot,
  Clock,
  Eye,
  FileText,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuditLog {
  id: number;
  category: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  title: string;
  details?: Record<string, any>;
  created_at: string;
}

export default function AuditoriaPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/audit/logs?limit=200");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error("Erro ao carregar logs de auditoria:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchCat = categoryFilter === "all" || log.category === categoryFilter;
      const matchSearch =
        !search.trim() ||
        log.title.toLowerCase().includes(search.toLowerCase()) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(search.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [logs, categoryFilter, search]);

  // Contadores para os Metric Cards
  const totalCount = logs.length;
  const kanbanCount = logs.filter((l) => l.category === "kanban").length;
  const leadMovementCount = logs.filter((l) => l.category === "lead_movement").length;
  const followupCount = logs.filter((l) => l.category === "followup").length;

  const renderCategoryBadge = (category: string) => {
    switch (category) {
      case "kanban":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800 font-medium gap-1 text-xs">
            <Tag className="size-3" />
            Kanban
          </Badge>
        );
      case "lead_movement":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 font-medium gap-1 text-xs">
            <ArrowRightLeft className="size-3" />
            Movimentação Lead
          </Badge>
        );
      case "followup":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 font-medium gap-1 text-xs">
            <CalendarClock className="size-3" />
            Follow-Up
          </Badge>
        );
      case "agent":
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 font-medium gap-1 text-xs">
            <Bot className="size-3" />
            Agente IA
          </Badge>
        );
      default:
        return <Badge variant="secondary">{category}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl flex items-center gap-2">
            <ShieldCheck className="size-6 text-primary" /> Auditoria do Sistema
          </h1>
          <p className="text-sm text-muted-foreground">
            Histórico completo, rastreável e auditado de todas as ações no CRM
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1.5 h-8 text-xs">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar Logs
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total de Eventos</span>
            <Activity className="size-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold mt-2">{loading ? "..." : totalCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Registros gravados no banco</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Alterações no Kanban</span>
            <Tag className="size-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{loading ? "..." : kanbanCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Colunas criadas, editadas e removidas</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Movimentações de Funil</span>
            <ArrowRightLeft className="size-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{loading ? "..." : leadMovementCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Transições de status de leads</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Regras de Follow-up</span>
            <CalendarClock className="size-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{loading ? "..." : followupCount}</p>
          <p className="text-[11px] text-muted-foreground mt-1">Modificações na régua automática</p>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3">
          <CardTitle className="text-sm font-medium">Registros Auditados</CardTitle>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
              <Button
                variant={categoryFilter === "all" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setCategoryFilter("all")}
              >
                Todas
              </Button>
              <Button
                variant={categoryFilter === "kanban" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setCategoryFilter("kanban")}
              >
                Kanban
              </Button>
              <Button
                variant={categoryFilter === "lead_movement" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setCategoryFilter("lead_movement")}
              >
                Movimentação Leads
              </Button>
              <Button
                variant={categoryFilter === "followup" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setCategoryFilter("followup")}
              >
                Follow-up
              </Button>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full sm:w-auto">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar evento, lead, coluna..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs w-full sm:w-[200px]"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold">Data / Hora</TableHead>
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <TableHead className="font-semibold">Evento / Ação</TableHead>
                  <TableHead className="font-semibold text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Carregando registros de auditoria...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      Nenhum registro de auditoria encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="size-3 text-muted-foreground" />
                          <span>
                            {new Date(log.created_at).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{renderCategoryBadge(log.category)}</TableCell>
                      <TableCell className="font-medium text-xs">{log.title}</TableCell>
                      <TableCell className="text-right">
                        {log.details ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs gap-1"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="size-3.5" />
                            Ver Diff
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Log Details Modal (Diff Inspector) */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4" />
              Detalhes de Auditoria (ID #{selectedLog?.id})
            </DialogTitle>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3 pt-2">
              <div>
                <span className="text-xs text-muted-foreground">Evento:</span>
                <p className="text-sm font-medium mt-0.5">{selectedLog.title}</p>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div>
                  <span>Categoria:</span>{" "}
                  <span className="font-medium text-foreground">{selectedLog.category}</span>
                </div>
                <div>
                  <span>Ação:</span>{" "}
                  <span className="font-medium text-foreground">{selectedLog.action}</span>
                </div>
                <div>
                  <span>Data:</span>{" "}
                  <span className="font-mono text-foreground">
                    {new Date(selectedLog.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs text-muted-foreground block mb-1">
                  Atributos Auditados (JSON Diff):
                </span>
                <pre className="p-3 rounded-md bg-muted font-mono text-xs overflow-x-auto max-h-60 border">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
