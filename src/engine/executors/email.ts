import nodemailer from 'nodemailer';
import type { EventWithOrg } from '../../resources/events/events.model';
import type { Executor, ExecutionResult } from './types';
import { config as appConfig } from '../../config';
import { interpolate } from '../../utils/template';

interface EmailConfig {
  to: string;
  subject: string;
  body: string;
}

function isEmailConfig(cfg: unknown): cfg is EmailConfig {
  return (
    typeof cfg === 'object' &&
    cfg !== null &&
    typeof (cfg as Record<string, unknown>).to === 'string' &&
    typeof (cfg as Record<string, unknown>).subject === 'string' &&
    typeof (cfg as Record<string, unknown>).body === 'string'
  );
}

// Module-level singleton — created once, reused across all executions.
// If SMTP_HOST is absent the executor returns a clear error rather than
// crashing the worker on startup.
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!appConfig.SMTP_HOST) return null;
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: appConfig.SMTP_HOST,
    port: appConfig.SMTP_PORT,
    secure: appConfig.SMTP_PORT === 465,
    auth:
      appConfig.SMTP_USER && appConfig.SMTP_PASS
        ? { user: appConfig.SMTP_USER, pass: appConfig.SMTP_PASS }
        : undefined,
  });

  return transporter;
}

export class EmailExecutor implements Executor {
  async execute(rawConfig: unknown, event: EventWithOrg): Promise<ExecutionResult> {
    if (!isEmailConfig(rawConfig)) {
      return { success: false, error: 'Invalid email config: requires to, subject, body' };
    }

    const transport = getTransporter();
    if (!transport) {
      return { success: false, error: 'SMTP not configured — set SMTP_HOST in environment' };
    }

    const context: Record<string, unknown> = {
      event_type: event.event_type,
      payload: event.payload,
      org: { name: event.org_name },
    };

    const subject = interpolate(rawConfig.subject, context);
    const body = interpolate(rawConfig.body, context);

    try {
      const info = await transport.sendMail({
        from: appConfig.SMTP_FROM,
        to: rawConfig.to,
        subject,
        text: body,
      });

      return { success: true, response: `Message sent: ${info.messageId}` };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: `SMTP error: ${message}` };
    }
  }
}
