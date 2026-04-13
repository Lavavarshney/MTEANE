import type { FastifyInstance } from 'fastify';
import { getHealth } from './health.controller';

export const healthRouter = async (app: FastifyInstance) => {
  app.get('/health', {
    schema: {
      description: `Live-readiness check. Probes three things in parallel and returns a single verdict:

**Database** — runs \`SELECT 1\` against Postgres. Any connection or query error marks \`db: "down"\`.

**Redis** — sends a \`PING\` command via ioredis and expects \`PONG\` back. A timeout, TLS error, or wrong response marks \`redis: "down"\`.

**Memory** — reads the process RSS. If it exceeds 512 MB the field becomes \`memory: "high"\`.

The overall \`status\` is \`"ok"\` only when all three pass; otherwise it is \`"degraded"\` and the HTTP status becomes **503**.

Use this endpoint in your load-balancer / Kubernetes liveness probe. Poll it at ≥ 10 s intervals.`,
      tags: ['Health'],
      security: [],
      response: {
        200: {
          description: 'All subsystems healthy',
          type: 'object',
          properties: {
            status:    { type: 'string', enum: ['ok', 'degraded'], description: '"ok" when all checks pass; "degraded" when any fail (HTTP 503)' },
            db:        { type: 'string', enum: ['ok', 'down'],     description: 'Postgres connectivity' },
            redis:     { type: 'string', enum: ['ok', 'down'],     description: 'Redis/Upstash connectivity' },
            memory:    { type: 'string', enum: ['ok', 'high'],     description: 'Process RSS (threshold: 512 MB)' },
            memory_mb: { type: 'number', description: 'Current RSS in megabytes' },
            uptime:    { type: 'number', description: 'Process uptime in seconds' },
          },
        },
        503: {
          description: 'One or more subsystems are unhealthy — same shape as 200, status field is "degraded"',
          type: 'object',
          properties: {
            status:    { type: 'string', enum: ['degraded'] },
            db:        { type: 'string', enum: ['ok', 'down'] },
            redis:     { type: 'string', enum: ['ok', 'down'] },
            memory:    { type: 'string', enum: ['ok', 'high'] },
            memory_mb: { type: 'number' },
            uptime:    { type: 'number' },
          },
        },
      },
    },
  }, getHealth);
};
