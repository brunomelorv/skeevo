"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowRight, Search, Filter, MessageSquare, Phone, User, Calendar } from "lucide-react";
import type { KanbanColumn } from "@/hooks/useKanbanColumns";

interface Lead {
  id: number;
  phone: string;
  name?: string;
  push_name?: string;
  first_message?: string;
  status: string;
  created_at: string;
}

interface RecentLeadsTableProps {
  leads: Lead[];
  loading: boolean;
  columns?: KanbanColumn[];
}

export default function RecentLeadsTable({
  leads,
  loading,
  columns = [],
}: RecentLeadsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const statusConfig = useMemo(() => {
    const config: Record<string, { label: string; dot: string }> = {};
    columns.forEach((col) => {
      config[col.id] = { label: col.label, dot: col.color };
    });
    return config;
  }, [columns]);

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const nameMatch =
        (lead.push_name || lead.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.phone.includes(searchTerm);
      const statusMatch = statusFilter === "all" || lead.status === statusFilter;
      return nameMatch && statusMatch;
    });
  }, [leads, searchTerm, statusFilter]);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-sm font-medium">
              Últimos Leads Capturados
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Exibindo {filteredLeads.length} de {leads.length} leads recentes
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48 min-w-[140px]">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou fone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            {/* Status Filter */}
            {columns.length > 0 && (
              <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
                <SelectTrigger className="h-8 text-xs w-[130px]">
                  <Filter className="size-3.5 mr-1 text-muted-foreground" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todos os Status
                  </SelectItem>
                  {columns.map((col) => (
                    <SelectItem key={col.id} value={col.id} className="text-xs">
                      {col.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Button variant="ghost" size="sm" render={<Link href="/leads" className="gap-1 text-xs" />}>
              Ver Todos <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Mensagem Inicial</TableHead>
                <TableHead className="text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Carregando leads...
                  </TableCell>
                </TableRow>
              ) : filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum lead encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => {
                  const cfg = statusConfig[lead.status] || { label: lead.status, dot: "bg-muted-foreground" };
                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                          <span className="text-xs">{cfg.label}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {lead.push_name || lead.name || "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {lead.phone}
                      </TableCell>
                      <TableCell className="hidden md:table-cell max-w-[240px] truncate text-muted-foreground text-xs">
                        {lead.first_message || "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {new Date(lead.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lead Message Details Dialog */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="size-4 text-muted-foreground" />
              {selectedLead?.push_name || selectedLead?.name || "Lead sem nome"}
            </DialogTitle>
          </DialogHeader>

          {selectedLead && (
            <div className="space-y-4 text-xs pt-2">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Phone className="size-3.5" />
                  <span className="font-mono">{selectedLead.phone}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <span>
                    {new Date(selectedLead.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-medium flex items-center gap-1.5 mb-2 text-foreground">
                  <MessageSquare className="size-3.5 text-primary" /> Primeira Mensagem Enviada:
                </h4>
                <div className="rounded-lg bg-muted/60 p-3 text-foreground leading-relaxed whitespace-pre-wrap">
                  {selectedLead.first_message || "Nenhuma mensagem registrada."}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
