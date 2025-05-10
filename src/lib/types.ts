export type Severity = "INFO" | "WARNING" | "ERROR" | "CRITICAL" | "DEBUG" | "UNKNOWN";

export interface LogEntry {
  id: string;
  timestamp: string; // ISO 8601 string
  source: string;
  severity: Severity;
  message: string;
  data?: Record<string, any>; // Optional structured data from original log
  isAnomalous?: boolean;
  anomalyExplanation?: string;
}

export interface Filters {
  searchTerm: string;
  sources: string[];
  severities: Severity[];
  dateRange: { from: Date | undefined; to: Date | undefined };
}

// This type is based on the AI flow output schema
export type AnomalousEvent = {
  timestamp: string;
  source: string;
  severity: string; // AI might return string, ensure it's handled or cast to Severity
  message: string;
  isAnomalous: boolean;
  explanation: string;
};
