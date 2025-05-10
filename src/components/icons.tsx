import type { Severity } from '@/lib/types';
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  Bug,
  HelpCircle,
  Info,
  ShieldAlert,
  type LucideProps,
} from 'lucide-react';

export const SeverityIcons: Record<Severity, React.FC<LucideProps>> = {
  INFO: Info,
  WARNING: AlertTriangle,
  ERROR: AlertOctagon, // XCircle might be too strong, AlertOctagon implies serious error
  CRITICAL: ShieldAlert,
  DEBUG: Bug,
  UNKNOWN: HelpCircle,
};

export const SeverityIconColors: Record<Severity, string> = {
  INFO: "text-sky-500", // Use theme's accent or primary if possible, or a distinct blue
  WARNING: "text-amber-500",
  ERROR: "text-red-500",
  CRITICAL: "text-red-700 dark:text-red-600", // Destructive color could be an option
  DEBUG: "text-slate-500",
  UNKNOWN: "text-slate-400",
};
