"use client";

import type React from 'react';
import { format, parseISO } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { LogEntry } from '@/lib/types';
import { SeverityIcons, SeverityIconColors } from '@/components/icons';
import { cn } from '@/lib/utils';

interface LogTableProps {
  logs: LogEntry[];
  isLoading: boolean;
}

export function LogTable({ logs, isLoading }: LogTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border shadow-md p-6 min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">Loading logs...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-md border shadow-md p-6 min-h-[400px] flex items-center justify-center">
        <p className="text-muted-foreground">No logs to display. Try adjusting filters or ingesting new logs.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-md border shadow-md overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead className="w-[150px]">Source</TableHead>
              <TableHead className="w-[120px]">Severity</TableHead>
              <TableHead>Message</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => {
              const IconComponent = SeverityIcons[log.severity] || SeverityIcons.UNKNOWN;
              const iconColor = SeverityIconColors[log.severity] || SeverityIconColors.UNKNOWN;
              return (
                <TableRow 
                  key={log.id} 
                  className={cn(
                    log.isAnomalous && "bg-accent/20 hover:bg-accent/30",
                    "transition-colors duration-150"
                  )}
                >
                  <TableCell className="font-mono text-xs">
                    {format(parseISO(log.timestamp), "yyyy-MM-dd HH:mm:ss.SSS")}
                  </TableCell>
                  <TableCell className="font-medium">{log.source}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconComponent className={cn("h-4 w-4", iconColor)} />
                      <span className={cn("font-semibold", iconColor)}>{log.severity}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm break-all">
                    {log.message}
                    {log.isAnomalous && log.anomalyExplanation && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="destructive" className="ml-2 cursor-help">Anomaly</Badge>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          <p className="font-sans text-sm"><strong>Anomaly Explanation:</strong> {log.anomalyExplanation}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
