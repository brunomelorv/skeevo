"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import {
  Users,
  Search,
  Phone,
  LayoutList,
  Columns,
  RefreshCw,
  Settings2,
} from "lucide-react";
import KanbanBoard from "@/components/KanbanBoard";
import KanbanColumnsEditor from "@/components/KanbanColumnsEditor";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import type { Lead } from "@/components/KanbanBoard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  id: number;
  lead_id: number;
  message_id?: string;
  body?: string;
  from_me: boolean;
  chat_id?: string;
  created_at: string;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "kanban">("kanban");
  const [columnsEditorOpen, setColumnsEditorOpen] = useState(false);

  const { columns, addColumn, removeColumn, canAdd, updateOutcomeSignal, updateGoalDescription } = useKanbanColumns();

  /** statusConfig derivado dinamicamente das colunas ativas */
  const statusConfig = useMemo(
    () =>
      Object.fromEntries(
        columns.map((col) => [col.id, { label: col.label, dot: col.color }])
      ),
    [columns]
  );

  useEffect(() => {
    const savedMode = localStorage.getItem("skeevo_leads_view_mode") as "table" | "kanban";
    if (savedMode) {
      setViewMode(savedMode);
    }
  }, []);

  const handleToggleViewMode = (mode: "table" | "kanban") => {
    setViewMode(mode);
    localStorage.setItem("skeevo_leads_view_mode", mode);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/leads?limit=100");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error("Erro ao carregar leads:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const handleStatusChange = async (leadId: number, newStatus: string) => {
    setLeads((prev) =>
      prev.map((lead) => (lead.id === leadId ? { ...lead, status: newStatus } : lead))
    );

    try {
      const res = await fetch(`http://localhost:8000/leads/${leadId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        fetchLeads();
      }
    } catch (e) {
      console.error("Erro ao atualizar status:", e);
      fetchLeads();
    }
  };

  /** Move múltiplos leads para um novo status (usado pelo editor de colunas) */
  const handleMoveLeads = useCallback(
    async (leadIds: number[], targetStatus: string): Promise<void> => {
      // Atualização otimista
      setLeads((prev) =>
        prev.map((lead) =>
          leadIds.includes(lead.id) ? { ...lead, status: targetStatus } : lead
        )
      );

      // Chama o backend para cada lead em paralelo
      const results = await Promise.allSettled(
        leadIds.map((id) =>
          fetch(`http://localhost:8000/leads/${id}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: targetStatus }),
          })
        )
      );

      const anyFailed = results.some(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      );
      if (anyFailed) {
        // Se algum falhou, recarrega o estado real
        fetchLeads();
      }
    },
    []
  );

  const handleOpenLead = async (lead: Lead) => {
    setSelectedLead(lead);
    setLoadingMessages(true);
    try {
      const res = await fetch(`http://localhost:8000/leads/${lead.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (e) {
      console.error("Erro ao carregar mensagens:", e);
    } finally {
      setLoadingMessages(false);
    }
  };

  const filteredLeads = leads.filter(
    (lead) =>
      lead.phone.toLowerCase().includes(search.toLowerCase()) ||
      (lead.push_name && lead.push_name.toLowerCase().includes(search.toLowerCase())) ||
      (lead.first_message && lead.first_message.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Users className="size-5" /> Leads
          </h1>
          <p className="text-sm text-muted-foreground">
            Gerencie e mova seus leads pelo funil de atendimento do WhatsApp
          </p>
        </div>

        {/* Controles: busca + toggle de view + editar colunas + refresh */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Barra de busca */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar telefone, nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Toggle Kanban / Tabela — ao lado da busca */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === "kanban" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleToggleViewMode("kanban")}
              className="gap-1.5"
            >
              <Columns className="size-3.5" /> Kanban
            </Button>
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => handleToggleViewMode("table")}
              className="gap-1.5"
            >
              <LayoutList className="size-3.5" /> Tabela
            </Button>
          </div>

          {/* Botão editar colunas — visível apenas no modo Kanban */}
          {viewMode === "kanban" && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => setColumnsEditorOpen(true)}
              title={canAdd ? "Editar colunas do Kanban" : `Limite de colunas atingido`}
            >
              <Settings2 className="size-3.5" />
              Colunas
            </Button>
          )}

          {/* Refresh */}
          <Button variant="outline" size="icon-sm" onClick={fetchLeads} title="Recarregar">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* View Kanban */}
      {viewMode === "kanban" ? (
        <KanbanBoard
          leads={filteredLeads}
          columns={columns}
          onOpenLead={handleOpenLead}
          onStatusChange={handleStatusChange}
        />
      ) : (
        /* View Tabela */
        <div className="rounded-xl border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Telefone</TableHead>
                <TableHead>Nome WhatsApp</TableHead>
                <TableHead className="hidden md:table-cell">Mensagem</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Carregando lista de leads...
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum lead encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const cfg = statusConfig[lead.status] || {
                    label: lead.status,
                    dot: "bg-muted-foreground",
                  };
                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => handleOpenLead(lead)}
                    >
                      <TableCell className="font-mono text-xs flex items-center gap-1.5">
                        <Phone className="size-3 text-muted-foreground" />
                        {lead.phone}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="size-7 rounded-full overflow-hidden shrink-0">
                            {lead.profile_picture_url ? (
                              <AvatarImage
                                src={lead.profile_picture_url}
                                alt={lead.push_name || lead.phone}
                                referrerPolicy="no-referrer"
                                className="object-cover size-full"
                              />
                            ) : null}
                            <AvatarFallback className="rounded-full bg-primary/10 text-primary text-xs font-bold size-full flex items-center justify-center">
                              {(lead.push_name || lead.phone)[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{lead.push_name || lead.name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground text-xs">
                        {lead.first_message || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                          <span className="text-xs">{cfg.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenLead(lead);
                          }}
                        >
                          Ver Histórico
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Dialog: detalhe do lead */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="size-10 rounded-full">
                {selectedLead?.profile_picture_url ? (
                  <AvatarImage
                    src={selectedLead.profile_picture_url}
                    alt={selectedLead.push_name || selectedLead.phone}
                    referrerPolicy="no-referrer"
                    className="object-cover size-full"
                  />
                ) : null}
                <AvatarFallback className="rounded-full bg-primary text-primary-foreground font-bold text-sm size-full flex items-center justify-center">
                  {selectedLead && (selectedLead.push_name || selectedLead.phone)[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>{selectedLead?.push_name || "Lead WhatsApp"}</DialogTitle>
                <p className="text-xs font-mono text-muted-foreground">{selectedLead?.phone}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="max-h-[400px] overflow-y-auto space-y-2 rounded-lg border bg-muted/30 p-3">
            {loadingMessages ? (
              <p className="text-xs text-muted-foreground text-center py-8">Carregando mensagens...</p>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{selectedLead?.first_message}</p>
                <span className="text-[10px] text-muted-foreground mt-1 block">Primeira Mensagem Recebida</span>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.from_me ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[80%] p-2.5 rounded-2xl text-xs ${
                      msg.from_me
                        ? "bg-primary text-primary-foreground rounded-br-none"
                        : "bg-background border rounded-bl-none"
                    }`}
                  >
                    {msg.body}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-0.5 px-1">
                    {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>

          {selectedLead && (
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Status:</span>
                {/* Select de status gerado dinamicamente a partir das colunas ativas */}
                <Select
                  value={selectedLead.status}
                  onValueChange={(value) => {
                    if (value) {
                      handleStatusChange(selectedLead.id, value);
                      setSelectedLead({ ...selectedLead, status: value });
                    }
                  }}
                >
                  <SelectTrigger className="h-7 w-[160px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: editor de colunas do Kanban */}
      <KanbanColumnsEditor
        open={columnsEditorOpen}
        onClose={() => setColumnsEditorOpen(false)}
        columns={columns}
        leads={leads}
        onAddColumn={addColumn}
        onRemoveColumn={removeColumn}
        onMoveLeads={handleMoveLeads}
        onUpdateOutcomeSignal={updateOutcomeSignal}
        onUpdateGoalDescription={updateGoalDescription}
      />
    </div>
  );
}
