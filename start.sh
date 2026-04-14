#!/bin/sh
set -e

echo "[start] Starting worker..."
node dist/workers/index.js &

echo "[start] Starting API..."
exec node dist/index.js
