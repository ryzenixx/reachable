#!/bin/sh
set -e

cd /var/www/html

APP_KEY_FILE="${APP_KEY_FILE:-/var/www/html/storage/app/runtime/app.key}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-reachable}"
REDIS_HOST="${REDIS_HOST:-redis}"
REDIS_PORT="${REDIS_PORT:-6379}"

if [ -z "${APP_KEY:-}" ]; then
  if [ -f "${APP_KEY_FILE}" ]; then
    APP_KEY="$(cat "${APP_KEY_FILE}")"
    export APP_KEY
    echo "Using persisted APP_KEY from ${APP_KEY_FILE}."
  else
    APP_KEY="base64:$(php -r 'echo base64_encode(random_bytes(32));')"
    export APP_KEY
    mkdir -p "$(dirname "${APP_KEY_FILE}")"
    printf '%s' "${APP_KEY}" > "${APP_KEY_FILE}"
    chmod 600 "${APP_KEY_FILE}" || true
    echo "Generated APP_KEY automatically."
  fi
fi

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" >/dev/null 2>&1; do
  sleep 2
done

echo "Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}..."
until php -r '
  $host = getenv("REDIS_HOST") ?: "redis";
  $port = (int) (getenv("REDIS_PORT") ?: 6379);
  $socket = @fsockopen($host, $port, $errno, $errstr, 2);
  if ($socket !== false) {
      fclose($socket);
      exit(0);
  }
  exit(1);
'; do
  sleep 2
done

php artisan migrate --force

php artisan storage:link >/dev/null 2>&1 || true

exec "$@"
