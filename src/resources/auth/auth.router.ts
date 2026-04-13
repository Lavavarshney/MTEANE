import type { FastifyInstance } from 'fastify';
import { register } from './auth.controller';

export const authRouter = async (app: FastifyInstance) => {
  app.post('/auth/register', {
    schema: {
      description: `Create a new **organisation** tenant and receive a plain-text API key.

**How it works**
1. A UUID organisation row is inserted into the \`organizations\` table.
2. A 64-character hex API key is generated using Node's \`crypto.randomBytes(32)\`.
3. The key is HMAC-SHA256 hashed (using \`API_KEY_SECRET\`) and stored in the \`api_keys\` table — the plain-text key is **never persisted**.
4. The plain-text key is returned once in this response. Store it securely; it cannot be retrieved again.

**Using the API key**
Pass it on every subsequent request as the \`x-api-key\` request header:
\`\`\`
x-api-key: <your-key>
\`\`\`

**Validation rules**
- \`name\` — 1–120 characters, any UTF-8
- \`slug\` — 1–60 characters, lowercase letters / digits / hyphens only (\`^[a-z0-9-]+$\`)
- \`slug\` must be globally unique — a duplicate returns **409**`,
      tags: ['Auth'],
      security: [],
      body: {
        type: 'object',
        required: ['name', 'slug'],
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 120,
            description: 'Human-readable display name of the organisation (e.g. "Acme Corp")',
          },
          slug: {
            type: 'string',
            minLength: 1,
            maxLength: 60,
            pattern: '^[a-z0-9-]+$',
            description: 'Unique URL-safe identifier — lowercase letters, digits and hyphens only (e.g. "acme-corp")',
          },
        },
      },
      response: {
        201: {
          description: 'Organisation created — save the api_key, it will not be shown again',
          type: 'object',
          properties: {
            org_id:  { type: 'string', format: 'uuid', description: 'UUID of the created organisation' },
            api_key: { type: 'string', description: '64-char hex key — HMAC-hashed before storage; shown only once' },
            warning: { type: 'string', description: 'Always: "Store this key — it will never be shown again"' },
          },
        },
        400: {
          description: 'Validation failed — name or slug did not pass the rules above',
          type: 'object',
          properties: {
            message: { type: 'string' },
            errors:  { type: 'array', items: { type: 'object', additionalProperties: true } },
          },
        },
        409: {
          description: 'The slug is already taken by another organisation',
          type: 'object',
          properties: { message: { type: 'string', description: 'e.g. "Organization slug already exists"' } },
        },
      },
    },
  }, register);
};
