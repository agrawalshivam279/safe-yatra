.PHONY: help up down logs db-reset test-all lint format-check

help:
	@echo "🛡️  SAFE YATRA — Developer Automation Shortcuts"
	@echo "================================================"
	@echo "make up            - Launch PostgreSQL & Redis containers"
	@echo "make down          - Stop all running containers"
	@echo "make logs          - Tail container logs in real-time"
	@echo "make db-reset      - Reset Prisma migrations and re-seed database"
	@echo "make test-all      - Execute test suites across all modules"
	@echo "make lint          - Run linters across TypeScript and Python modules"
	@echo "make format-check  - Verify code formatting compliance"

up:
	docker-compose up -d postgres redis

down:
	docker-compose down

logs:
	docker-compose logs -f

db-reset:
	cd backend-spatial && npx prisma migrate reset --force

test-all:
	@echo "Running tests across all Safe Yatra modules..."
	@if [ -d "ml-risk-engine/tests" ]; then cd ml-risk-engine && pytest; fi
	@if [ -d "backend-spatial/tests" ]; then cd backend-spatial && npm test; fi

lint:
	@echo "Running lint checks across modules..."
	@if [ -f "ml-risk-engine/requirements.txt" ]; then cd ml-risk-engine && ruff check .; fi
	@if [ -f "backend-spatial/package.json" ]; then cd backend-spatial && npm run lint --if-present; fi
	@if [ -f "admin-dashboard/package.json" ]; then cd admin-dashboard && npm run lint --if-present; fi

format-check:
	@echo "Checking formatting compliance..."
	npx prettier --check "**/*.{ts,tsx,js,jsx,json,md,yml,yaml}"
