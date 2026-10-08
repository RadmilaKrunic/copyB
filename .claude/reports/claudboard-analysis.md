---
generated_at: "2026-07-01T00:00:00Z"
repo: "C:\\Projects\\Bass\\bassnext.web"
version: "2.1.0"
mode: "single-project"
---

# Claudboard Analysis Report: bassnext.web

## Overview

BASS-Next (Bosch After Sales Service) is a React 19 SPA for managing tool repair workflows at Authorized Service Centers. The application uses a **metadata-driven form system** with dynamic UI generation from JSON configuration, enabling backend-controlled field visibility, validation, and country-specific customization.

**Source files analyzed:** 422 TypeScript/React files  
**Stack detected:** React 19 + TypeScript 5.8 + Vite 7 + Vitest 3  
**Architecture pattern:** Metadata-driven forms (Section → Area → Field hierarchy)

## Quality Score: 6.1/10

| Dimension | Score |
|-----------|-------|
| Testing | 6/10 |
| Architecture | 8/10 |
| Conventions | 7/10 |
| Dependencies | 7/10 |
| CI/CD | 4/10 |
| Documentation | 9/10 |
| Security | 5/10 |
| Observability | 3/10 |

**Adaptive depth:** Medium rules (60-80 lines) + Full rules for architecture and API patterns

## Detected Conventions

### Core Patterns

✓ **Metadata-driven forms** — `GenericForm` → `GenericSection` → `GenericArea` → `GenericField` render forms dynamically from UIConfiguration API  
✓ **API domain pattern** — `src/api/services/{domain}/` with `action.ts` (axios) + `hooks.ts` (React Query) + `types.ts`  
✓ **Path aliases** — 100% adoption of `@/`, `api/`, `components/`, `modules/` — zero relative imports  
✓ **Price calculator** — Complex gross/net/discount/tax calculations centralized in `utils/priceCalculator.ts`

### Conventions

- **Naming:** PascalCase components/interfaces, camelCase functions/variables, kebab-case SCSS files
- **Import style:** Path aliases only (`@/`, `api/`, `components/`, `modules/`) — no relative imports
- **Formatting:** Prettier enforced via pre-commit hooks (semi: true, singleQuote: false, printWidth: 100)
- **Testing:** Vitest + React Testing Library with vitest/globals, test files co-located (`.test.ts`, `.test.tsx`)
- **Error handling:** try-catch with error boundaries per route (`ErrorBoundary` wrappers in Routes.tsx)
- **Logging:** Browser console — no structured logging framework
- **Commit format:** `type(scope): PTBASS-#### message` enforced via Commitizen + pre-commit hooks

## Key Findings

### Strengths

- **Excellent documentation** — Comprehensive README (350 lines) + CLAUDE.md with architecture overview, API patterns, form system, validation, i18n
- **Consistent architecture** — Metadata-driven forms pattern applied across JobOverview, CreateJob, ClaimOverview with zero prop drilling (Formik context consumption)
- **Clean codebase** — Zero console.log in production code (ESLint enforced), zero TODO/FIXME/HACK comments
- **API layer consistency** — 15+ domains follow `action.ts` + `hooks.ts` + `types.ts` pattern
- **Modern tooling** — React 19, Vite 7, TypeScript 5.8, Vitest 3 — all current versions

### Areas for Improvement

⚠ **God classes detected:**
- `JobOverview.tsx` (2189 LOC) — manages entire job lifecycle
- `useDiagnosticsManager.ts` (1598 LOC) — handles diagnostics state + pricing + validation
- `priceCalculator.ts` (589 LOC) — 16 exported functions

⚠ **TypeScript `any` usage (93 occurrences)** — ESLint rule disabled, allowing unchecked types

⚠ **No CI pipeline file** — Tests/lint run only in pre-commit hooks (Azure Pipelines referenced in README but config not in repo)

⚠ **No coverage threshold** — Vitest coverage configured but no minimum enforced

⚠ **No error tracking** — Frontend errors logged to browser console only (no Sentry/Application Insights)

⚠ **No E2E tests** — Only unit/component tests (Vitest + RTL)

## Proposed Artifacts

### CLAUDE.md Updates

Merge with existing file:
- Add "## Skills System" section with index
- Add "## Rules Reference" section with paths: globs
- Preserve existing content (commands, architecture, skills table)

### Rules (6 files)

1. **`typescript-conventions.md`** — TypeScript conventions, path aliases, `any` usage policy, god class thresholds (medium depth, 60-80 lines)
2. **`react-conventions.md`** — React component patterns, hooks usage, Formik context, error boundaries (medium depth)
3. **`api-domain-pattern.md`** — API service layer: action.ts + hooks.ts + types.ts (full depth, 100-120 lines with examples)
4. **`metadata-driven-forms.md`** — Generic form system, Field/Area/Section interfaces, conditional visibility (full depth)
5. **`price-calculator.md`** — Price calculation rules, gross/net distribution, discount base (medium depth)
6. **`testing.md`** — Vitest configuration, RTL patterns, mocking strategy (medium depth)

### Skills (3 new + 6 already documented)

**New skills to generate:**
1. **`bass-generic-field/`** — Add new field type to `GenericField.tsx`
2. **`bass-custom-area/`** — Add custom area to `CustomAreasMapper.tsx`
3. **`bass-diagnostics-material/`** — Modify diagnostic spare parts logic

**Already documented in CLAUDE.md:**
- `bass-api-domain` — Add API service domain
- `bass-uiconfig-system` — UIConfiguration loading/mapping
- `bass-form-validation` — Validation patterns
- `bass-multiple-sections` — `isMultiple` sections
- `bass-diagnostics` — Diagnostics flow
- `bass-country-config` — CountryConfig integration

## Next Steps

Run `/generate` in a fresh session to produce:
- CLAUDE.md updates (merge with existing)
- 6 rules files at medium/full depth
- 3 new skills (bass-generic-field, bass-custom-area, bass-diagnostics-material)

**Estimated context overhead:** ~1050 lines, ~3150 tokens total (CLAUDE.md always loaded; rules loaded when paths: match; skills on-demand)

---

**Analysis mode:** Default (reference service per stack)  
**Run `/analyse --audit` for per-service detail** (not applicable — single-project mode)
