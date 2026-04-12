#!/usr/bin/env bash
# Triggrr end-to-end demo
# Usage: ./scripts/demo.sh [base_url]
# Example: ./scripts/demo.sh http://localhost:3000
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"
WEBHOOK_URL="https://webhook.site/00000000-0000-0000-0000-000000000000"

echo ""
echo "============================================================"
echo "  Triggrr Demo"
echo "  Target: $BASE_URL"
echo "============================================================"
echo ""

# ── 1. Health check ──────────────────────────────────────────────
echo "[1/6] Health check..."
HEALTH=$(curl -sf "$BASE_URL/health")
echo "      $HEALTH"
echo ""

# ── 2. Register organisation ─────────────────────────────────────
echo "[2/6] Registering organisation..."
SLUG="demo-$(date +%s)"
REGISTER=$(curl -sf -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"name\": \"Demo Org\", \"slug\": \"$SLUG\"}")
echo "      $REGISTER"

API_KEY=$(echo "$REGISTER" | python3 -c "import sys,json; print(json.load(sys.stdin)['api_key'])")
ORG_ID=$(echo "$REGISTER"  | python3 -c "import sys,json; print(json.load(sys.stdin)['org_id'])")
echo "      org_id  : $ORG_ID"
echo "      api_key : ${API_KEY:0:12}..."
echo ""

# ── 3. Create a webhook rule ──────────────────────────────────────
echo "[3/6] Creating webhook rule..."
RULE=$(curl -sf -X POST "$BASE_URL/rules" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "{
    \"name\": \"Pro User Signup\",
    \"event_type\": \"user.signed_up\",
    \"condition\": { \"field\": \"user.plan\", \"operator\": \"eq\", \"value\": \"pro\" },
    \"action_type\": \"webhook\",
    \"action_config\": { \"url\": \"$WEBHOOK_URL\" }
  }")
RULE_ID=$(echo "$RULE" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
echo "      rule_id : $RULE_ID"
echo ""

# ── 4. Send matching event ────────────────────────────────────────
echo "[4/6] Sending matching event..."
EVENT=$(curl -sf -X POST "$BASE_URL/events" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d '{
    "event_type": "user.signed_up",
    "payload": { "user": { "email": "alice@example.com", "plan": "pro" } }
  }')
EVENT_ID=$(echo "$EVENT" | python3 -c "import sys,json; print(json.load(sys.stdin)['event_id'])")
echo "      event_id : $EVENT_ID"
echo "      (event is queued — worker will process it asynchronously)"
echo ""

# ── 5. Poll GET /logs until we see a result ───────────────────────
echo "[5/6] Polling /logs for event result (max 30s)..."
FOUND=false
for i in $(seq 1 10); do
  sleep 3
  LOGS=$(curl -sf "$BASE_URL/logs?rule_id=$RULE_ID&limit=5" \
    -H "x-api-key: $API_KEY")
  COUNT=$(echo "$LOGS" | python3 -c "import sys,json; logs=json.load(sys.stdin)['logs']; print(len(logs))")
  if [ "$COUNT" -gt "0" ]; then
    STATUS=$(echo "$LOGS" | python3 -c "import sys,json; print(json.load(sys.stdin)['logs'][0]['status'])")
    echo "      attempt $i: $COUNT log(s) found — latest status: $STATUS"
    if [ "$STATUS" = "success" ] || [ "$STATUS" = "failed" ]; then
      FOUND=true
      break
    fi
  else
    echo "      attempt $i: no logs yet..."
  fi
done
echo ""

# ── 6. Print stats ────────────────────────────────────────────────
echo "[6/6] Org stats..."
STATS=$(curl -sf "$BASE_URL/stats" -H "x-api-key: $API_KEY")
echo "      $STATS"
echo ""

if [ "$FOUND" = "true" ]; then
  echo "✅  Demo complete! The event was processed and the webhook action fired."
else
  echo "⏳  Demo complete — log not yet visible (worker may still be processing)."
  echo "    Re-run: curl -s \"$BASE_URL/logs?rule_id=$RULE_ID\" -H \"x-api-key: $API_KEY\""
fi
echo ""
echo "📖  Swagger UI: $BASE_URL/docs"
echo ""
