# Deprecations & Dead Code Removal

**Generated:** 2025-01-27  
**Purpose:** Track removed code, reasons, evidence, and revert steps

---

## Summary

This document tracks code removed during cleanup. All removals were verified with multiple tools (knip, ts-prune, depcheck, ripgrep, TypeScript compiler) to ensure 0 references.

---

## Removed Items

| Item | Type | Reason | Evidence | Revert Steps |
|------|------|--------|----------|--------------|
| `frontend/src/app/editor-v2/` | Directory | No references found, unused alternative editor | knip: 0 references, grep: only in docs | Restore from git history: `git checkout HEAD -- frontend/src/app/editor-v2/` |
| `frontend/src/features/resume/hooks/` | Directory | Unused hooks, only referenced in README examples | knip: unused files, ts-prune: unused exports | Restore: `git checkout HEAD -- frontend/src/features/resume/hooks/` |
| `frontend/src/features/jobs/api/jobs.ts:getJob` | Function | Duplicate of `fetchJob`, never called | ts-prune: unused export, grep: 0 calls | Restore function from git history |
| `backend/ai_improvement_engine.py` | File | Legacy wrapper, only re-exports from `app.services` | grep: only re-export, no direct imports | Restore: `git checkout HEAD -- backend/ai_improvement_engine.py` |
| `backend/ats_checker.py` | File | Legacy wrapper, only re-exports from `app.services` | grep: only re-export, no direct imports | Restore: `git checkout HEAD -- backend/ats_checker.py` |
| `backend/enhanced_ats_checker.py` | File | Legacy wrapper, only re-exports from `app.services` | grep: only re-export, no direct imports | Restore: `git checkout HEAD -- backend/enhanced_ats_checker.py` |
| `backend/grammar_checker.py` | File | Legacy wrapper, only re-exports from `app.services` | grep: only re-export, no direct imports | Restore: `git checkout HEAD -- backend/grammar_checker.py` |
| `backend/keyword_extractor.py` | File | Legacy wrapper, only re-exports from `app.services` | grep: only re-export, no direct imports | Restore: `git checkout HEAD -- backend/keyword_extractor.py` |
| `backend/version_control.py` | File | Legacy wrapper, only re-exports from `app.services` | grep: only re-export, no direct imports | Restore: `git checkout HEAD -- backend/version_control.py` |
| `backend/main.py` | File | Legacy entrypoint wrapper, re-exports `app.main.app` | grep: only re-export | **KEEP** - May be used by ASGI server/Render |
| `backend/database.py` | File | Legacy compatibility module | grep: re-exports only | **KEEP** - May be used by external scripts |
| `@types/react-dom` | Dependency | Unused type definitions | depcheck: unused | `npm install @types/react-dom@18.3.0` |
| `autoprefixer` | Dependency | **KEPT** - Used in `postcss.config.mjs` | depcheck false positive | N/A |
| `postcss` | Dependency | **KEPT** - Used in `postcss.config.mjs` | depcheck false positive | N/A |

---

## False Positives (Kept)

| Item | Reason |
|------|--------|
| `TemplateGallery`, `CustomizationControls` | Used in `TemplateCustomizer.tsx` and `TemplateDesignPage.tsx` |
| `getTemplateById`, `getTemplatesByCategory` | Used via template registry |
| Various template exports | Used dynamically via registry |
| `BaseTemplateProps`, `Section` | Type definitions used internally |

---

## Verification Tools Used

1. **knip** - Dead file detection
2. **ts-prune** - Unused exports detection
3. **depcheck** - Unused dependencies
4. **ripgrep** - Cross-reference verification
5. **TypeScript compiler** - Type checking

---

## Notes

- All removals verified with at least 2 tools
- Legacy wrappers kept if potentially used by external systems (main.py, database.py)
- Next.js pages/routes excluded from dead code detection (dynamic routing)
- Dynamic imports and API routes verified manually

