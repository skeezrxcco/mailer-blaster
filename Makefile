COMPOSE := docker compose
APP_PROFILE := --profile app
STRIPE_PROFILE := --profile stripe
OLLAMA_MODEL ?= llama3.2:3b

.PHONY: help up up-lite down restart ps logs logs-services logs-app app-up app-down app-restart app-logs stripe-up stripe-down stripe-logs ollama-pull dev clean

help:
	@echo "Available targets:"
	@echo "  make up            # Start infra services (db, redis, nats, mailpit, ollama)"
	@echo "  make up-lite       # Start infra without ollama"
	@echo "  make down          # Stop and remove all containers"
	@echo "  make restart       # Restart infra services"
	@echo "  make ps            # Show containers"
	@echo "  make logs          # Follow logs for infra services"
	@echo "  make logs-services # Follow logs for db, redis, nats, mailpit, ollama"
	@echo "  make app-up        # Start infra + app container"
	@echo "  make app-down      # Stop app container"
	@echo "  make app-restart   # Restart app container"
	@echo "  make app-logs      # Follow app logs"
	@echo "  make ollama-pull   # Pull default/free local model into Ollama"
	@echo "  make stripe-up     # Start Stripe CLI webhook forwarder"
	@echo "  make stripe-down   # Stop Stripe CLI webhook forwarder"
	@echo "  make stripe-logs   # Follow Stripe CLI logs"
	@echo "  make dev           # Start infra, then run app locally"
	@echo "  make clean         # Remove containers, networks, and volumes"

up:
	$(COMPOSE) up -d --build db redis nats mailpit ollama

up-lite:
	$(COMPOSE) up -d --build db redis nats mailpit

down:
	$(COMPOSE) down

restart: down up

ps:
	$(COMPOSE) ps

logs: logs-services

logs-services:
	$(COMPOSE) logs -f db redis nats mailpit ollama

logs-app: app-logs

app-up:
	$(COMPOSE) $(APP_PROFILE) up -d --build

app-down:
	$(COMPOSE) stop app

app-restart:
	$(COMPOSE) restart app

app-logs:
	$(COMPOSE) logs -f app

ollama-pull:
	$(COMPOSE) exec ollama ollama pull $(OLLAMA_MODEL)

stripe-up:
	$(COMPOSE) $(STRIPE_PROFILE) up -d stripe

stripe-down:
	$(COMPOSE) $(STRIPE_PROFILE) stop stripe

stripe-logs:
	$(COMPOSE) $(STRIPE_PROFILE) logs -f stripe

dev: up
	npm run dev

clean:
	$(COMPOSE) down -v --remove-orphans
