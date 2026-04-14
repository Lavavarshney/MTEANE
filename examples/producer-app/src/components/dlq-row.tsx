'use client';

import { useState } from 'react';
import { triggrr, type DlqJob } from '@/lib/triggrr';
import { TableCell, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AlertTriangle, RotateCcw, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface DlqRowProps {
  job: DlqJob;
  onRetried: () => void;
}

export function DlqRow({ job, onRetried }: DlqRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);

  async function handleRetry() {
    setRetrying(true);
    try {
      await triggrr.dlq.retry(job.id);
      toast.success('Job re-queued', { description: `Event ${job.eventId.slice(0, 8)}… is back in the queue.` });
      onRetried();
    } catch (err) {
      toast.error('Retry failed', { description: (err as Error).message });
    } finally {
      setRetrying(false);
    }
  }

  const ts = job.timestamp ? new Date(job.timestamp).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }) : '—';

  return (
    <>
      <TableRow
        onClick={() => setExpanded(v => !v)}
        className="cursor-pointer hover:bg-muted/30 transition-colors"
      >
        <TableCell>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0" />
            <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-orange-500/15 text-orange-400 border-orange-500/20">
              dead
            </span>
          </div>
        </TableCell>

        <TableCell>
          <code className="text-xs font-mono text-muted-foreground">{job.eventType}</code>
        </TableCell>

        <TableCell className="max-w-xs">
          <p className="text-xs text-muted-foreground truncate">{job.failedReason || '—'}</p>
        </TableCell>

        <TableCell className="text-xs text-muted-foreground tabular-nums">
          {ts}
        </TableCell>

        <TableCell onClick={e => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetry}
            disabled={retrying}
            className="h-7 px-2.5 text-xs"
          >
            {retrying ? (
              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3 h-3 mr-1.5" />
            )}
            {retrying ? 'Retrying…' : 'Retry'}
          </Button>
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
                <p className="text-muted-foreground mb-0.5">Job ID</p>
                <p className="font-mono">{job.id}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Event ID</p>
                <p className="font-mono">{job.eventId}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-0.5">Final attempt</p>
                <p className="font-mono">{job.finalAttempt ? 'yes' : 'no'}</p>
              </div>
              {job.processedOn && (
                <div>
                  <p className="text-muted-foreground mb-0.5">Last processed</p>
                  <p className="font-mono">{new Date(job.processedOn).toLocaleString()}</p>
                </div>
              )}
            </div>
            {job.failedReason && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-1">Failed reason</p>
                <pre className="bg-red-500/10 border border-red-500/20 rounded p-2 text-xs font-mono text-red-400 overflow-auto max-h-24 whitespace-pre-wrap">
                  {job.failedReason}
                </pre>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
