---
name: bass-api-domain
description: "BASS-Next API domain creation rules and React Query keys."
---

# API Domain

## Structure

- `src/api/services/<domain>/action.ts` — raw `axiosClient` calls, no hooks, `try/catch` + `console.error` + rethrow.
- `hooks.ts` — `useQuery` / `useMutation` wrappers, `use<Verb><Resource>`.
- `<domain>.types.ts` — request/response interfaces (some legacy domains keep types in module folders; do not add more).
- Client: `src/api/axios-client/axiosClient.ts` (`VITE_API_BASE_URL`, JWT from `localStorage.token`, `withCredentials`; 401 -> login redirect; 403 on `/auth/me` -> logout).
- Stale/GC: `DEFAULT_STALE_TIME_MS`, `DEFAULT_GC_TIME_MS` (`utils/queryConstants.ts`, env `VITE_STALE_TIME`, `VITE_GC_TIME`, default 5 min). Config caches use `Infinity`.

## Existing Domains

approvals, bareSalesRelation, claims, clientManagement, consent, countryConfiguration, customers, dynamicOptions, file, footer, header, jobs, orders, reimbursements, serviceCenters, sideNav, spareParts, uiConfiguration, users.

## Query Keys (reuse; invalidate by prefix)

`["user"]`, `["countryConfiguration",cc]`, `["UIConfiguration",cc]`, `["jobs"]`, `["job",id]`, `["diagnostic",jobId]`, `["claims"]`, `["claim",id]`, `["approvals"]`, `["messages",id]`, `["attachments"]`, `["autocomplete",...]`, `["dynamicOptions",url,params]`, `["clients"]`, `["client",id]`, `["customerJobs"|"customerAssets"|"customerOrders",id,query]`, `["employees"]`, `["employee",id]`, `["ascProfiles"]`, `["ASC",id]`, `["asc-users",id]`, `["bareSalesRelation",...]`, `["explosionDrawing",...]`.
