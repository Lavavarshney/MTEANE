import type { CreateRuleInput } from './triggrr';

export interface Scenario {
  id: string;
  category: 'E-commerce' | 'Auth' | 'DevOps';
  title: string;
  description: string;
  event_type: string;
  payload: Record<string, unknown>;
  /** Matching rule to seed for this scenario */
  rule: CreateRuleInput;
}

export const SCENARIOS: Scenario[] = [
  // ── E-commerce ────────────────────────────────────────────────────────────
  {
    id: 'order-placed',
    category: 'E-commerce',
    title: 'Order Placed',
    description: 'A customer places an order above $200 — notify the fulfilment team via webhook.',
    event_type: 'order.placed',
    payload: { amount: 250, customer_id: 'cus_abc123', plan: 'pro', items: 2 },
    rule: {
      name: 'Webhook on large order (>$200)',
      event_type: 'order.placed',
      condition: { field: 'amount', operator: 'gt', value: 200 },
      action_type: 'webhook',
      action_config: { url: 'https://webhook.site/triggrr-demo' },
    },
  },
  {
    id: 'payment-failed',
    category: 'E-commerce',
    title: 'Payment Failed',
    description: 'A payment attempt fails — alert the ops Slack channel instantly.',
    event_type: 'payment.failed',
    payload: { amount: 99, reason: 'insufficient_funds', customer_id: 'cus_xyz789', attempt: 1 },
    rule: {
      name: 'Slack alert on payment failure',
      event_type: 'payment.failed',
      condition: { field: 'attempt', operator: 'gte', value: 1 },
      action_type: 'slack',
      action_config: { webhook_url: 'https://hooks.slack.com/services/REPLACE/ME' },
    },
  },
  {
    id: 'order-refunded',
    category: 'E-commerce',
    title: 'Order Refunded',
    description: 'An order is refunded — log it to a webhook for finance reconciliation.',
    event_type: 'order.refunded',
    payload: { amount: 250, reason: 'customer_request', order_id: 'ord_001', customer_id: 'cus_abc123' },
    rule: {
      name: 'Webhook on refund',
      event_type: 'order.refunded',
      condition: { field: 'amount', operator: 'gt', value: 0 },
      action_type: 'webhook',
      action_config: { url: 'https://webhook.site/triggrr-demo' },
    },
  },

  // ── Auth ──────────────────────────────────────────────────────────────────
  {
    id: 'user-signup',
    category: 'Auth',
    title: 'User Signup',
    description: 'A new user registers — send a welcome email without touching the auth service.',
    event_type: 'user.signup',
    payload: { email: 'newuser@example.com', plan: 'free', source: 'organic' },
    rule: {
      name: 'Welcome email on free signup',
      event_type: 'user.signup',
      condition: { field: 'plan', operator: 'eq', value: 'free' },
      action_type: 'email',
      action_config: {
        to: 'newuser@example.com',
        subject: 'Welcome!',
        body: 'Hi, your account is ready. Enjoy your free plan.',
      },
    },
  },
  {
    id: 'login-failed',
    category: 'Auth',
    title: 'Login Failed (5+ attempts)',
    description: 'Repeated login failures — alert the security team.',
    event_type: 'user.login_failed',
    payload: { email: 'suspect@example.com', attempts: 5, ip: '203.0.113.42' },
    rule: {
      name: 'Security alert on 5+ failed logins',
      event_type: 'user.login_failed',
      condition: { field: 'attempts', operator: 'gte', value: 5 },
      action_type: 'slack',
      action_config: { webhook_url: 'https://hooks.slack.com/services/REPLACE/ME' },
    },
  },
  {
    id: 'password-reset',
    category: 'Auth',
    title: 'Password Reset Requested',
    description: 'A user requests a password reset — forward to an audit webhook.',
    event_type: 'user.password_reset',
    payload: { email: 'user@example.com', requested_at: new Date().toISOString() },
    rule: {
      name: 'Audit webhook on password reset',
      event_type: 'user.password_reset',
      condition: { field: 'email', operator: 'exists', value: null },
      action_type: 'webhook',
      action_config: { url: 'https://webhook.site/triggrr-demo' },
    },
  },

  // ── DevOps ────────────────────────────────────────────────────────────────
  {
    id: 'deploy-failed',
    category: 'DevOps',
    title: 'Deploy Failed',
    description: 'A production deploy fails — ping the on-call engineer on Slack.',
    event_type: 'deploy.failed',
    payload: { env: 'production', service: 'api', reason: 'OOM', commit: 'a3f8e2c' },
    rule: {
      name: 'Slack on production deploy failure',
      event_type: 'deploy.failed',
      condition: { field: 'env', operator: 'eq', value: 'production' },
      action_type: 'slack',
      action_config: { webhook_url: 'https://hooks.slack.com/services/REPLACE/ME' },
    },
  },
  {
    id: 'alert-triggered',
    category: 'DevOps',
    title: 'Critical Alert Triggered',
    description: 'A critical severity alert fires — notify via webhook.',
    event_type: 'alert.triggered',
    payload: { severity: 'critical', service: 'worker', error_rate: 12.5 },
    rule: {
      name: 'Webhook on critical alert',
      event_type: 'alert.triggered',
      condition: { field: 'severity', operator: 'eq', value: 'critical' },
      action_type: 'webhook',
      action_config: { url: 'https://webhook.site/triggrr-demo' },
    },
  },
  {
    id: 'service-down',
    category: 'DevOps',
    title: 'Service Down',
    description: 'An infrastructure service goes down — fire a Slack alert.',
    event_type: 'service.down',
    payload: { service: 'redis', region: 'us-east-1', downtime_seconds: 0 },
    rule: {
      name: 'Slack alert on service down',
      event_type: 'service.down',
      condition: { field: 'service', operator: 'exists', value: null },
      action_type: 'slack',
      action_config: { webhook_url: 'https://hooks.slack.com/services/REPLACE/ME' },
    },
  },
];

export const CATEGORIES = ['E-commerce', 'Auth', 'DevOps'] as const;
export type Category = (typeof CATEGORIES)[number];

/** All demo rules — used by the "Seed all demo rules" button on /rules */
export const DEMO_RULES: CreateRuleInput[] = SCENARIOS.map(s => s.rule);
