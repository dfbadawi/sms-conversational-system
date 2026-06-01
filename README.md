# SMS Conversational System

A small Bun monorepo for a local SMS conversational system. The runtime topology is `twilio-mock -> api -> postgres/outbox -> redis/bullmq -> worker -> twilio-mock`, with a React/Vite frontend calling the API for admin views.

## Design Docs

Start with [ARCHITECTURE.md](./ARCHITECTURE.md); it is the concise evaluator-facing design document.

## Prerequisites

- Docker (for Postgres and Redis, or the full stack)
- [Bun](https://bun.sh)

## Setup

```sh
cp .env.example .env
bun install
```

## Local Development (recommended)

Run Postgres and Redis in Docker, then start all app services on the host with hot reload:

```sh
bun run dev:infra
bun run db:setup && bun run redis:flush
bun run dev
```

This starts the API, worker, Twilio mock, and frontend together. Open `http://localhost:5173` for the admin UI.

Local service URLs:

- API: `http://localhost:3000`
- Twilio mock: `http://localhost:3002`
- Frontend: `http://localhost:5173`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

`bun run dev` runs `turbo dev`, starting all app services in parallel. Each app reads the root `.env`, which is configured for host-run local dev (`localhost` URLs throughout).

## Docker Compose (full stack)

Run everything in containers:

```sh
docker compose up --build
```

Or use the shortcut:

```sh
bun run docker:build:up
```

To wipe Postgres and Redis data completely, destroy the Docker volumes:

```sh
bun run docker:destroy
```

The root `bun run reset` command also removes local caches, `node_modules`, and `dist` directories. After `reset`, run `bun install` before the local development commands above.

## Simulate An Inbound SMS

```sh
curl -X POST http://localhost:3002/simulate/inbound \
  -H "Content-Type: application/json" \
  -d '{"from":"+5511999999999","body":"hello"}'
```

Or use the Bruno collection in [`_bruno/`](./_bruno/):

1. Open the collection in [Bruno](https://www.usebruno.com/) (**Open Collection** → select `_bruno/`).
2. Select the **dev** or **docker** environment (uses `mockBaseUrl: http://localhost:3002`).
3. Run **twilio-mock → Simulate Inbound**.
4. All endpoints for both **api** and **twilio-mock** are available in the collection.

You can also use the dev simulate panel in the frontend at `http://localhost:5173`.
