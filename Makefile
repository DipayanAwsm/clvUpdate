SHELL := /bin/zsh

PROJECT_ROOT := $(shell pwd)
BACKEND_DIR := $(PROJECT_ROOT)/backend
FRONTEND_DIR := $(PROJECT_ROOT)/frontend

PYTHON ?= python3
PIP ?= pip3
NPM ?= npm

API_HOST ?= 0.0.0.0
API_PORT ?= 8000
FRONTEND_PORT ?= 5173
INPUT_CSV ?= $(PROJECT_ROOT)/backend/data/clv_realistic_50000_5yr_with_agentname.csv

.PHONY: help install install-backend install-frontend train train-50k backend frontend dev quickstart docker-up docker-down docker-logs clean-frontend

help:
	@echo "CLV Showcase commands"
	@echo "  make install         - install backend + frontend dependencies"
	@echo "  make train-50k       - train with data/clv_realistic_50000_5yr_with_agentname.csv"
	@echo "  make backend         - run FastAPI on :8000"
	@echo "  make frontend        - run Vite on :5173"
	@echo "  make quickstart      - install + train + print run steps"
	@echo "  make docker-up       - run full stack in Docker"

install-backend:
	cd $(BACKEND_DIR) && $(PIP) install -r requirements.txt

install-frontend:
	cd $(FRONTEND_DIR) && $(NPM) install

install: install-backend install-frontend

train:
	cd $(BACKEND_DIR) && PYTHONPATH=. MPLCONFIGDIR=../.mplconfig $(PYTHON) -m training.run_pipeline --input-csv "$(INPUT_CSV)"

train-50k:
	$(MAKE) train INPUT_CSV="$(PROJECT_ROOT)/backend/data/clv_realistic_50000_5yr_with_agentname.csv"

backend:
	cd $(BACKEND_DIR) && PYTHONPATH=. uvicorn main:app --host $(API_HOST) --port $(API_PORT) --reload

frontend:
	cd $(FRONTEND_DIR) && $(NPM) run dev -- --host 0.0.0.0 --port $(FRONTEND_PORT)

dev:
	@echo "Run in two terminals:"
	@echo "  1) make backend"
	@echo "  2) make frontend"

quickstart: install train-50k
	@echo "Quickstart complete."
	@echo "Start app with:"
	@echo "  make backend"
	@echo "  make frontend"

docker-up:
	docker compose up --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f --tail=120

clean-frontend:
	cd $(FRONTEND_DIR) && rm -rf node_modules dist
