"use client";

import React, { useState } from 'react';
import { flagAnomalousLogs } from '@/ai/flows/flag-anomalous-logs';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, AlertTriangleIcon, Loader2 } from 'lucide-react';
import type { LogEntry, AnomalousEvent } from '@/lib/types';
import { useToast } from "@/hooks/use-toast";

interface AnomalyDetectionSectionProps {
  logs: LogEntry[];
  onAnomaliesDetected: (anomalousEvents: AnomalousEvent[]) => void;
}

export function AnomalyDetectionSection({ logs, onAnomaliesDetected }: AnomalyDetectionSectionProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detectedAnomalies, setDetectedAnomalies] = useState<AnomalousEvent[]>([]);
  const { toast } = useToast();

  const handleScanForAnomalies = async () => {
    if (logs.length === 0) {
      toast({
        title: "No Logs",
        description: "There are no logs to scan for anomalies.",
        variant: "default",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setDetectedAnomalies([]);

    try {
      // Prepare log data for AI. The AI expects a string.
      // We'll send a JSON string representation of essential log fields.
      const logDataForAI = JSON.stringify(
        logs.map(log => ({
          timestamp: log.timestamp,
          source: log.source,
          severity: log.severity,
          message: log.message,
        }))
      );

      const result = await flagAnomalousLogs({ logData: logDataForAI });
      
      if (result.anomalousEvents && result.anomalousEvents.length > 0) {
        setDetectedAnomalies(result.anomalousEvents);
        onAnomaliesDetected(result.anomalousEvents);
        toast({
          title: "Anomalies Detected",
          description: `${result.anomalousEvents.length} potential anomalies found.`,
          variant: "default",
        });
      } else {
        toast({
          title: "No Anomalies Found",
          description: "The AI scan completed and found no anomalous events.",
        });
      }
    } catch (e: any) {
      console.error("Failed to scan for anomalies:", e);
      setError(e.message || "An unexpected error occurred during anomaly detection.");
      toast({
        title: "Error Detecting Anomalies",
        description: e.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mt-6 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="mr-2 h-6 w-6 text-accent" />
          AI-Powered Anomaly Detection
        </CardTitle>
        <CardDescription>
          Scan the current set of logs using AI to identify potentially malicious or unusual patterns.
          Results will highlight logs in the table above and list details here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleScanForAnomalies} disabled={isLoading || logs.length === 0} className="w-full sm:w-auto">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Scanning...
            </>
          ) : (
            "Scan Logs for Anomalies"
          )}
        </Button>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {detectedAnomalies.length > 0 && !isLoading && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Detected Anomalous Events:</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {detectedAnomalies.map((event, index) => (
                <Card key={index} className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="text-sm font-mono"><strong>Timestamp:</strong> {event.timestamp}</p>
                    <p className="text-sm"><strong>Source:</strong> {event.source}</p>
                    <p className="text-sm"><strong>Severity:</strong> {event.severity}</p>
                    <p className="text-sm font-mono"><strong>Message:</strong> {event.message}</p>
                    <p className="text-sm mt-1"><strong>Explanation:</strong> <span className="text-destructive">{event.explanation}</span></p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        {detectedAnomalies.length === 0 && !isLoading && !error && logs.length > 0 && (
           <p className="mt-4 text-sm text-muted-foreground">
            Click "Scan Logs for Anomalies" to begin. Results will appear here.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
