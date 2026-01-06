# New Feature Development Checklist

Use this checklist when adding new features to ensure code quality and prevent regressions.

## Before Adding Feature

### 1. Feature Module Structure
- [ ] Created feature module directory: `app/features/<feature_name>/`
- [ ] Created `__init__.py` with router export
- [ ] Created `routes.py` with API endpoints
- [ ] Created optional files if needed: `services.py`, `models.py`, `types.py`

### 2. Code Quality
- [ ] Followed Service Factory pattern for dependency injection
- [ ] No global singletons used
- [ ] All endpoints have error handling (try-except)
- [ ] All endpoints have docstrings
- [ ] Type hints added for all function parameters and returns

### 3. Backward Compatibility
- [ ] Old API file (if exists) updated to re-export router
- [ ] Old router registration in `main.py` kept for compatibility
- [ ] No breaking changes to existing API contracts

## After Adding Feature

### 1. Testing (MANDATORY)
- [ ] **Regression tests passed**: `make test-regression`
  - All 17+ existing tests must pass
  - Ensures existing features still work
  
- [ ] **Lint check passed**: `make lint`
  - Code follows style guidelines
  
- [ ] **Type check passed**: `make type-check` (if configured)
  - No type errors

### 2. New Feature Testing (RECOMMENDED)
- [ ] **Unit tests added** for new feature
  - Test business logic
  - Test edge cases
  - Test error handling
  - Location: `tests/unit/test_<feature_name>.py`

- [ ] **Integration tests added** (for complex features)
  - Test API endpoints with TestClient
  - Test database interactions
  - Location: `tests/integration/test_<feature_name>_api.py`

- [ ] **Manual testing performed**
  - Tested in development server
  - Tested with Postman/curl
  - Tested error scenarios

### 3. Documentation
- [ ] Endpoint docstrings include request/response examples
- [ ] Feature module has README.md (for complex features)
- [ ] Updated API documentation if needed

### 4. Service Factory (if using services)
- [ ] Service added to `app/core/service_factory.py`
- [ ] Factory method created: `create_<service_name>()`
- [ ] Dependency function created: `get_<service_name>()`
- [ ] Service injected in endpoints using `Depends()`

## Quick Test Commands

```bash
# 1. Regression tests (MANDATORY - ~30 seconds)
make test-regression

# 2. Lint check (MANDATORY - ~10 seconds)
make lint

# 3. Type check (MANDATORY if configured - ~20 seconds)
make type-check

# 4. All checks (RECOMMENDED)
make check-all

# 5. Run all tests (RECOMMENDED)
make test

# 6. Run with coverage (OPTIONAL)
make test-cov
```

## Minimum Required Steps

For simple features (1-2 endpoints):
1. ✅ Regression tests pass
2. ✅ Lint check passes
3. ✅ Manual testing

For complex features (5+ endpoints):
1. ✅ Regression tests pass
2. ✅ Lint check passes
3. ✅ Unit tests added
4. ✅ Integration tests added
5. ✅ Manual testing

## Common Issues to Avoid

- ❌ **Don't modify existing regression tests** unless behavior change is intentional
- ❌ **Don't use global singletons** - use Service Factory instead
- ❌ **Don't break backward compatibility** - re-export routers from old files
- ❌ **Don't create circular dependencies** - features shouldn't import each other
- ❌ **Don't skip error handling** - all endpoints need try-except blocks

## Notes

- Regression tests protect existing features from breaking
- Unit tests verify new feature works correctly
- Integration tests verify API endpoints work end-to-end
- Manual testing catches UI/UX issues

## Test Coverage Goals

- **Minimum**: Regression tests pass (protects existing features)
- **Recommended**: + Unit tests for new feature (verifies new feature)
- **Ideal**: + Integration tests (verifies end-to-end functionality)

