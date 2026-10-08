# Getting Started

This guide gets Nexus running on your machine with Docker, then shows how to check that it works.

## Prerequisites

- Node.js 22 and npm 10 or newer
- Docker with Docker Compose
- Go 1.22, only if you want to run the `pdf-worker` tests outside Docker

## 1. Install dependencies

```bash
npm ci --legacy-peer-deps
```

This also installs the Git hooks (Husky), see [Engineering Standards](02-standards-enforcement.md).

## 2. Set up the environment

```bash
cp .env.example .env
```

The API will not start without `ENCRYPTION_SECRET_KEY`, which must be exactly 64 hex characters. It is not in `.env.example`, so generate one:

```bash
echo "ENCRYPTION_SECRET_KEY=$(openssl rand -hex 32)" >> .env
```

The services in `docker-compose.yml` have their own environment variables, so this `.env` is mainly used by `npm run migrate` and by anything you run directly on your machine.

## 3. Start everything

```bash
npm run docker:up
npm run migrate
```

`docker:up` builds all packages with Turborepo and then starts the app services and the monitoring stack with Docker Compose. `migrate` runs the database migrations on your machine against `localhost:5432`, using `DATABASE_URL` from `.env`. `npm run db:setup` runs both steps.

Compose starts Postgres, Kafka, Redis, MinIO, the `api`, `web`, `event-worker`, `email-worker` and `pdf-worker` services, and Prometheus, Loki, Tempo and Grafana.

| What                | URL                           |
| ------------------- | ----------------------------- |
| API                 | http://localhost:3000         |
| Swagger UI          | http://localhost:3000/docs    |
| GraphQL             | http://localhost:3000/graphql |
| Web                 | http://localhost:3001         |
| Grafana             | http://localhost:3090         |
| Prometheus          | http://localhost:9090         |
| MinIO console       | http://localhost:9001         |

Swagger UI is off by default and turned on in `docker-compose.yml` with `SWAGGER_UI_ENABLED=true`.

## 4. Check that it works

```bash
curl http://localhost:3000/health/ready
```

Then create a user:

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"jane@example.com","fullName":"Jane Doe","password":"Str0ng-Passw0rd!"}'
```

You should get a `201` response with the user's `id`, `email`, `fullName`, `status`, `message` and `createdAt`. A `400`, `409` or `422` means the request was rejected, and the response body says why.

The user event then goes through the outbox, `event-worker` publishes it to Kafka, and `email-worker` picks it up. Follow it in the logs:

```bash
docker logs -f nexus-event-worker
docker logs -f nexus-email-worker
```

To actually send emails, `email-worker` needs `SMTP_USER` and `SMTP_PASS`. They are not set in `docker-compose.yml`.

## Running services from source

To work on a service with hot reload, stop its container and run it from the repository root, so it reads the root `.env`:

```bash
docker compose stop api
npm run dev:api:watch
```

This mode has no OpenTelemetry. Use `npm run dev:api:trace` if you need traces.

The workers can be started the same way with `npm run dev:worker:event:fast` and `npm run dev:worker:email:fast`. They connect to Kafka on the host, so add this to `.env` first:

```bash
KAFKA_BROKER=localhost:9092
```

## Useful commands

| Command                  | What it does                                      |
| ------------------------ | ------------------------------------------------- |
| `npm run docker:down`    | Stop and remove all containers                    |
| `npm run docker:rebuild` | Rebuild everything and recreate the containers    |
| `npm run migrate`        | Run database migrations                           |
| `npm run generate:graphql` | Regenerate the GraphQL schema                   |
| `npm run clean`          | Delete build output                               |

## Troubleshooting

- **The API exits right after starting.** Run `docker logs nexus-api`. An "Invalid environment configuration" message lists the missing or invalid variables.
- **`npm run migrate` cannot connect.** Postgres may not be ready yet, or `DATABASE_URL` in `.env` does not point to `localhost:5432`.
- **A port is already in use.** Something else is using 3000, 5432, 6379 or 9092. Stop it, or stop the matching container.
