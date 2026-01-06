.PHONY: test test-regression test-unit test-integration lint format type-check install clean

install:
	pip install -r requirements.txt
	pip install -r requirements-dev.txt

lint:
	ruff check app/
	black --check app/

format:
	ruff check app/ --fix
	black app/
	isort app/

type-check:
	mypy app/ --ignore-missing-imports

test:
	pytest tests/ -v

test-regression:
	SKIP_DB_INIT=1 pytest tests/regression/ -v

test-unit:
	pytest tests/unit/ -v

test-integration:
	pytest tests/integration/ -v

test-cov:
	pytest tests/ -v --cov=app --cov-report=html --cov-report=term-missing

check-all: lint type-check test-regression
	@echo "✅ All checks passed!"

test-all-features:
	@echo "Running all regression tests..."
	SKIP_DB_INIT=1 pytest tests/regression/ -v --tb=short

test-new-feature:
	@echo "Run this after adding a new feature:"
	@echo "1. make test-regression  (verify existing features work)"
	@echo "2. make lint             (check code style)"
	@echo "3. make test-all-features (run all regression tests)"
	@echo "See tests/NEW_FEATURE_CHECKLIST.md for complete checklist"

clean:
	find . -type d -name __pycache__ -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type f -name "*.pyo" -delete
	find . -type d -name "*.egg-info" -exec rm -r {} + 2>/dev/null || true
	rm -rf .pytest_cache
	rm -rf .coverage
	rm -rf htmlcov
	rm -rf .mypy_cache

