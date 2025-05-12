
"use client";

import type React from 'react';
import { PieChart, Pie, Cell, Tooltip } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart";
import type { LogEntry } from '@/lib/types';

interface AnomalySummaryChartProps {
  logs: LogEntry[];
}

const chartConfig = {
  count: { label: "Count" },
  Normal: { label: "Normal", color: "hsl(var(--chart-1))" },
  Anomalous: { label: "Anomalous", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

export function AnomalySummaryChart({ logs }: AnomalySummaryChartProps) {
  const anomalyCounts = logs.reduce(
    (acc, log) => {
      if (log.isAnomalous) {
        acc.anomalous += 1;
      } else {
        acc.normal += 1;
      }
      return acc;
    },
    { anomalous: 0, normal: 0 }
  );

  const chartData = [
    { name: 'Normal', value: anomalyCounts.normal, fill: chartConfig.Normal.color },
    { name: 'Anomalous', value: anomalyCounts.anomalous, fill: chartConfig.Anomalous.color },
  ].filter(item => item.value > 0); // Only show segments with data

  if (chartData.length === 0 && logs.length > 0) {
     return <div className="flex items-center justify-center h-[250px] text-muted-foreground">No anomalous logs processed yet. Run AI scan.</div>;
  }
  
  if (logs.length === 0) {
    return <div className="flex items-center justify-center h-[250px] text-muted-foreground">No logs to summarize.</div>;
  }


  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <PieChart>
        <Tooltip 
            cursor={false}
            content={<ChartTooltipContent hideLabel nameKey="name" />} 
        />
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60} // Makes it a donut chart
          outerRadius={90}
          labelLine={false}
        //   label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
        >
          {chartData.map((entry) => (
            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          className="-translate-y-1 flex-wrap gap-2 [&>*]:basis-1/3 [&>*]:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );
}
