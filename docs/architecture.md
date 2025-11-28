# Architecture Overview

This document captures the shared rules we are adopting for both the backend
and frontend codebases. Treat it as the authoritative reference before adding
new modules or refactoring existing logic.

## Guiding Principles
- Prefer small, composable modules with clearly defined responsibilities.
- Enforce one-directional dependencies: presentation → application services → domain → infrastructure.
- Favor typed contracts (Pydantic models, TypeScript types) over ad-hoc dictionaries.
- Automate quality gates (formatters, linters, tests) so the main branch always remains releasable.

## Backend (FastAPI)
- Entry points live in `app/main.py`; all transport concerns stay in `app/api`.
- Domain packages reside under `app/domain/<feature>/` and expose:
  - `models.py` for business entities (Pydantic or dataclasses).
  - `services.py` for application logic.
  - `repositories.py` for persistence or external integrations.
  - `__init__.py` exporting the public API (`__all__`).
- Services may depend on repositories and other services inside their domain, never on FastAPI request objects or database clients directly.
- Cross-domain coordination belongs in `app/services` adapters that compose domain services.
- Configuration is centralised in `app/core/config.py`. New settings must be added there with sensible defaults and explicit types; no direct `os.getenv` calls outside this module.
- Database and external service clients are injected via factories in `app/core` to keep repositories testable.

## Frontend (Next.js/React)
- Organise features under `src/features/<feature>/` with subfolders:
  - `components/` – presentational pieces (≤300 LOC each).
  - `hooks/` – reusable stateful logic (`use*`).
  - `api/` – data access wrappers and query hooks.
  - `types/` – shared TypeScript interfaces and enums.
  - `utils/` – pure helpers.
- Keep `src/components/` only for shared building blocks used across features.
- Enforce layering: feature components use their own hooks/services; cross-feature shared logic must live in `src/lib/` or `src/components/Shared/`.
- Global configuration is colocated in `src/lib/config.ts` with Zod validation for environment variables.
- Styling follows Tailwind tokens or central theme definitions; avoid inline hex values or emojis for icons.

## Testing & Quality
- Backend: unit tests target domain services and repositories; API routes get integration tests. Use pytest with factory fixtures.
- Frontend: unit tests cover hooks and components (React Testing Library). Add Playwright smoke tests for critical flows.
- All new features require tests; bug fixes must include regression coverage.
- CI gates: formatters, eslint/tsc, ruff/black, mypy, pytest, Playwright.

## Documentation & Process
- Record significant architecture changes in `docs/adr/`.
- Update this document when new layers or conventions are introduced.
- Every pull request must reference the relevant architecture section and confirm adherence to the layering and testing rules.


