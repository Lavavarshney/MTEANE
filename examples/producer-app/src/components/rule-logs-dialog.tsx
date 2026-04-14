'use client';

import { useEffect, useState } from 'react';
import { triggrr, type ActionLog, type Rule } from '@/lib/triggrr';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { CheckCircle2, XCircle, Clock, AlertTriangle, RotateCcw, RefreshCw, Loader2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<
  string,
  { icon: React.ElementType; iconColor: string; badgeClass: string }
> = {
  success: { icon: CheckCircle2, iconColor: 'text-emerald-400', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  failed:  { icon: XCircle,      iconColor: 'text-red-400',     badgeClass: 'bg-red-500/15 text-red-400 border-red-500/20' },
  dead:    { icon: AlertTriangle, iconColor: 'text-orange-400', badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
  pending: { icon: Clock,        iconColor: 'text-sky-400',     badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
  retrying:{ icon: RotateCcw,   iconColor: 'text-yellow-400',  badgeClass: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
};

function LogEntry({ log }: { log: ActionLog }) {
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
          <div className="flex items-center gap-1.5">
            <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.iconColor}`} />
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full border ${cfg.badgeClass}`}>
              {log.status}
            </span>
          </div>
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {log.event_id.slice(0, 8)}…
        </TableCell>
        <TableCell className="text-xs text-muted-foreground tabular-nums">
          {log.attempt_count}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground tabular-nums">
          {log.executed_at
            ? new Date(log.executed_at).toLocaleString(undefined, {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
              })
            : '—'}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={4} className="pb-3">
            <div className="space-y-2 text-xs mt-1">
              <div>
                <p className="text-muted-foreground mb-0.5">Event ID</p>
                <p className="font-mono">{log.event_id}</p>
              </div>
              {log.response_body && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Response</p>
                  <pre className="bg-muted rounded p-2 font-mono overflow-auto max-h-20 whitespace-pre-wrap">
                    {log.response_body}
                  </pre>
                </div>
              )}
              {log.error_message && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Error</p>
                  <pre className="bg-red-500/10 border border-red-500/20 rounded p-2 font-mono text-red-400 overflow-auto max-h-20 whitespace-pre-wrap">
                    {log.error_message}
                  </pre>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

interface RuleLogsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule: Rule | null;
}

export function RuleLogsDialog({ open, onOpenChange, rule }: RuleLogsDialogProps) {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(false);

  function load() {
    if (!rule) return;
    setLoading(true);
    triggrr.rules
      .getLogs(rule.id)
      .then(res => setLogs(res.logs))
      .catch(() => toast.error('Failed to load rule logs'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (open && rule) load();
    if (!open) setLogs([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule?.id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Logs — {rule?.name ?? ''}</DialogTitle>
          <DialogDescription>
            Last 50 action executions for this rule. Click a row to expand response / error details.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-1">
          {rule && (
            <>
              <Badge variant="secondary" className="font-mono text-xs">{rule.event_type}</Badge>
              <Badge variant="outline" className="text-xs">{rule.action_type}</Badge>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={load} disabled={loading} className="ml-auto h-7 px-2">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </Button>
        </div>

        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm animate-pulse">
            Loading…
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <ScrollText className="w-8 h-8 opacity-20" />
            <p className="text-sm">No logs yet for this rule.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Event ID</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Executed at</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map(log => (
                <LogEntry key={log.id} log={log} />
              ))}
            </TableBody>
          </Table>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
