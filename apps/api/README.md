# API

Install dependencies from the repository root with `bun install`.

From `apps/api`, start the API with:

```sh
bun run dev
```

The API is available at http://localhost:3000.

## Scheduled maintenance transitions

Run the worker in a separate process alongside the API:

```sh
bun run worker
```

A deployment must keep at least one worker running for automatic transitions. The worker checks PostgreSQL every 10 seconds and processes up to 100 transitions per pass. Multiple workers can run together. Transitions may be delayed while no worker or database is available; use a process supervisor in deployments.

When creating a maintenance, `autoStart` and `autoComplete` are optional booleans and both default to `false`. They can also be changed in a maintenance update. When enabled, the worker moves a scheduled maintenance to `in_progress` at or after `startsAt`, and an `in_progress` or `verifying` maintenance to `completed` at or after `endsAt`. Each automatic transition creates a history update marked `automated: true`.

If the worker only sees a scheduled maintenance after its whole window has elapsed, it does not start or complete it. The administration API reports `autoStartMissed: true` while automatic start remains enabled; an administrator can reschedule or update it manually. An already started maintenance with automatic completion enabled is completed on the next worker pass after its end time, including after a restart. These transitions do not send notifications.
