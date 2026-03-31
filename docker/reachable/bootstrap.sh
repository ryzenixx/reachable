#!/bin/sh
set -e

cd /var/www/html

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"
DB_READY_USERNAME="${DB_READY_USERNAME:-postgres}"
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
POSTGRES_DB="${POSTGRES_DB:-reachable}"
POSTGRES_USER="${POSTGRES_USER:-reachable}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-CHANGEME}"

echo "Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."
until pg_isready -h "${DB_HOST}" -p "${DB_PORT}" -U "${DB_READY_USERNAME}" >/dev/null 2>&1; do
  sleep 2
done

SAFE_POSTGRES_USER="$(printf "%s" "${POSTGRES_USER}" | sed "s/'/''/g")"
SAFE_POSTGRES_PASSWORD="$(printf "%s" "${POSTGRES_PASSWORD}" | sed "s/'/''/g")"
SAFE_POSTGRES_DB="$(printf "%s" "${POSTGRES_DB}" | sed "s/'/''/g")"

echo "Ensuring PostgreSQL role and database exist..."
su-exec postgres psql -v ON_ERROR_STOP=1 --dbname=postgres <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${SAFE_POSTGRES_USER}') THEN
    EXECUTE format('CREATE ROLE %I LOGIN PASSWORD %L', '${SAFE_POSTGRES_USER}', '${SAFE_POSTGRES_PASSWORD}');
  ELSE
    EXECUTE format('ALTER ROLE %I WITH LOGIN PASSWORD %L', '${SAFE_POSTGRES_USER}', '${SAFE_POSTGRES_PASSWORD}');
  END IF;
END
\$\$;
SELECT format('CREATE DATABASE %I OWNER %I', '${SAFE_POSTGRES_DB}', '${SAFE_POSTGRES_USER}')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${SAFE_POSTGRES_DB}')
\gexec
SQL

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

mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views
chown -R www-data:www-data storage/framework
chmod -R ug+rwx storage/framework

php artisan migrate --force
php artisan storage:link >/dev/null 2>&1 || true

echo "Reachable bootstrap completed."
