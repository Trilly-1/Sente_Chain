.PHONY: help deps tidy build run dev test fmt vet clean check install-migrate check-env health ready migrate-up migrate-down migrate-version migrate-force

# Variables
BIN_NAME := sentechain-backend
BIN_PATH := ./bin/$(BIN_NAME)
GO := go
MIGRATE := ~/go/bin/migrate
MIGRATIONS_PATH := ./migrations

# Load .env if it exists
ifneq (,$(wildcard .env))
	include .env
	export DATABASE_URL
	export MIGRATIONS_DATABASE_URL
	export PORT
endif

# Default target
.DEFAULT_GOAL := help

help:
	@echo "SenteChain Backend - Development Commands"
	@echo ""
	@echo "Core Commands:"
	@echo "  make deps              Install/sync dependencies"
	@echo "  make tidy              Run go mod tidy"
	@echo "  make build             Build binary"
	@echo "  make run               Run the API server"
	@echo "  make dev               Run with hot reload (alias for run)"
	@echo "  make test              Run all tests"
	@echo ""
	@echo "Code Quality:"
	@echo "  make fmt               Format code"
	@echo "  make vet               Run go vet"
	@echo "  make check             Run fmt + vet + test + build (full check)"
	@echo ""
	@echo "Health Checks (requires server running):"
	@echo "  make health            Check /health endpoint"
	@echo "  make ready             Check /ready endpoint"
	@echo ""
	@echo "Migrations:"
	@echo "  make install-migrate   Install golang-migrate CLI"
	@echo "  make migrate-up        Run all pending migrations"
	@echo "  make migrate-down      Rollback one migration"
	@echo "  make migrate-version   Show current migration version"
	@echo "  make migrate-force VERSION=<n>  Force to migration version"
	@echo ""
	@echo "Utilities:"
	@echo "  make check-env         Verify required environment variables"
	@echo "  make clean             Remove build artifacts"
	@echo ""

# Dependencies
deps:
	@echo "📦 Downloading dependencies..."
	$(GO) mod download
	@echo "🧹 Tidying dependencies..."
	$(GO) mod tidy
	@echo "✅ Dependencies ready"

tidy:
	@echo "🧹 Running go mod tidy..."
	$(GO) mod tidy

# Build
build:
	@echo "🔨 Building $(BIN_NAME)..."
	@mkdir -p bin
	$(GO) build -o $(BIN_PATH) ./cmd/api
	@echo "✅ Built: $(BIN_PATH)"

# Run / Dev
run:
	@echo "🚀 Starting SenteChain backend..."
	$(GO) run ./cmd/api

dev: run

# Test
test:
	@echo "🧪 Running tests..."
	$(GO) test ./... -v

# Code quality
fmt:
	@echo "🎨 Formatting code..."
	$(GO) fmt ./...
	@echo "✅ Code formatted"

vet:
	@echo "🔍 Running go vet..."
	$(GO) vet ./...
	@echo "✅ No issues found"

check: fmt vet test build
	@echo "✅ All checks passed"

# Clean
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf bin/
	@echo "✅ Cleaned"

# Health checks
health:
	@echo "❤️  Checking /health endpoint..."
	@curl -s http://localhost:8080/health | python3 -m json.tool || curl -s http://localhost:8080/health

ready:
	@echo "✅ Checking /ready endpoint..."
	@curl -s http://localhost:8080/ready | python3 -m json.tool || curl -s http://localhost:8080/ready

# Migrations
install-migrate:
	@echo "📥 Installing golang-migrate..."
	$(GO) install -tags postgres github.com/golang-migrate/migrate/v4/cmd/migrate@v4.16.2
	@echo "✅ golang-migrate installed at ~/go/bin/migrate"

check-env:
	@echo "🔍 Checking environment variables..."
	@if [ -z "$$DATABASE_URL" ]; then echo "❌ DATABASE_URL not set"; exit 1; fi
	@if [ -z "$$MIGRATIONS_DATABASE_URL" ]; then echo "❌ MIGRATIONS_DATABASE_URL not set"; exit 1; fi
	@if [ -z "$$PORT" ]; then echo "❌ PORT not set"; exit 1; fi
	@echo "✅ All required environment variables are set"

migrate-up: check-env
	@echo "⬆️  Running migrations..."
	@if [ ! -f "$(MIGRATE)" ]; then echo "❌ migrate CLI not found. Run: make install-migrate"; exit 1; fi
	$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(MIGRATIONS_DATABASE_URL)" up
	@echo "✅ Migrations applied"

migrate-down: check-env
	@echo "⬇️  Rolling back one migration..."
	@if [ ! -f "$(MIGRATE)" ]; then echo "❌ migrate CLI not found. Run: make install-migrate"; exit 1; fi
	$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(MIGRATIONS_DATABASE_URL)" down 1
	@echo "✅ Migration rolled back"

migrate-version: check-env
	@echo "📍 Current migration version..."
	@if [ ! -f "$(MIGRATE)" ]; then echo "❌ migrate CLI not found. Run: make install-migrate"; exit 1; fi
	$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(MIGRATIONS_DATABASE_URL)" version

migrate-force: check-env
	@if [ -z "$(VERSION)" ]; then echo "❌ VERSION not specified. Usage: make migrate-force VERSION=1"; exit 1; fi
	@echo "🔧 Forcing migration to version $(VERSION)..."
	@if [ ! -f "$(MIGRATE)" ]; then echo "❌ migrate CLI not found. Run: make install-migrate"; exit 1; fi
	$(MIGRATE) -path $(MIGRATIONS_PATH) -database "$(MIGRATIONS_DATABASE_URL)" force $(VERSION)
	@echo "✅ Forced to version $(VERSION)"
