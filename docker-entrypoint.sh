#!/bin/sh
set -e

if [ "${SKIP_DB_MIGRATE:-0}" != "1" ]; then
  npx prisma migrate deploy
fi

exec "$@"
