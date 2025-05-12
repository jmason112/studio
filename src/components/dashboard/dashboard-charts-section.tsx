
"use client";

import type React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LogSeverityDistributionChart } from './charts/log-severity-distribution-chart';
import { LogsOverTimeChart } from './charts/logs-over-time-chart';
import { TopLogSourcesChart } from './charts/top-log-sources-chart';
import { AnomalySummaryChart } from './charts/anomaly-summary-chart';
import type { LogEntry } from '@/lib/types';
import { AlertCircle, BarChart3, PieChartIcon, Activity } from 'lucide-react';

interface DashboardChartsSectionProps {
  logs: LogEntry[];
  isLoading: boolean;
}

export function DashboardChartsSection({ logs, isLoading }: DashboardChartsSectionProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="shadow-md">
            <CardHeader>
              <CardTitle className="h-6 bg-muted rounded animate-pulse w-3/4"></CardTitle>
              <CardDescription className="h-4 bg-muted rounded animate-pulse w-1/2"></CardDescription>
            </CardHeader>
            <CardContent className="h-[250px] bg-muted rounded animate-pulse"></CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (logs.length === 0 && !isLoading) {
     return (
      <Card className="shadow-md col-span-1 md:col-span-2 lg:col-span-4">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-6 w-6 text-primary" />
            Log Data Visualizations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[250px]">
          <p className="text-muted-foreground">No log data available to display charts. Apply filters or ingest logs.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PieChartIcon className="mr-2 h-5 w-5 text-primary" />
            Severity Distribution
          </CardTitle>
          <CardDescription>Breakdown of logs by severity level.</CardDescription>
        </CardHeader>
        <CardContent>
          <LogSeverityDistributionChart logs={logs} />
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="mr-2 h-5 w-5 text-primary" />
            Logs Over Time
          </CardTitle>
          <CardDescription>Trend of log volume per day.</CardDescription>
        </CardHeader>
        <CardContent>
          <LogsOverTimeChart logs={logs} />
        </CardContent>
      </Card>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-primary" />
            Top Log Sources
          </CardTitle>
          <CardDescription>Most active log sources.</CardDescription>
        </CardHeader>
        <CardContent>
          <TopLogSourcesChart logs={logs} />
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-primary" />
            Anomaly Summary
          </CardTitle>
          <CardDescription>Normal vs. Anomalous logs.</CardDescription>
        </CardHeader>
        <CardContent>
          <AnomalySummaryChart logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
