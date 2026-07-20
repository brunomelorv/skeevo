"use client";

import { useState } from "react";
import {
  Inbox,
  MessageSquare,
  Star,
  Trophy,
  XCircle,
  Phone,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Lead {
  id: number;
  phone: string;
  name?: string;
  push_name?: string;
  first_message?: string;
  status: string;
  created_at: string;
  updated_at?: string;
}

interface KanbanBoardProps {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
  onStatusChange: (leadId: number, newStatus: string) => void;
}

const COLUMNS = [
  {
    id: "novo",
    label: "Novo",
    icon: Inbox,
    color: "bg-chart-1",
    badgeClass: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  },
  {
    id: "em_atendimento",
    label: "Em Atendimento",
    icon: MessageSquare,
    color: "bg-chart-2",
    badgeClass: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  },
  {
    id: "qualificado",
    label: "Qualificado",
    icon: Star,
    color: "bg-chart-3",
    badgeClass: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  },
  {
    id: "ganho",
    label: "Ganho",
    icon: Trophy,
    color: "bg-chart-4",
    badgeClass: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  },
  {
    id: "perdido",
    label: "Perdido",
    icon: XCircle,
    color: "bg-chart-5",
    badgeClass: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  },
];

export default function KanbanBoard({ leads, onOpenLead, onStatusChange }: KanbanBoardProps) {
  const [draggedLeadId, setDraggedLeadId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, leadId: number) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData("text/plain", leadId.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const leadIdStr = e.dataTransfer.getData("text/plain");
    const leadId = parseInt(leadIdStr, 10);
    if (!isNaN(leadId)) {
      onStatusChange(leadId, targetStatus);
    }
    setDraggedLeadId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
      {COLUMNS.map((col) => {
        const colLeads = leads.filter((l) => l.status === col.id);
        const Icon = col.icon;

        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className="rounded-xl border bg-card text-card-foreground flex flex-col"
          >
            <div className={`p-3 border-b border-t-2 ${col.color} rounded-t-xl`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <span className="font-semibold text-sm">{col.label}</span>
                </div>
                <Badge variant="outline" className={`text-xs font-medium px-1.5 py-0 ${col.badgeClass}`}>
                  {colLeads.length}
                </Badge>
              </div>
            </div>

            <div className="flex-1 p-2 space-y-2 min-h-[400px]">
              {colLeads.length === 0 ? (
                <div className="h-24 border border-dashed rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                  Nenhum lead aqui
                </div>
              ) : (
                colLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => onOpenLead(lead)}
                    className={`p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-grab active:cursor-grabbing transition-colors ${
                      draggedLeadId === lead.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                          {(lead.push_name || lead.phone)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">
                            {lead.push_name || "Lead sem nome"}
                          </p>
                          <p className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                            <Phone className="size-2.5" /> {lead.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/50 p-2 rounded-md mb-2">
                      {lead.first_message || "Sem mensagem"}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="size-2.5" />
                        {new Date(lead.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      <span className="text-primary font-medium">Ver Conversa &rarr;</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
