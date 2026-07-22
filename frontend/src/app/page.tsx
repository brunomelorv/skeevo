"use client";

import { useEffect, useState } from "react";
import StatsCards from "@/components/dashboard/StatsCards";
import LeadsChart from "@/components/dashboard/LeadsChart";
import DailyChart from "@/components/dashboard/DailyChart";
import PipelineCard from "@/components/dashboard/PipelineCard";
import RecentLeadsTable from "@/components/dashboard/RecentLeadsTable";
import WahaConnectionWizard from "@/components/WahaConnectionWizard";
import { useKanbanColumns } from "@/hooks/useKanbanColumns";
import { apiFetch } from "@/lib/api";

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
  const [allLeads, setAllLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [waStatus, setWaStatus] = useState<string>("");

  const { columns } = useKanbanColumns();

  const fetchStats = async () => {
    try {
      const [countRes, todayRes, leadsRes, allRes] = await Promise.all([
        apiFetch<{ total?: number }>("/leads/count").catch(() => ({ total: 0 })),
        apiFetch<{ total?: number }>("/leads/today").catch(() => ({ total: 0 })),
        apiFetch<Lead[]>("/leads?limit=5").catch(() => []),
        apiFetch<Lead[]>("/leads?limit=100").catch(() => []),
      ]);

      setTotalLeads(countRes.total ?? 0);
      setTodayLeads(todayRes.total ?? 0);
      setRecentLeads(Array.isArray(leadsRes) ? leadsRes : []);
      setAllLeads(Array.isArray(allRes) ? allRes : []);
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight lg:text-2xl">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do sistema de captura de leads
          </p>
        </div>
      </div>

      <StatsCards
        totalLeads={totalLeads}
        todayLeads={todayLeads}
        loading={loading}
        columns={columns}
        allLeads={allLeads}
        waStatus={waStatus}
      />

      <WahaConnectionWizard onStatusChange={setWaStatus} />

      <div className="grid gap-4 xl:grid-cols-3">
        <LeadsChart leads={allLeads} columns={columns} />
        <DailyChart leads={allLeads} />
        <PipelineCard leads={allLeads} columns={columns} />
      </div>

      <RecentLeadsTable leads={recentLeads} loading={loading} columns={columns} />
    </div>
  );
}
