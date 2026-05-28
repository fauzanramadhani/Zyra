.PHONY: build up down restart logs-backend logs-frontend prisma-push seed clean

# Build all Docker containers
build:
	docker compose build

# Start services in detached mode
up:
	docker compose up -d

# Stop services
down:
	docker compose down

# Restart all services
restart:
	docker compose down && docker compose up -d

# View live backend logs
logs-backend:
	docker compose logs -f backend

# View live frontend logs
logs-frontend:
	docker compose logs -f frontend

# Apply Prisma schema updates to DB directly
prisma-push:
	docker compose exec backend npx prisma db push

# Create DB migrations
prisma-migrate:
	docker compose exec backend npx prisma migrate dev

# Seed database with initial setup data
seed:
	docker compose exec backend npm run seed

# Run frontend dev server locally with hot reload (no Docker)
dev-frontend:
	cd frontend && npm run dev

# Run frontend dev via Docker with hot reload
dev-frontend-docker:
	docker compose up frontend -d && docker compose logs -f frontend

# Clean Docker volumes and stop services
clean:
	docker compose down -v
