<div align="center">

#####
  
<img width="371" height="56" alt="image" src="https://github.com/user-attachments/assets/572495b7-08c4-469d-8606-7ffb5bf51420#gh-light-mode-only" />

<img width="371" height="56" alt="image" src="https://github.com/user-attachments/assets/cbbfe6cf-7fe0-41ca-ad2e-f8ee11c9c5ef#gh-dark-mode-only" />

<svg></svg>

### Open-source status pages and uptime monitoring built for the AI era.

Free. Blazing-fast. Self-hostable.

![LICENCE](https://img.shields.io/github/license/reachableapps/reachable?style=flat)
![ISSUES](https://img.shields.io/github/issues/reachableapps/reachable?style=flat)
![STARS](https://img.shields.io/github/stars/reachableapps/reachable?style=flat)
![WATCHERS](https://img.shields.io/github/watchers/reachableapps/reachable?style=flat)

[Quick Start](#quick-start) • [Screenshots](#screenshots) • [Configuration](#configuration)

<img />

</div>

![Public Status Page](docs/screenshots/public-status-page.png)

## Built For Fast Incident Communication

Reachable gives you a polished public status page and an operations dashboard in one stack, with realtime updates and clean workflows for incidents, maintenance, and subscribers.

## Quick Start

```bash
git clone https://github.com/reachableapps/reachable.git
cd reachable
docker compose up -d
```

### First Run

1. Reachable is available directly on `http://SERVER_IP:3000`
2. Create organization and owner account
3. You're all set. configure services, monitors, and SMTP in Settings

## Development

```bash
docker compose -f docker-compose.dev.yml up -d --build
```

## License

AGPL-3.0. See `LICENSE`.
