COMPOSE := docker compose
APP_PROFILE := --profile app
STRIPE_PROFILE := --profile stripe

.PHONY: help init up up-lite down restart ps logs logs-services logs-app app-up app-down app-restart app-logs stripe-up stripe-down stripe-logs dev clean

help:
	@echo "Available targets:"
	@echo "  make init          # Create .env.docker from .env.docker.example if missing"
	@echo "  make up            # Start infra services (db, redis, nats, mailpit)"
	@echo "  make up-lite       # Alias of make up"
	@echo "  make down          # Stop and remove all containers"
	@echo "  make restart       # Restart infra services"
	@echo "  make ps            # Show containers"
	@echo "  make logs          # Follow logs for infra services"
	@echo "  make logs-services # Follow logs for db, redis, nats, mailpit"
	@echo "  make app-up        # Start infra + app container"
	@echo "  make app-down      # Stop app container"
	@echo "  make app-restart   # Restart app container"
	@echo "  make app-logs      # Follow app logs"
	@echo "  make stripe-up     # Start Stripe CLI webhook forwarder"
	@echo "  make stripe-down   # Stop Stripe CLI webhook forwarder"
	@echo "  make stripe-logs   # Follow Stripe CLI logs"
	@echo "  make dev           # Start infra, then run app locally"
	@echo "  make clean         # Remove containers, networks, and volumes"

init:
	@if [ ! -f .env.docker ]; then cp .env.docker.example .env.docker; echo ".env.docker created from .env.docker.example"; else echo ".env.docker already exists"; fi

up:
	$(COMPOSE) up -d db redis nats mailpit

up-lite:
	$(COMPOSE) up -d db redis nats mailpit

down:
	$(COMPOSE) down

restart: down up

ps:
	$(COMPOSE) ps

logs: logs-services

logs-services:
	$(COMPOSE) logs -f db redis nats mailpit

logs-app: app-logs

app-up:
	$(COMPOSE) $(APP_PROFILE) up -d --build

app-down:
	$(COMPOSE) stop app

app-restart:
	$(COMPOSE) restart app

app-logs:
	$(COMPOSE) logs -f app

stripe-up:
	$(COMPOSE) $(STRIPE_PROFILE) up -d stripe

stripe-down:
	$(COMPOSE) $(STRIPE_PROFILE) stop stripe

stripe-logs:
	$(COMPOSE) $(STRIPE_PROFILE) logs -f stripe

dev: init up
	npm run dev

clean:
	$(COMPOSE) down -v --remove-orphans
