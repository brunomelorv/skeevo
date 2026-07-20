"use client";

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
import { ArrowRight } from "lucide-react";

interface Lead {
  id: number;
  phone: string;
  name?: string;
  push_name?: string;
  first_message?: string;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; dot: string }> = {
  novo: { label: "Novo", dot: "bg-chart-1" },
  em_atendimento: { label: "Atendimento", dot: "bg-chart-2" },
  qualificado: { label: "Qualificado", dot: "bg-chart-3" },
  ganho: { label: "Ganho", dot: "bg-chart-4" },
  perdido: { label: "Perdido", dot: "bg-chart-5" },
};

export default function RecentLeadsTable({
  leads,
  loading,
}: {
  leads: Lead[];
  loading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">
          Últimos Leads Capturados
        </CardTitle>
        <Button variant="ghost" size="sm" render={<Link href="/leads" className="gap-1" />}>
          Ver Todos <ArrowRight className="size-3.5" />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead className="hidden md:table-cell">Mensagem</TableHead>
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
            ) : leads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Nenhum lead capturado ainda.
                </TableCell>
              </TableRow>
            ) : (
              leads.map((lead) => {
                const cfg = statusConfig[lead.status] || { label: lead.status, dot: "bg-muted-foreground" };
                return (
                  <TableRow key={lead.id}>
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
                    <TableCell className="hidden md:table-cell max-w-[200px] truncate text-muted-foreground text-xs">
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
  );
}
