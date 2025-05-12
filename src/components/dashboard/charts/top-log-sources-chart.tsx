
"use client";

import type React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import type { LogEntry } from '@/lib/types';

interface TopLogSourcesChartProps {
  logs: LogEntry[];
}

const MAX_SOURCES_DISPLAYED = 7;

export function TopLogSourcesChart({ logs }: TopLogSourcesChartProps) {
  const sourceCounts = logs.reduce((acc, log) => {
    acc[log.source] = (acc[log.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedSources = Object.entries(sourceCounts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  
  const topSourcesData = sortedSources.slice(0, MAX_SOURCES_DISPLAYED);

  if (topSourcesData.length === 0) {
    return <div className="flex items-center justify-center h-[250px] text-muted-foreground">No data to display</div>;
  }

  const chartConfig = topSourcesData.reduce((acc, source, index) => {
    acc[source.name] = {
      label: source.name,
      color: `hsl(var(--chart-${(index % 5) + 1}))`, // Cycle through 5 chart colors
    };
    return acc;
  }, { count: { label: "Log Count"} } as ChartConfig);


  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <BarChart 
        data={topSourcesData} 
        layout="vertical"
        margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" hide />
        <YAxis 
            dataKey="name" 
            type="category" 
            tickLine={false} 
            axisLine={false} 
            tickMargin={5}
            width={80} // Adjust based on typical source name length
            interval={0} // Show all labels
        />
        <Tooltip 
            cursor={false}
            content={<ChartTooltipContent indicator="dot" />} 
        />
        <Bar dataKey="count" radius={4}>
          {topSourcesData.map((entry, index) => (
             <Cell key={`cell-${index}`} fill={chartConfig[entry.name]?.color || `hsl(var(--chart-1))`} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// Recharts requires Cell to be imported if used explicitly,
// but Bar usually handles colors if fill is provided in data or Bar props.
// For dynamic colors per bar with ChartConfig, explicit Cell usage might be cleaner.
// Let's try without direct Cell import first, relying on Bar's fill prop or data structure.
// Update: After testing, using explicit Cell is better for dynamic colors from chartConfig.
import { Cell } from 'recharts';
