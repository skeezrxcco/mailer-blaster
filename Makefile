COMPOSE := docker compose
STRIPE_PROFILE := --profile stripe

.PHONY: help init ensure-port-3000 app-off up up-lite up-all bootstrap wait-db db-init db-seed down restart ps logs logs-services stripe-up stripe-down stripe-logs dev clean

help:
	@echo "Available targets:"
	@echo "  make init          # Create .env.docker from .env.docker.example if missing"
	@echo "  make ensure-port-3000 # Fail fast if localhost:3000 is already in use"
	@echo "  make up            # Start infra services (db, redis, nats, mailpit)"
	@echo "  make up-lite       # Alias of make up"
	@echo "  make up-all        # Start infra, run DB init + seed, then run app locally on :3000"
	@echo "  make bootstrap     # Alias of make up-all"
	@echo "  make down          # Stop and remove all containers"
	@echo "  make restart       # Restart infra services"
	@echo "  make ps            # Show containers"
	@echo "  make logs          # Follow logs for infra services"
	@echo "  make logs-services # Follow logs for db, redis, nats, mailpit"
	@echo "  make stripe-up     # Start Stripe CLI webhook forwarder"
	@echo "  make stripe-down   # Stop Stripe CLI webhook forwarder"
	@echo "  make stripe-logs   # Follow Stripe CLI logs"
	@echo "  make dev           # Alias of make up-all"
	@echo "  make clean         # Remove containers, networks, and volumes"

init:
	@if [ ! -f .env.docker ]; then cp .env.docker.example .env.docker; echo ".env.docker created from .env.docker.example"; else echo ".env.docker already exists"; fi

ensure-port-3000:
	@lsof -iTCP:3000 -sTCP:LISTEN >/dev/null 2>&1 && { echo "Port 3000 is already in use. Stop that process before starting blastermailer."; exit 1; } || true

app-off:
	@docker rm -f blastermailer-app >/dev/null 2>&1 || true

up:
	$(COMPOSE) up -d db redis nats mailpit

up-lite:
	$(COMPOSE) up -d db redis nats mailpit

wait-db:
	@echo "Waiting for PostgreSQL..."
	@until $(COMPOSE) exec -T db pg_isready -U postgres -d blastermailer >/dev/null 2>&1; do sleep 1; done

db-init: wait-db
	@echo "Initializing database schema..."
	npm run db:generate
	npm run db:push

db-seed: wait-db
	@echo "Seeding essential bootstrap data..."
	npm run db:seed

up-all: init app-off ensure-port-3000 up db-init db-seed ps
	@echo "Bootstrap complete. App: http://localhost:3000"
	npm run dev

bootstrap: up-all

down:
	$(COMPOSE) down

restart: down up

ps:
	$(COMPOSE) ps

logs: logs-services

logs-services:
	$(COMPOSE) logs -f db redis nats mailpit

stripe-up:
	$(COMPOSE) $(STRIPE_PROFILE) up -d stripe

stripe-down:
	$(COMPOSE) $(STRIPE_PROFILE) stop stripe

stripe-logs:
	$(COMPOSE) $(STRIPE_PROFILE) logs -f stripe

dev: up-all

clean:
	$(COMPOSE) down -v --remove-orphans
