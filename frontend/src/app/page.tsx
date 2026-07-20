"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  TrendingUp,
  ArrowRight,
  MessageCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import WahaConnectionWizard from "@/components/WahaConnectionWizard";

interface Lead {
  id: number;
  phone: string;
  name?: string;
  push_name?: string;
  first_message?: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const [totalLeads, setTotalLeads] = useState<number | null>(null);
  const [todayLeads, setTodayLeads] = useState<number | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [countRes, todayRes, leadsRes] = await Promise.all([
        fetch("http://localhost:8000/leads/count").then((r) => r.json()).catch(() => ({ total: 0 })),
        fetch("http://localhost:8000/leads/today").then((r) => r.json()).catch(() => ({ total: 0 })),
        fetch("http://localhost:8000/leads?limit=5").then((r) => r.json()).catch(() => []),
      ]);

      setTotalLeads(countRes.total ?? 0);
      setTodayLeads(todayRes.total ?? 0);
      setRecentLeads(Array.isArray(leadsRes) ? leadsRes : []);
    } catch (err) {
      console.error("Erro ao carregar métricas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl glass-card p-6 md:p-8 border border-slate-800">
        <div className="absolute -right-10 -top-10 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Sistema Operacional
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
              Painel de <span className="gradient-text">Leads Skeevo</span>
            </h1>
            <p className="mt-2 text-slate-400 max-w-xl text-sm leading-relaxed">
              Captura automática de contatos e conversas via WhatsApp com integração em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchStats}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 text-sm font-medium transition-all"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-emerald-400" : ""}`} />
              Atualizar Dados
            </button>
          </div>
        </div>
      </div>

      {/* WhatsApp Session Connection Wizard Component */}
      <WahaConnectionWizard />

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Total Leads */}
        <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Total de Leads</span>
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-white tracking-tight">
              {loading ? "..." : totalLeads}
            </span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-500/20">
              <TrendingUp className="h-3 w-3" /> Acumulado
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Cadastrados no banco de dados PostgreSQL</p>
        </div>

        {/* Leads Hoje */}
        <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Leads Hoje</span>
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-white tracking-tight">
              {loading ? "..." : todayLeads}
            </span>
            <span className="text-xs font-semibold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-cyan-500/20">
              <Clock className="h-3 w-3" /> Hoje
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500">Capturados nas últimas 24h</p>
        </div>
      </div>

      {/* Recent Leads Table */}
      <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-400" /> Últimos Leads Capturados
            </h2>
            <p className="text-xs text-slate-400 mt-1">Mensagens recebidas em tempo real</p>
          </div>
          <Link
            href="/leads"
            className="flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            Ver Todos os Leads <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-xs font-semibold uppercase text-slate-400 tracking-wider">
              <tr>
                <th className="px-6 py-4">Telefone</th>
                <th className="px-6 py-4">Nome WhatsApp</th>
                <th className="px-6 py-4">Primeira Mensagem</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentLeads.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 text-sm">
                    {loading ? "Carregando leads..." : "Nenhum lead capturado ainda. Envie uma mensagem pelo WhatsApp!"}
                  </td>
                </tr>
              ) : (
                recentLeads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-emerald-400">
                      {lead.phone}
                    </td>
                    <td className="px-6 py-4 font-medium text-white">
                      {lead.push_name || lead.name || "—"}
                    </td>
                    <td className="px-6 py-4 max-w-xs truncate text-slate-300">
                      {lead.first_message || "Sem mensagem"}
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
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
