"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, Smartphone, Activity } from "lucide-react";

interface StatsCardsProps {
  totalLeads: number | null;
  todayLeads: number | null;
  loading: boolean;
  waStatus?: string;
}

export default function StatsCards({
  totalLeads,
  todayLeads,
  loading,
  waStatus,
}: StatsCardsProps) {
  const activePipeline = todayLeads ?? 0;

  const cards = [
    {
      title: "Total de Leads",
      value: loading ? "..." : totalLeads ?? 0,
      description: "Cadastrados no banco de dados",
      icon: Users,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Leads Hoje",
      value: loading ? "..." : todayLeads ?? 0,
      description: "Capturados nas últimas 24h",
      icon: UserCheck,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "WhatsApp",
      value: waStatus === "WORKING" || waStatus === "CONNECTED" ? "Online" : "Offline",
      description: "Status da conexão WAHA",
      icon: Smartphone,
      color:
        waStatus === "WORKING" || waStatus === "CONNECTED"
          ? "text-green-500"
          : "text-muted-foreground",
      bgColor:
        waStatus === "WORKING" || waStatus === "CONNECTED"
          ? "bg-green-500/10"
          : "bg-muted",
    },
    {
      title: "Pipeline Ativo",
      value: loading ? "..." : activePipeline,
      description: "Leads capturados hoje",
      icon: Activity,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div
              className={`flex size-10 items-center justify-center rounded-full border ${card.bgColor}`}
            >
              <card.icon className={`size-5 ${card.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold lg:text-3xl">{card.value}</div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
