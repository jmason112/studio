import type { LogEntry, Severity } from '@/lib/types';

// This is an in-memory store. Logs will be lost on server restart.
let logs: LogEntry[] = [
  // Some initial sample data
  {
    id: crypto.randomUUID(),
    timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    source: "AuthService",
    severity: "ERROR",
    message: "Failed login attempt for user 'admin' from IP 192.168.1.100",
    isAnomalous: false,
  },
  {
    id: crypto.randomUUID(),
    timestamp: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    source: "PaymentGateway",
    severity: "INFO",
    message: "Payment processed successfully for order #12345. Amount: $49.99",
    isAnomalous: false,
  },
  {
    id: crypto.randomUUID(),
    timestamp: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
    source: "WebServer",
    severity: "WARNING",
    message: "High CPU utilization detected: 85%",
    isAnomalous: false,
  },
  {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    source: "DatabaseService",
    severity: "CRITICAL",
    message: "Database connection lost. Attempting to reconnect...",
    isAnomalous: false,
  },
  {
    id: crypto.randomUUID(),
    timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    source: "APIServer",
    severity: "DEBUG",
    message: "Request received for /api/users/123",
    isAnomalous: false,
  },
];

export function getLogs(): LogEntry[] {
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function addLog(logData: any): LogEntry {
  // Basic validation and parsing
  // For a real app, robust validation (e.g. Zod) and parsing for different formats would be needed.
  // Assuming logData is an object that can be mapped to LogEntry.
  const newLog: LogEntry = {
    id: crypto.randomUUID(),
    timestamp: logData.timestamp || new Date().toISOString(),
    source: logData.source || "UnknownSource",
    severity: (logData.severity?.toUpperCase() as Severity) || "UNKNOWN",
    message: logData.message || "No message content.",
    data: logData.data, // Store any extra data
    isAnomalous: false,
  };
  logs = [newLog, ...logs]; // Prepend new log
  // Keep only the latest N logs to prevent memory issues in this demo
  if (logs.length > 1000) {
    logs = logs.slice(0, 1000);
  }
  return newLog;
}

export function clearLogs_DANGEROUS(): void {
  logs = [];
}

// Example anomalous log for testing AI (can be POSTed to /api/logs)
// {
//   "timestamp": "2023-10-26T10:05:00Z",
//   "source": "Firewall",
//   "severity": "WARNING",
//   "message": "Multiple outbound connections to suspicious IP 8.8.8.8 from internal host 10.0.1.55"
// }
// {
//   "timestamp": "2023-10-26T10:10:00Z",
//   "source": "AuthService",
//   "severity": "ERROR",
//   "message": "Repeated failed login attempts for user 'root' from IP 203.0.113.45 - potential brute-force attack."
// }
