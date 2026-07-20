"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  MessageSquare,
  Clock,
  Phone,
  User,
  Filter,
  X,
  Send,
} from "lucide-react";

interface Lead {
  id: number;
  phone: string;
  name?: string;
  push_name?: string;
  first_message?: string;
  first_message_at?: string;
  last_message_at?: string;
  status: string;
  created_at: string;
}

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
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-400" /> Leads Capturados
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie todos os leads registrados pelo webhook do WhatsApp
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por telefone, nome ou mensagem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Nome WhatsApp</th>
                <th className="px-6 py-4">Primeira Mensagem</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Data do Lead</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Carregando lista de leads...
                  </td>
                </tr>
              ) : filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => handleOpenLead(lead)}
                  >
                    <td className="px-6 py-4 font-mono font-medium text-emerald-400 flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400" />
                      {lead.phone}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {lead.push_name || lead.name || "—"}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-300">
                      {lead.first_message || "—"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold badge-glow-green">
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(lead.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLead(lead);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/20 transition-all"
                      >
                        Ver Histórico
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Lead Detail / History Modal */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="glass-card rounded-2xl p-6 max-w-2xl w-full border border-slate-700 shadow-2xl relative flex flex-col max-h-[85vh]">
            <button
              onClick={() => setSelectedLead(null)}
              className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                  {(selectedLead.push_name || selectedLead.phone)[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">
                    {selectedLead.push_name || "Lead WhatsApp"}
                  </h3>
                  <p className="text-xs font-mono text-emerald-400">{selectedLead.phone}</p>
                </div>
              </div>
            </div>

            {/* Chat History Box */}
            <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800/80 mb-4 min-h-[250px]">
              {loadingMessages ? (
                <p className="text-xs text-slate-500 text-center py-8">Carregando mensagens...</p>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-slate-400">{selectedLead.first_message}</p>
                  <span className="text-[10px] text-slate-500 mt-1 block">Primeira Mensagem Recebida</span>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.from_me ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-md p-3 rounded-2xl text-sm ${
                        msg.from_me
                          ? "bg-emerald-600 text-white rounded-br-none"
                          : "bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none"
                      }`}
                    >
                      {msg.body}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 px-1">
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Status: <strong className="text-emerald-400">{selectedLead.status}</strong></span>
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
