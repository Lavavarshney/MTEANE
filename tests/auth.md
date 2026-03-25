# Auth Middleware Manual Test Cases

These tests validate Day 4 auth requirements:
- Missing header returns 401
- Wrong key returns 403
- Deactivated key returns 403 with specific message
- Valid key returns 200 and request proceeds

## Setup

1. Start API server:

```bash
npm run dev
```

2. Register an org and copy the returned `api_key`:

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Auth Test Org","slug":"auth-test-org-001"}'
```

Expected: `201` and response includes `org_id`, `api_key`, and warning message.

## Test 1: Missing header -> 401

```bash
curl -i -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"event_type":"order.created","payload":{"orderId":"1"}}'
```

Expected:
- HTTP `401`
- Body contains `Missing x-api-key header`

## Test 2: Wrong key -> 403

```bash
curl -i -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: invalid-key" \
  -d '{"event_type":"order.created","payload":{"orderId":"2"}}'
```

Expected:
- HTTP `403`
- Body contains `Invalid API key`

## Test 3: Valid key -> 200

Replace `<API_KEY>` with the key returned by `/auth/register`.

```bash
curl -i -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{"event_type":"order.created","payload":{"orderId":"3"}}'
```

Expected:
- HTTP `200`
- Body contains `{ "event_id": "...", "received_at": "...", "status": "received" }`

## Test 4: Deactivated key -> 403 with specific message

1. Deactivate the key in DB (replace placeholders):

```sql
UPDATE api_keys
SET is_active = false
WHERE key_hash = '<SHA256_OF_API_KEY>';
```

2. Retry events request with same key:

```bash
curl -i -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: <API_KEY>" \
  -d '{"event_type":"order.created","payload":{"orderId":"4"}}'
```

Expected:
- HTTP `403`
- Body contains `API key is inactive`

## Notes

- Hash API key with SHA-256 if you need to update key rows by hash.
- Event route remains `200` for accepted requests.
- Idempotency behavior is handled in event insertion logic and backed by unique index `idx_events_idempotency`.
