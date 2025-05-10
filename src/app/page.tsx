"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { AppHeader } from '@/components/dashboard/app-header';
import { LogFilters } from '@/components/dashboard/log-filters';
import { LogTable } from '@/components/dashboard/log-table';
import { AnomalyDetectionSection } from '@/components/dashboard/anomaly-detection-section';
import type { LogEntry, Filters, Severity, AnomalousEvent } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { parseISO, isWithinInterval } from 'date-fns';

// API interaction functions
const fetchLogs = async (): Promise<LogEntry[]> => {
  const response = await fetch('/api/logs');
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  return response.json();
};

const clearServerLogs = async () => {
    const response = await fetch('/api/logs', { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Failed to clear logs on server');
    }
    return response.json();
};


export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allLogs = [], isLoading: isLoadingLogs, error: logsError } = useQuery<LogEntry[]>({
    queryKey: ['logs'],
    queryFn: fetchLogs,
    refetchInterval: 5000, // Poll for new logs every 5 seconds
  });

  const clearLogsMutation = useMutation({
    mutationFn: clearServerLogs,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast({ title: "Success", description: "All logs cleared from server demo store." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: `Failed to clear logs: ${error.message}`, variant: "destructive" });
    },
  });

  const [filters, setFilters] = useState<Filters>({
    searchTerm: "",
    sources: [],
    severities: [],
    dateRange: { from: undefined, to: undefined },
  });

  const [clientSideLogs, setClientSideLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    setClientSideLogs(allLogs);
  }, [allLogs]);


  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
  }, []);

  const handleClearIngestedLogs = () => {
    // This function now calls the mutation to clear logs on the server.
    // Client-side log clearing will happen automatically due to query invalidation.
    clearLogsMutation.mutate();
  };


  const availableSources = useMemo(() => {
    const sources = new Set(clientSideLogs.map(log => log.source));
    return Array.from(sources).sort();
  }, [clientSideLogs]);

  const filteredLogs = useMemo(() => {
    return clientSideLogs.filter(log => {
      const searchTermMatch = filters.searchTerm
        ? log.message.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          log.source.toLowerCase().includes(filters.searchTerm.toLowerCase())
        : true;
      
      const sourceMatch = filters.sources.length > 0
        ? filters.sources.includes(log.source)
        : true;
        
      const severityMatch = filters.severities.length > 0
        ? filters.severities.includes(log.severity)
        : true;

      let dateMatch = true;
      if (filters.dateRange.from || filters.dateRange.to) {
        const logDate = parseISO(log.timestamp);
        const fromDate = filters.dateRange.from;
        const toDate = filters.dateRange.to;
        if (fromDate && toDate) {
          dateMatch = isWithinInterval(logDate, { start: fromDate, end: toDate });
        } else if (fromDate) {
          dateMatch = logDate >= fromDate;
        } else if (toDate) {
          dateMatch = logDate <= toDate;
        }
      }
      
      return searchTermMatch && sourceMatch && severityMatch && dateMatch;
    });
  }, [clientSideLogs, filters]);


  const handleAnomaliesDetected = useCallback((anomalousEvents: AnomalousEvent[]) => {
    setClientSideLogs(prevLogs => {
      return prevLogs.map(log => {
        const matchedAnomaly = anomalousEvents.find(
          ae => ae.timestamp === log.timestamp && ae.message === log.message && ae.source === log.source
        );
        if (matchedAnomaly) {
          return {
            ...log,
            isAnomalous: true,
            anomalyExplanation: matchedAnomaly.explanation,
          };
        }
        // Reset if not in current batch of anomalies
        return { ...log, isAnomalous: log.isAnomalous && anomalousEvents.some(ae => ae.timestamp === log.timestamp && ae.message === log.message), anomalyExplanation: log.isAnomalous && anomalousEvents.some(ae => ae.timestamp === log.timestamp && ae.message === log.message) ? log.anomalyExplanation : undefined};
      });
    });
  }, []);


  if (logsError) {
    return (
      <div className="flex flex-col min-h-screen">
        <AppHeader />
        <main className="flex-grow container mx-auto p-4 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-destructive mb-2">Failed to load logs</h2>
            <p className="text-muted-foreground">{logsError.message}</p>
            <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['logs'] })} className="mt-4">
              Retry
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 space-y-6">
        <LogFilters 
          onFilterChange={handleFilterChange} 
          onClearIngestedLogs={handleClearIngestedLogs}
          disabled={isLoadingLogs || clearLogsMutation.isPending}
          availableSources={availableSources}
        />
        <LogTable logs={filteredLogs} isLoading={isLoadingLogs} />
        <AnomalyDetectionSection 
          logs={filteredLogs} // Or pass `clientSideLogs` if AI should scan all logs regardless of filters
          onAnomaliesDetected={handleAnomaliesDetected}
        />
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        LogLens &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
