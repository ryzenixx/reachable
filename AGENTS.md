# Reachable

Reachable is an open-source status page and incident communication product, with
self-hosted and hosted deployments. It does not monitor or ping services. Future
integrations may receive events from external monitoring tools.

## Project structure

- `apps/api`: TypeScript API running on Bun, using Hono, Better Auth, Drizzle,
  and PostgreSQL.
- `apps/web`: React and TypeScript frontend built with Vite.
- `apps/api/src/notifications`: channel-based notifications. Email is currently
  the only implemented channel; do not wire it to authentication without a
  request to do so.
- `compose.yaml`: local PostgreSQL and Mailpit services. Environment files are
  local and must not be committed.

## Implementation

- Organize code by feature. Keep HTTP routes, input validation, database queries,
  and reusable organization access checks separate when they serve distinct
  responsibilities. Avoid speculative abstractions and unnecessary layers.
- Use descriptive names, straightforward TypeScript, and existing patterns.
  Write comments only when they explain something the code cannot make clear.
- Validate external input and check organization membership and permissions on
  the server for every organization-scoped operation. Do not trust client-supplied
  organization or resource IDs as proof of access.
- Keep Better Auth's generated schema in `apps/api/src/db/schema/auth.ts`.
  Put Reachable-specific tables in their own schema files.
- Preserve user changes and do not commit secrets or local `.env` files.

## Migrations

- From `apps/api`, use `bun run --bun drizzle-kit generate` and keep Drizzle's
  automatically generated names; do not supply `--name`.
- Review generated SQL and commit it together with the journal and snapshot.
  Apply migrations with `bun run --bun drizzle-kit migrate` from `apps/api`.
- Do not modify or rename migrations already shared or applied outside local
  development. Add a new migration instead. Do not use `drizzle-kit push` in
  place of the migration history.

## Workflow and verification

- Check current official documentation when choosing or changing libraries,
  integrations, or version-sensitive behavior.
- Do not add test files unless the user explicitly requests them. Verify changes
  with appropriate existing checks or targeted manual checks, and report what
  was verified and any limitations.
- API type check: from `apps/api`, run `bun check --skipLibCheck -p tsconfig.json`.
  This skips dependency declaration checks; do not describe it as a full check.
- Use short English Conventional Commit messages, with a useful scope when
  applicable. The user creates commits; provide a suitable message when asked.
