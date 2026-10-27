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

## Email subscriptions

Email subscriptions are disabled by default for each organization. An owner or administrator can enable them with `PUT /api/organizations/:organizationId/notification-channels/email` and `{ "enabled": true }`. Members can read channel settings with `GET /api/organizations/:organizationId/notification-channels`.

For a published page, `GET /api/public/status-pages/:slug/subscription-channels` lists its available channels. Submit `{ "channel": "email", "email": "person@example.com" }` to `POST /api/public/status-pages/:slug/subscriptions`. The response does not reveal whether the address is already subscribed. Confirmation links expire after 24 hours; opening a link shows a form and submitting it performs the action. Unsubscribe links also require form submission and remain usable if the channel is disabled or the page is unpublished.

Set `BETTER_AUTH_URL` to the externally reachable API origin and configure `SMTP_URL` and `EMAIL_FROM` before enabling email subscriptions. The SMTP transport is currently configured for the installation, not per organization. Requests are limited to 30 confirmation emails per page per minute and one per address per page every five minutes. A successful response can therefore mean a request was suppressed by these limits. Confirmation email delivery is synchronous; event notifications and queued retries are not implemented yet.
