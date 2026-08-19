#!/bin/sh
set -e

mkdir -p "${LOCAL_UPLOAD_DIR:-/app/data/uploads}"

if [ "${SKIP_DB_MIGRATE:-0}" != "1" ]; then
  npx prisma migrate deploy
fi

exec "$@"
