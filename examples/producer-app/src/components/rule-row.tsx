'use client';

import { useState } from 'react';
import { triggrr, type Rule } from '@/lib/triggrr';
import { TableCell, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Trash2, ToggleLeft, ToggleRight, Clock, CheckCircle2, Pencil } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  webhook: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  email: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
  slack: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
};

interface RuleRowProps {
  rule: Rule;
  onChanged: () => void;
  onEdit: (rule: Rule) => void;
}

export function RuleRow({ rule, onChanged, onEdit }: RuleRowProps) {
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function toggle() {
    setToggling(true);
    try {
      await triggrr.rules.toggle(rule.id, !rule.is_active);
      toast.success(rule.is_active ? 'Rule paused' : 'Rule activated');
      onChanged();
    } catch (e) {
      toast.error('Failed to update rule', { description: (e as Error).message });
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await triggrr.rules.delete(rule.id);
      toast.success('Rule deleted');
      onChanged();
    } catch (e) {
      toast.error('Failed to delete', { description: (e as Error).message });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <TableRow className={rule.is_active ? '' : 'opacity-50'}>
      {/* Name + event type */}
      <TableCell>
        <p className="font-medium text-sm">{rule.name}</p>
        <p className="text-xs font-mono text-muted-foreground">{rule.event_type}</p>
      </TableCell>

      {/* Condition */}
      <TableCell>
        <code className="text-xs font-mono bg-muted rounded px-1.5 py-0.5">
          {rule.condition.field} {rule.condition.operator}{' '}
          {JSON.stringify(rule.condition.value)}
        </code>
      </TableCell>

      {/* Action */}
      <TableCell>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${ACTION_COLORS[rule.action_type] ?? ''}`}
        >
          {rule.action_type}
        </span>
      </TableCell>

      {/* Last triggered */}
      <TableCell>
        {rule.last_triggered_at ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            {new Date(rule.last_triggered_at).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Never
          </div>
        )}
      </TableCell>

      {/* Status + actions */}
      <TableCell>
        <Badge variant={rule.is_active ? 'default' : 'secondary'} className="text-xs">
          {rule.is_active ? 'active' : 'paused'}
        </Badge>
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-1 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(rule)}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            title="Edit rule"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            disabled={toggling}
            className="h-7 px-2 text-muted-foreground hover:text-foreground"
            title={rule.is_active ? 'Pause rule' : 'Activate rule'}
          >
            {rule.is_active ? (
              <ToggleRight className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="h-7 px-2 text-muted-foreground hover:text-destructive"
            title="Delete rule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
