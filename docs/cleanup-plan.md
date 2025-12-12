# Cleanup Plan - editresume.io

**Generated:** 2025-01-27  
**Status:** Ready for Approval

---

## Task 3: Safe Deletions PR

### High Confidence Removals (0 references confirmed)

#### Files to Delete
1. ✅ `backend/app/models/feedback 2.py` - Duplicate file, identical to `feedback.py`, not imported
2. ✅ `backend/backend/` - Empty directory

#### Dependencies to Remove (Frontend)
3. ✅ `@vercel/speed-insights` - 0 references in code
4. ✅ `react-player` - 0 references in code

#### Unused Imports to Remove (Backend)
5. ✅ `cast` from `app/api/dashboard.py:11` - Imported but never used
6. ✅ `EmailStr` from `app/api/feedback.py:7` - Imported but not used (custom validator used instead)
7. ✅ `word_tokenize` from `app/services/ats_service.py:13` - Fallback function defined, import unused
8. ✅ `word_tokenize` from `app/services/enhanced_ats_service.py:15` - Fallback function defined, import unused
9. ✅ `Matcher` from `app/services/grammar_service.py:16` - Imported but not used (spacy optional)
10. ✅ `Set` from `app/services/keyword_distributor.py:5` - Not used in type hints
11. ✅ `Set` from `app/services/keyword_service.py:3` - Not used in type hints

#### Unused Variables to Fix (Backend)
12. ✅ `best_resume` parameter in `app/services/resume_automation.py:318` - Parameter unused in function body
13. ✅ `cls` in `app/core/config.py:75` - Can use `_` to indicate intentionally unused
14. ✅ `cls` in `app/api/feedback.py:26` - Can use `_` to indicate intentionally unused

**Total:** 14 items ready for removal

---

## Approval Required

**Please approve the following changes:**

1. Delete `backend/app/models/feedback 2.py`
2. Delete `backend/backend/` directory
3. Remove `@vercel/speed-insights` and `react-player` from `frontend/package.json`
4. Remove unused imports from backend files
5. Fix unused variables in backend files

**Impact:** Zero breaking changes - all items have 0 references confirmed by multiple tools.

Proceed with these deletions? (Yes/No)

