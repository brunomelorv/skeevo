"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis } from "recharts";

interface DailyChartProps {
  leads: Array<{ created_at: string }>;
}

const chartConfig = {
  leads: {
    label: "Leads",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export default function DailyChart({ leads }: DailyChartProps) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return date.toISOString().split("T")[0];
  });

  const countsByDate = leads.reduce(
    (acc, lead) => {
      const date = lead.created_at.split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const data = last7Days.map((date) => {
    const d = new Date(date + "T12:00:00");
    const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    return {
      date: label,
      leads: countsByDate[date] || 0,
    };
  });

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-sm font-medium">
          Leads por Dia
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              fontSize={11}
            />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="leads"
              fill="var(--color-leads)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
