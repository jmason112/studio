
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
import type { LogEntry, Severity } from '@/lib/types';

interface LogSeverityDistributionChartProps {
  logs: LogEntry[];
}

const severityColors: Record<Severity, string> = {
  INFO: "hsl(var(--chart-1))",
  WARNING: "hsl(var(--chart-2))",
  ERROR: "hsl(var(--chart-3))",
  CRITICAL: "hsl(var(--chart-4))",
  DEBUG: "hsl(var(--chart-5))",
  UNKNOWN: "hsl(var(--muted))",
};

const chartConfig = Object.keys(severityColors).reduce((acc, key) => {
  acc[key as Severity] = { label: key as Severity, color: severityColors[key as Severity] };
  return acc;
}, {} as ChartConfig);

chartConfig.count = { label: "Count" };


export function LogSeverityDistributionChart({ logs }: LogSeverityDistributionChartProps) {
  const severityCounts = logs.reduce((acc, log) => {
    acc[log.severity] = (acc[log.severity] || 0) + 1;
    return acc;
  }, {} as Record<Severity, number>);

  const chartData = Object.entries(severityCounts)
    .map(([name, value]) => ({
      name: name as Severity,
      value,
      fill: severityColors[name as Severity] || severityColors.UNKNOWN,
    }))
    .sort((a, b) => b.value - a.value); // Sort for consistent legend order

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-[250px] text-muted-foreground">No data to display</div>;
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
          outerRadius={80}
          innerRadius={50} // For Donut chart
          labelLine={false}
        //   label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
        //     const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        //     const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
        //     const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
        //     if ((percent * 100) < 5) return null; // Don't show small labels
        //     return (
        //       <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
        //         {`${name} (${(percent * 100).toFixed(0)}%)`}
        //       </text>
        //     );
        //   }}
        >
          {chartData.map((entry) => (
            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
          ))}
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="name" />}
          className="-translate-y-2 flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );
}
