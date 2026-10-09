# BASS-Next Web — AI Agent Instructions

Shared by GitHub Copilot and Claude Code. Keep this file short: it loads on every request.
Deep rules live in skills (`.github/skills/*/SKILL.md`). Load the matching skill before editing that domain.
Workflow switches (reports, Jira, Confluence, Azure DevOps, Sonar, base branch) live in `.github/ai-workflow.yml`.

## Response Style

- No filler, no pleasantries, no restating the question.
- Short subject-verb-object sentences. Lists > paragraphs. Max 1 sentence per bullet.
- Prefer symbols: `&`, `>`, `<`, `=`, `->`. Code speaks; minimal prose around it.
- BAD: "Certainly! I'd be happy to help." GOOD: "Function loops array. Returns first match. O(n)."

## Token Budget Rules

- Read `.github/ai-workflow.yml` once per task; do not re-read unchanged files.
- Load only the skill that matches the task (table below). Never load all skills.
- Search (`grep`/symbol search) before reading; read whole functions, not whole files over 500 lines.
- Large files, read by symbol, never in full: `JobOverview.tsx` (~2.4k lines), `useDiagnosticsManager.ts` (~1.8k), `ClaimOverview.tsx` (~1.2k), `GenericField.tsx` (~0.9k), `generics/utils.ts` (~0.8k), `useClaimMaterialsManager.ts` (~0.8k).
- Report only when `reporting.enabled: true` (see `bass-reporting` skill). Default: no report.

## Project

BASS-Next (Bosch After Sales Service): React 19 + Vite 7 + TypeScript SPA for tool repair at Authorized Service Centers. Helm charts on Azure. Pipelines: `devops/azure-pipelines.yaml`.

Stack: React Query 5 (server state), Formik (form state), React Router 7, `@bosch/react-frok` components, `@bosch/frontend.kit-npm` CSS, react-i18next, Vitest + Testing Library + MSW 2.

## Architecture (must follow)

- Metadata-driven forms: Section -> Area -> Field (`src/components/generics/`). Production form shape comes from UIConfiguration API; `data/data<CC>.json` in dev.
- Generics read Formik via `useFormikContext()`; never prop-drill form state.
- Module <-> generics bridge: `GenericFormContext` (`allFields`, `mandatoryFields`, `actionCallbacks`). Field configs name actions (`onValueChange`, `onBlur`, `onAction`) resolved from `actionCallbacks`.
- API: `src/api/services/<domain>/{action.ts, hooks.ts, <domain>.types.ts}` on `src/api/axios-client/axiosClient.ts`.
- Diagnostics (job) context: `useDiagnosticsContext()` (`modules/JobManagement/JobOverview/DiagnosticsContext.tsx`). Claim context: `useClaimContext()` (`modules/ClaimManagement/ClaimOverview/ClaimContext.tsx`).
- Pricing mode: `CountryConfig.diagnosticsConfiguration.discountBase` = `GROSS_PRICE | NET_PRICE` (default GROSS). Read from context; never hardcode.
- Authoritative prices come from backend (recalculate / validate endpoints). Client math only for live row display. See `bass-diagnostics`.
- Permissions: `useHasPermission([PERMISSIONS.X.Y])` from `src/utils/Permissions.ts`; empty array = allowed.
- i18n: edit only `i18n/source/bass-en-US.json`. Other locale files are Crowdin-synced. `t` via `useTranslation("translation", { keyPrefix: "app" })`. No hardcoded UI strings.
- Routes: `src/routes/Routes.tsx`, each wrapped in `ErrorBoundary`; route components call `useBreadcrumbs()`.
- Analytics: `src/analytics/` (`useAnalytics`, `useListTracking`, `useVirtualPageViews`). Add events via registries, not ad-hoc data-layer pushes.
- Styling: SCSS per component; `@/styles/variables.scss` auto-injected; BEM-like class names.
- TS: interfaces for object shapes; `unknown` + guards for dynamic values. Aliases: `@/` and bare `components/`, `modules/`, `hooks/`, `api/`, `utils/`, `types/`.

## Commands

```bash
npm run dev | build | build:dev | build:qa | build:prod
npm run test -- --run <file>   # single file, no watch
npm run test:cov               # coverage
npm run lint | typecheck
npm run commit                 # Commitizen, REQUIRED
```

## Git & Commits

- Base branch + branch pattern: `.github/ai-workflow.yml` (`project.baseBranch`). Never infer from `origin/HEAD`; if base missing/stale, ask.
- Format: `type(scope): PTBASS-#### summary`. Types: feat, fix, docs, style, refactor, perf, test, chore. See `COMMIT_CONVENTIONS.md`.
- Use `npm run commit`; Husky + commitlint + lint-staged enforce format & lint.
- Agents never push or open PRs unless user asks.

## Definition of Done

1. Matching skill rules followed.
2. Checks from `ai-workflow.yml > checks` pass for changed files.
3. Focused test added/updated for changed behavior.
4. No new hardcoded strings, `any`, or eslint-disable without reason comment.
5. Report written only if `reporting.enabled: true`.

## Skills (load before domain work)

| Skill                        | Load when                                                                                                                             |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `bass-diagnostics`           | Job diagnostics tab: spare-part rows, position/part-number sequence, prices, recalculate, validate-and-save, summary, archived rows   |
| `bass-claims`                | ClaimOverview: claim spare parts, claim prices, `useClaimMaterialsManager`, claim validate / request approval                         |
| `bass-country-config`        | `CountryConfig`, `diagnosticsConfiguration.rules`, `allowedPositions`, `quantitySource`, `discountBase`, `["countryConfiguration",cc]` |
| `bass-uiconfig-system`       | UIConfiguration, field metadata, `fieldMapping`, `mapValuesToAPI`, `convertAPIDataToFormValues`, `GenericFormContext`, field actions  |
| `bass-uiconfiguration-local` | `data/data<CC>.json`, `getUIConfiguration` dev vs deployed split                                                                      |
| `bass-form-validation`       | `useFormValidation`, `useActionWithValidation`, `requiredDependentFields`, autocomplete validation, scroll to error                    |
| `bass-multiple-sections`     | `isMultiple` sections/areas, `setDuplicatedSection/Area`, `addNewMultipleSection`, `deleteSection`, accessories                       |
| `bass-api-domain`            | New `src/api/services/` domain, endpoint, React Query key                                                                             |
| `bass-integrations`          | Any Jira / Confluence / Azure DevOps / SonarQube step                                                                                 |
| `bass-reporting`             | Writing a task report (only when enabled)                                                                                             |

Agent selection: `.github/AGENTS_GUIDE.md`.
