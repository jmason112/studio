
"use client";

import type React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart";
import type { LogEntry } from '@/lib/types';
import { format, parseISO, startOfDay } from 'date-fns';

interface LogsOverTimeChartProps {
  logs: LogEntry[];
}

const chartConfig = {
  count: { label: "Log Count", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

export function LogsOverTimeChart({ logs }: LogsOverTimeChartProps) {
  const logsByDay = logs.reduce((acc, log) => {
    try {
      const day = format(startOfDay(parseISO(log.timestamp)), 'yyyy-MM-dd');
      acc[day] = (acc[day] || 0) + 1;
    } catch (e) {
      console.warn("Invalid date for log in LogsOverTimeChart", log.id, log.timestamp);
    }
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(logsByDay)
    .map(([date, count]) => ({
      date,
      count,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-[250px] text-muted-foreground">No data to display</div>;
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[250px] w-full">
      <LineChart
        data={chartData}
        margin={{
          top: 5,
          right: 10,
          left: -25, // Adjusted to show YAxis labels better
          bottom: 0,
        }}
      >
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => format(parseISO(value), "MMM d")}
        />
        <YAxis 
            tickLine={false} 
            axisLine={false} 
            tickMargin={8}
            allowDecimals={false} 
        />
        <Tooltip 
            cursor={true}
            content={<ChartTooltipContent indicator="line" />} 
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
