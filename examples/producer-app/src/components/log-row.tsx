'use client';

import { useState } from 'react';
import type { ActionLog } from '@/lib/triggrr';
import { TableCell, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, CheckCircle2, XCircle, Clock, AlertTriangle, RotateCcw } from 'lucide-react';

const STATUS_CONFIG: Record<
  string,
  { icon: React.ElementType; iconColor: string; badgeClass: string; label: string }
> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    label: 'success',
  },
  failed: {
    icon: XCircle,
    iconColor: 'text-red-400',
    badgeClass: 'bg-red-500/15 text-red-400 border-red-500/20',
    label: 'failed',
  },
  dead: {
    icon: AlertTriangle,
    iconColor: 'text-orange-400',
    badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
    label: 'dead',
  },
  pending: {
    icon: Clock,
    iconColor: 'text-sky-400',
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    label: 'pending',
  },
  retrying: {
    icon: RotateCcw,
    iconColor: 'text-yellow-400',
    badgeClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
    label: 'retrying',
  },
};

const ACTION_COLORS: Record<string, string> = {
  webhook: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  email: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  slack: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

export function LogRow({ log }: { log: ActionLog }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.pending;
  const Icon = cfg.icon;

  return (
    <>
      <TableRow
        onClick={() => setExpanded(v => !v)}
        className="cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 shrink-0 ${cfg.iconColor}`} />
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}
            >
              {cfg.label}
            </span>
          </div>
        </TableCell>

        <TableCell>
          <p className="text-sm font-medium">{log.rule_name}</p>
        </TableCell>

        <TableCell>
          <code className="text-xs font-mono text-muted-foreground">{log.rule_event_type}</code>
        </TableCell>

        <TableCell>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ACTION_COLORS[log.rule_action_type] ?? ''}`}
          >
            {log.rule_action_type}
          </span>
        </TableCell>

        <TableCell className="text-xs text-muted-foreground tabular-nums">
          {new Date(log.created_at).toLocaleString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          })}
        </TableCell>

        <TableCell className="text-right">
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground inline" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground inline" />
          )}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={6} className="pb-4">
            <div className="grid grid-cols-2 gap-4 text-xs mt-1">
              <div>
                <p className="text-muted-foreground mb-0.5">Event ID</p>
                <p className="font-mono">{log.event_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Rule ID</p>
                <p className="font-mono">{log.rule_id}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Attempts</p>
                <p className="font-mono">{log.attempt_count}</p>
              </div>
              {log.executed_at && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Executed at</p>
                  <p className="font-mono">{new Date(log.executed_at).toLocaleString()}</p>
                </div>
              )}
            </div>
            {log.response_body && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Response</p>
                <pre className="bg-muted rounded p-2 text-xs font-mono overflow-auto max-h-20">
                  {log.response_body}
                </pre>
              </div>
            )}
            {log.error_message && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Error</p>
                <pre className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs font-mono text-red-400 overflow-auto max-h-20">
                  {log.error_message}
                </pre>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
