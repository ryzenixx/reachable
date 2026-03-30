#!/bin/sh
set -e

cd /var/www/html

if [ -n "${DB_HOST:-}" ]; then
  echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT:-5432}..."

  until pg_isready -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-postgres}" >/dev/null 2>&1; do
    sleep 2
  done
fi

if [ -n "${REDIS_HOST:-}" ]; then
  echo "Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT:-6379}..."

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
fi

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  php artisan migrate --force
fi

php artisan storage:link >/dev/null 2>&1 || true

exec "$@"
