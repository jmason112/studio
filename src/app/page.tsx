
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { AppHeader } from '@/components/dashboard/app-header';
import { LogFilters } from '@/components/dashboard/log-filters';
import { LogTable } from '@/components/dashboard/log-table';
import { AnomalyDetectionSection } from '@/components/dashboard/anomaly-detection-section';
import { DashboardChartsSection } from '@/components/dashboard/dashboard-charts-section';
import type { LogEntry, Filters, AnomalousEvent } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";
import { parseISO, isWithinInterval } from 'date-fns';
import { Button } from "@/components/ui/button";


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

  // Client-side logs state that can be updated by AI anomaly detection
  const [clientSideLogs, setClientSideLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Initialize clientSideLogs with fetched logs, preserving anomaly flags if any log ID matches
    setClientSideLogs(prevClientLogs => {
      const prevMap = new Map(prevClientLogs.map(log => [log.id, log]));
      return allLogs.map(log => {
        const existingLog = prevMap.get(log.id);
        if (existingLog) {
          // Preserve anomaly status from client if log re-appears from server
          return { ...log, isAnomalous: existingLog.isAnomalous, anomalyExplanation: existingLog.anomalyExplanation };
        }
        return log;
      });
    });
  }, [allLogs]);


  const handleFilterChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
  }, []);

  const handleClearIngestedLogs = () => {
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
        try {
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
        } catch (e) {
          console.warn(`Invalid date format for log: ${log.id}`, log.timestamp);
          dateMatch = false; // Or handle as per requirement, e.g., include if date is invalid
        }
      }
      
      return searchTermMatch && sourceMatch && severityMatch && dateMatch;
    });
  }, [clientSideLogs, filters]);


  const handleAnomaliesDetected = useCallback((anomalousEvents: AnomalousEvent[]) => {
    setClientSideLogs(prevLogs => {
      // Create a Map where the key is a unique identifier string and the value is the AnomalousEvent object
      const anomalyMap = new Map(anomalousEvents.map(ae => [`${ae.timestamp}-${ae.source}-${ae.message}`, ae]));
      
      return prevLogs.map(log => {
        const anomalyKey = `${log.timestamp}-${log.source}-${log.message}`;
        const matchedAnomaly = anomalyMap.get(anomalyKey); // Retrieve the matching AnomalousEvent object

        if (matchedAnomaly) {
          return {
            ...log,
            isAnomalous: true,
            anomalyExplanation: matchedAnomaly.explanation,
          };
        }
        // If not in current anomaly batch, retain original anomaly status unless explicitly cleared elsewhere
        // This logic keeps existing anomalies unless they are re-evaluated.
        // If you want to clear old anomalies not in the new batch, adjust here.
        return {
            ...log,
            // isAnomalous: false, // Option 1: Clear if not in new batch
            // anomalyExplanation: undefined,
            isAnomalous: log.isAnomalous, // Option 2: Retain old status (current behavior implied)
            anomalyExplanation: log.anomalyExplanation,
        };
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
        <DashboardChartsSection logs={filteredLogs} isLoading={isLoadingLogs || clearLogsMutation.isPending} />
        <LogTable logs={filteredLogs} isLoading={isLoadingLogs || clearLogsMutation.isPending} />
        <AnomalyDetectionSection 
          logs={filteredLogs} // Pass filtered logs for targeted scanning
          onAnomaliesDetected={handleAnomaliesDetected}
        />
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        LogLens &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}

