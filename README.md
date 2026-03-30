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
docker compose up -d
```

### First Run

1. Open `http://localhost:3000/setup`
2. Create organization + owner account
3. Continue to `http://localhost:3000/dashboard`

### Default Local URLs

- Status page: `http://localhost:3000`
- Dashboard: `http://localhost:3000/dashboard`
- API: `http://localhost:8009/api/v1`
- WebSocket: `ws://localhost:8080`

## Configuration

Most setups only need these environment variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `POSTGRES_PASSWORD` | `CHANGEME` | Database password |
| `FRONTEND_PORT` | `3000` | Frontend port |
| `API_PORT` | `8009` | API port |
| `REVERB_PORT` | `8080` | WebSocket port |
| `FRONTEND_URL` | `http://localhost:3000` | Public app URL |
| `APP_URL` | `http://localhost:8009` | API base URL |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8009/api/v1` | Frontend API URL |

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
