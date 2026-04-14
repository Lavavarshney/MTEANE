'use client';

import { useCallback, useEffect, useState } from 'react';
import { triggrr, type OrgStats, type Rule, type HealthResponse } from '@/lib/triggrr';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle2, XCircle, TrendingUp, RefreshCw, Activity } from 'lucide-react';

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`w-4 h-4 ${accent ?? 'text-muted-foreground'}`} />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ── Health mini-card ──────────────────────────────────────────────────────────

function HealthMiniCard({ health }: { health: HealthResponse | null }) {
  if (!health) return null;
  const healthy = health.status === 'ok';
  const probes = [
    { name: 'DB', ok: health.db === 'ok' },
    { name: 'Redis', ok: health.redis === 'ok' },
    { name: 'Memory', ok: health.memory === 'ok' },
  ];
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">API Health</CardTitle>
        <Activity className={`w-4 h-4 ${healthy ? 'text-emerald-400' : 'text-red-400'}`} />
      </CardHeader>
      <CardContent>
        <p className={`text-3xl font-bold ${healthy ? 'text-emerald-400' : 'text-red-400'}`}>
          {healthy ? 'Healthy' : 'Degraded'}
        </p>
        <div className="flex gap-3 mt-2">
          {probes.map(p => (
            <div key={p.name} className="flex items-center gap-1 text-xs text-muted-foreground">
              {p.ok
                ? <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                : <XCircle className="w-3 h-3 text-red-400" />}
              {p.name}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const [statsRes, rulesRes, healthRes] = await Promise.all([
        triggrr.stats.get(),
        triggrr.rules.list(),
        triggrr.health.check().catch(() => null),
      ]);
      setStats(statsRes.stats);
      setRules(rulesRes.rules);
      setHealth(healthRes);
      setLastUpdated(new Date());
    } catch {
      // silently skip on auto-refresh failures
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load
  useEffect(() => { void load(); }, [load]);

  // auto-refresh every 10s
  useEffect(() => {
    const id = setInterval(() => { void load(); }, 10_000);
    return () => clearInterval(id);
  }, [load]);

  const successRate = stats ? Math.round(stats.success_rate * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm animate-pulse">
        Loading…
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Live overview of your Triggrr instance. Auto-refreshes every 10 seconds."
        action={
          lastUpdated ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <RefreshCw className="w-3 h-3" />
              {lastUpdated.toLocaleTimeString()}
            </div>
          ) : undefined
        }
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Actions Fired"
          value={stats?.total ?? 0}
          icon={Zap}
          accent="text-sky-400"
        />
        <StatCard
          title="Success Rate"
          value={`${successRate}%`}
          sub={`${stats?.success ?? 0} succeeded · ${stats?.failed ?? 0} failed`}
          icon={TrendingUp}
          accent="text-emerald-400"
        />
        <StatCard
          title="Dead Letter Queue"
          value={stats?.dead ?? 0}
          sub="exhausted after max retries"
          icon={XCircle}
          accent="text-orange-400"
        />
        <HealthMiniCard health={health} />
      </div>

      {/* Active rules + top triggered */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* All rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
              Active Rules
              <Badge variant="secondary" className="ml-auto text-xs">
                {rules.filter(r => r.is_active).length} / {rules.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rules.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No rules yet — go to Scenarios and click &quot;Seed Rule&quot;.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.slice(0, 8).map(rule => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium text-sm">{rule.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {rule.event_type}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {rule.action_type}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Top rules */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Top Triggered Rules
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.top_rules?.length ? (
              <p className="text-sm text-muted-foreground">
                No data yet — fire some events in Scenarios.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead className="text-right">Fires</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.top_rules.map((r, i) => (
                    <TableRow key={r.rule_id}>
                      <TableCell className="text-muted-foreground text-sm">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{r.rule_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{r.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
