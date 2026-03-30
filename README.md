<div align="center">

# Reachable

### Know before your users do.

Open-source status pages and uptime monitoring.  
Free. Self-hostable.

[Quick Start](#quick-start) • [Screenshots](#screenshots) • [Configuration](#configuration)

</div>

---

![Public Status Page](docs/screenshots/public-status-page.png)

## Built For Fast Incident Communication

Reachable gives you a polished public status page and an operations dashboard in one stack, with realtime updates and clean workflows for incidents, maintenance, and subscribers.

### Highlights

- Public status page on `/`
- Dashboard on `/dashboard`
- Realtime updates via WebSocket
- Incident + maintenance workflows
- SMTP notifications

## Quick Start

```bash
git clone https://github.com/ryzenixx/reachable.git
cd reachable
cp .env.example .env
# edit .env -> REACHABLE_DOMAIN, POSTGRES_PASSWORD
docker compose up -d
```

### First Run

1. Reachable is available directly on `http://SERVER_IP:3000`
2. If you use an external reverse proxy, target `HTTP -> SERVER_IP:3000`
3. Open `/setup`, create organization + owner account
4. Continue to `/dashboard`

## Configuration

Most setups only need these environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `REACHABLE_DOMAIN` | `reachable.example.com` | Public domain used in generated links (emails, confirmations) |
| `POSTGRES_PASSWORD` | `CHANGEME` | Database password |

Everything else is configured automatically inside the Reachable image (frontend, API, queue workers, websocket, Redis, PostgreSQL).

Use a `.env` file or your deployment panel to override values.

## Update

```bash
docker compose pull
docker compose up -d
```

## Screenshots

| Dashboard Overview | Dashboard Monitors |
| --- | --- |
| ![Dashboard Overview](docs/screenshots/dashboard-overview.png) | ![Dashboard Monitors](docs/screenshots/dashboard-monitors.png) |

| Dashboard Incidents | Public Status Page |
| --- | --- |
| ![Dashboard Incidents](docs/screenshots/dashboard-incidents.png) | ![Public Status Page](docs/screenshots/public-status-page.png) |

## Development

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## License

AGPL-3.0. See `LICENSE`.
