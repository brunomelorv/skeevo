"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Pie, PieChart } from "recharts";
import type { KanbanColumn } from "@/hooks/useKanbanColumns";

interface LeadsChartProps {
  leads: Array<{ status: string }>;
  columns?: KanbanColumn[];
}

function parseCssVarColor(bgClass: string): string {
  // bg-chart-1 -> var(--chart-1)
  const match = bgClass.match(/bg-(chart-\d+)/);
  if (match) {
    return `var(--${match[1]})`;
  }
  return "var(--chart-1)";
}

export default function LeadsChart({ leads, columns = [] }: LeadsChartProps) {
  const { chartConfig, statusLabels } = useMemo(() => {
    const labels: Record<string, string> = {};
    const config: ChartConfig = {};

    columns.forEach((col) => {
      labels[col.id] = col.label;
      config[col.id] = {
        label: col.label,
        color: parseCssVarColor(col.color),
      };
    });

    return { chartConfig: config, statusLabels: labels };
  }, [columns]);

  const statusCounts = leads.reduce(
    (acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const data = Object.entries(statusCounts).map(([status, count]) => ({
    status,
    label: statusLabels[status] || status,
    value: count,
    fill: `var(--color-${status})`,
  }));

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-medium">Leads por Status</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px]"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={60}
              strokeWidth={5}
            />
          </PieChart>
        </ChartContainer>
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          {data.map((item) => (
            <div key={item.status} className="flex items-center gap-1.5 text-xs">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: `var(--color-${item.status})` }}
              />
              <span className="text-muted-foreground">{item.label}</span>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
