#!/bin/sh
set -e

cd /var/www/html

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-reachable}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_USERNAME}" >/dev/null 2>&1; do
  sleep 2
done

echo "Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT}..."
until php -r '
  $host = getenv("REDIS_HOST") ?: "127.0.0.1";
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

echo "Reachable bootstrap completed."
