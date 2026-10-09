---
name: bass-uiconfiguration-local
description: "Local UIConfiguration files (data/data<CC>.json) and getUIConfiguration dev vs deployed split."
---

# UIConfiguration Local Strategy

- `api/services/uiConfiguration/action.ts` -> `getUIConfiguration(cc)`.
- `import.meta.env.DEV` -> `data/data<UPPERCASE_CC>.json` via `import.meta.glob("../../../../data/data*.json")`.
- Missing local file -> `console.warn` -> falls through to API.
- Deployed -> `GET /v1/countries/{cc}/ui-configuration`.
- Local files today: `dataCN.json`, `dataTR.json`, `dataZA.json` (+ `dashboard.json`, not a UIConfiguration).
- New country: add `data/data<CC>.json` with `{ forms: [...] }`; keep uppercase code.
- Local file changes do not reach QA/prod; backend config must match.
