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
  MoreVertical,
} from "lucide-react";

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
    color: "emerald",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    headerBg: "border-t-emerald-500",
  },
  {
    id: "em_atendimento",
    label: "Em Atendimento",
    icon: MessageSquare,
    color: "cyan",
    badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    headerBg: "border-t-cyan-500",
  },
  {
    id: "qualificado",
    label: "Qualificado",
    icon: Star,
    color: "amber",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    headerBg: "border-t-amber-500",
  },
  {
    id: "ganho",
    label: "Ganho",
    icon: Trophy,
    color: "green",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    headerBg: "border-t-emerald-400",
  },
  {
    id: "perdido",
    label: "Perdido",
    icon: XCircle,
    color: "red",
    badgeBg: "bg-red-500/10 text-red-400 border-red-500/20",
    headerBg: "border-t-red-500",
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
            className={`glass-card rounded-2xl border border-slate-800 border-t-4 ${col.headerBg} p-4 min-h-[500px] flex flex-col transition-all bg-slate-950/40`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-slate-300" />
                <span className="font-bold text-sm text-white">{col.label}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${col.badgeBg}`}>
                {colLeads.length}
              </span>
            </div>

            {/* Cards List */}
            <div className="flex-1 space-y-3">
              {colLeads.length === 0 ? (
                <div className="h-32 border-2 border-dashed border-slate-800/60 rounded-xl flex items-center justify-center text-xs text-slate-500">
                  Nenhum lead aqui
                </div>
              ) : (
                colLeads.map((lead) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead.id)}
                    onClick={() => onOpenLead(lead)}
                    className={`p-4 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 shadow-md cursor-grab active:cursor-grabbing transition-all hover:scale-[1.01] group relative ${
                      draggedLeadId === lead.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center">
                          {(lead.push_name || lead.phone)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {lead.push_name || "Lead sem nome"}
                          </p>
                          <p className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Phone className="h-3 w-3 text-slate-500" /> {lead.phone}
                          </p>
                        </div>
                      </div>

                      {/* Quick Status Select */}
                      <select
                        value={lead.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation();
                          onStatusChange(lead.id, e.target.value);
                        }}
                        className="bg-slate-950 text-slate-300 text-[10px] rounded px-1.5 py-1 border border-slate-800 focus:outline-none focus:border-emerald-500"
                      >
                        {COLUMNS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* First message preview */}
                    <p className="text-xs text-slate-300 line-clamp-2 bg-slate-950/50 p-2 rounded-lg border border-slate-800/60 mb-2">
                      {lead.first_message || "Sem mensagem"}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(lead.created_at).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                      <span className="text-emerald-400 font-medium group-hover:underline">Ver Conversa &rarr;</span>
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
