'use client';

import { useState } from 'react';
import { triggrr } from '@/lib/triggrr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';

const DEFAULT_PAYLOAD = JSON.stringify({ key: 'value', amount: 100 }, null, 2);

export function CustomEventForm() {
  const [eventType, setEventType] = useState('');
  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(payloadText);
    } catch {
      setError('Payload must be valid JSON');
      return;
    }

    if (!eventType.trim()) {
      setError('Event type is required');
      return;
    }

    setLoading(true);
    try {
      const res = await triggrr.events.send(eventType.trim(), payload);
      toast.success(`Event sent: ${eventType}`, {
        description: `event_id: ${res.event_id}`,
      });
    } catch (err) {
      toast.error('Failed to send event', { description: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Custom Event</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-type">Event Type</Label>
            <Input
              id="event-type"
              value={eventType}
              onChange={e => setEventType(e.target.value)}
              placeholder="e.g. order.placed"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Pattern: <code className="font-mono">noun.verb</code> (lowercase, e.g.{' '}
              <code>user.signup</code>)
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payload">Payload (JSON)</Label>
            <Textarea
              id="payload"
              value={payloadText}
              onChange={e => {
                setPayloadText(e.target.value);
                setError('');
              }}
              rows={8}
              className="font-mono text-sm resize-none"
              placeholder="{}"
            />
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            {loading ? 'Sending…' : 'Fire Custom Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
