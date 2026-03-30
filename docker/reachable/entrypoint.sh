#!/bin/sh
set -e

cd /var/www/html

APP_KEY_FILE="${APP_KEY_FILE:-/var/www/html/storage/app/runtime/app.key}"
POSTGRES_DB="${POSTGRES_DB:-reachable}"
POSTGRES_USER="${POSTGRES_USER:-reachable}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-CHANGEME}"
PGDATA="${PGDATA:-/var/lib/postgresql/data}"
REDIS_DATA_DIR="${REDIS_DATA_DIR:-/data}"
REACHABLE_DOMAIN="${REACHABLE_DOMAIN:-reachable.localhost}"

export DB_CONNECTION="${DB_CONNECTION:-pgsql}"
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-5432}"
export DB_DATABASE="${DB_DATABASE:-$POSTGRES_DB}"
export DB_USERNAME="${DB_USERNAME:-$POSTGRES_USER}"
export DB_PASSWORD="${DB_PASSWORD:-$POSTGRES_PASSWORD}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export REDIS_CLIENT="${REDIS_CLIENT:-phpredis}"
export QUEUE_CONNECTION="${QUEUE_CONNECTION:-redis}"
export CACHE_STORE="${CACHE_STORE:-redis}"
export SESSION_DRIVER="${SESSION_DRIVER:-redis}"
export APP_URL="${APP_URL:-https://${REACHABLE_DOMAIN}}"
export FRONTEND_URL="${FRONTEND_URL:-https://${REACHABLE_DOMAIN}}"
export INTERNAL_API_URL="${INTERNAL_API_URL:-http://127.0.0.1:8081/api/v1}"
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://${REACHABLE_DOMAIN}/api/v1}"
export NEXT_PUBLIC_REVERB_HOST="${NEXT_PUBLIC_REVERB_HOST:-${REACHABLE_DOMAIN}}"
export NEXT_PUBLIC_REVERB_PORT="${NEXT_PUBLIC_REVERB_PORT:-443}"
export NEXT_PUBLIC_REVERB_SCHEME="${NEXT_PUBLIC_REVERB_SCHEME:-https}"

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

mkdir -p "${PGDATA}" /var/run/postgresql "${REDIS_DATA_DIR}"
chown -R postgres:postgres "${PGDATA}" /var/run/postgresql
chown -R redis:redis "${REDIS_DATA_DIR}"
mkdir -p /var/www/html/storage/traefik
touch /var/www/html/storage/traefik/acme.json
chmod 600 /var/www/html/storage/traefik/acme.json || true

if [ ! -s "${PGDATA}/PG_VERSION" ]; then
  echo "Initializing PostgreSQL data directory..."
  su-exec postgres initdb -D "${PGDATA}" >/dev/null
  su-exec postgres pg_ctl -D "${PGDATA}" -o "-c listen_addresses='127.0.0.1' -p 5432" -w start >/dev/null

  SAFE_POSTGRES_USER="$(printf "%s" "${POSTGRES_USER}" | sed "s/'/''/g")"
  SAFE_POSTGRES_PASSWORD="$(printf "%s" "${POSTGRES_PASSWORD}" | sed "s/'/''/g")"
  SAFE_POSTGRES_DB="$(printf "%s" "${POSTGRES_DB}" | sed "s/'/''/g")"

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

DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = '${SAFE_POSTGRES_DB}') THEN
    EXECUTE format('CREATE DATABASE %I OWNER %I', '${SAFE_POSTGRES_DB}', '${SAFE_POSTGRES_USER}');
  END IF;
END
\$\$;
SQL

  su-exec postgres pg_ctl -D "${PGDATA}" -m fast -w stop >/dev/null
fi

exec "$@"
