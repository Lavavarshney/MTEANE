'use client';

import { useCallback, useEffect, useState } from 'react';
import { triggrr, type ActionLog } from '@/lib/triggrr';
import { PageHeader } from '@/components/page-header';
import { LogRow } from '@/components/log-row';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { RefreshCw, ScrollText, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const STATUSES = [
  { value: 'all', label: 'All statuses' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
  { value: 'dead', label: 'Dead' },
  { value: 'pending', label: 'Pending' },
  { value: 'retrying', label: 'Retrying' },
];

const PAGE_SIZE = 20;

export default function LogsPage() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  // Load first page whenever filter changes
  const load = useCallback(() => {
    setLoading(true);
    setLogs([]);
    setNextCursor(null);
    triggrr.logs
      .list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: PAGE_SIZE,
      })
      .then(res => {
        setLogs(res.logs);
        setNextCursor(res.next_cursor);
      })
      .catch(() => toast.error('Failed to load logs'))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function loadMore() {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const res = await triggrr.logs.list({
        status: statusFilter === 'all' ? undefined : statusFilter,
        cursor: nextCursor,
        limit: PAGE_SIZE,
      });
      setLogs(prev => [...prev, ...res.logs]);
      setNextCursor(res.next_cursor);
    } catch {
      toast.error('Failed to load more logs');
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Action Logs"
        description="Every rule execution — click a row to expand details. Use Load more for pagination."
        action={
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4">
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v ?? 'all')}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map(s => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground">
          {logs.length} log{logs.length !== 1 ? 's' : ''} loaded
        </span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm animate-pulse">
              Loading…
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
              <ScrollText className="w-10 h-10 opacity-20" />
              <p className="text-sm">No logs yet — fire some events in Scenarios.</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>Event type</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <LogRow key={log.id} log={log} />
                  ))}
                </TableBody>
              </Table>

              {nextCursor && (
                <div className="flex justify-center p-4 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : null}
                    {loadingMore ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
