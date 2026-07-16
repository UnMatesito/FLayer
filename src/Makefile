.PHONY: dev setup backend frontend install test lint reset-db

dev:
	poetry run uvicorn backend.main:app --reload --port 8000 & cd frontend && pnpm dev

setup:
	poetry run alembic upgrade head
	poetry run python -m backend.scripts.seed
	poetry run uvicorn backend.main:app --reload --port 8000 & cd frontend && pnpm dev

install:
	poetry install
	cd frontend && pnpm install
	cd ..

test:
	poetry run pytest tests/ -v

lint:
	poetry run ruff check backend/ tests/

reset-db:
	docker exec flayer-db psql -U flayer -d postgres -c "DROP DATABASE IF EXISTS flayer WITH (FORCE);"
	docker exec flayer-db psql -U flayer -d postgres -c "CREATE DATABASE flayer;"
	poetry run alembic upgrade head
	poetry run python -m backend.scripts.seed
