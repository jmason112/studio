import { NextResponse } from 'next/server';
import { getLogs, addLog, clearLogs_DANGEROUS } from '@/lib/server/log-store';
import type { LogEntry } from '@/lib/types';

export async function GET() {
  try {
    const logs = getLogs();
    return NextResponse.json(logs);
  } catch (error) {
    console.error("Failed to get logs:", error);
    return NextResponse.json({ message: 'Failed to retrieve logs' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Assuming body is a single log entry or an array of log entries
    if (Array.isArray(body)) {
      const addedLogs: LogEntry[] = [];
      for (const logData of body) {
        addedLogs.push(addLog(logData));
      }
      return NextResponse.json({ message: `${addedLogs.length} logs ingested successfully`, logs: addedLogs }, { status: 201 });
    } else {
      const newLog = addLog(body);
      return NextResponse.json({ message: 'Log ingested successfully', log: newLog }, { status: 201 });
    }
  } catch (error) {
    console.error("Failed to ingest log:", error);
    // Check if error is due to JSON parsing
    if (error instanceof SyntaxError) {
      return NextResponse.json({ message: 'Invalid JSON format in request body' }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to ingest log' }, { status: 500 });
  }
}

// DANGEROUS: Endpoint to clear all logs, for testing purposes only.
// In a real app, this should be protected or removed.
export async function DELETE() {
  try {
    clearLogs_DANGEROUS();
    return NextResponse.json({ message: 'All logs cleared successfully' });
  } catch (error) {
    console.error("Failed to clear logs:", error);
    return NextResponse.json({ message: 'Failed to clear logs' }, { status: 500 });
  }
}
