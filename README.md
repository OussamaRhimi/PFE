# PFE Monorepo Starter

This workspace contains:

- `frontend`: Angular app
- `backend`: Strapi app
- `docker-compose.yml`: PostgreSQL + Strapi + Angular

## Prerequisites

- Docker Desktop (with Compose)

## Quick start

1. Create your local env file at the repository root:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. Start all services:

```bash
docker compose up --build
```

3. Open:

- Angular: http://localhost:4200
- Strapi: http://localhost:1337/admin
- PostgreSQL: localhost:5432

## Stop services

```bash
docker compose down
```

To also remove volumes:

```bash
docker compose down -v
```
