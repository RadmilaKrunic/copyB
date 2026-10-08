---
name: bass-claims
description: "ClaimOverview: claim spare-part rows, claim prices, useClaimMaterialsManager, claim validate / request approval / decisions."
---

# Claims (ClaimOverview)

## Map

| Piece          | Location                                                                                       |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Page           | `modules/ClaimManagement/ClaimOverview/ClaimOverview.tsx` (~1.2k lines, read by symbol)        |
| Context        | `ClaimOverview/ClaimContext.tsx` -> `useClaimContext()`                                        |
| Rows state     | `src/hooks/useClaimMaterialsManager.ts` (`claimMaterialToMaterialItem`)                        |
| Row / area UI  | `ClaimSparePartsRow`, `ClaimSparePartsArea`, `ClaimArchivedSparePartsArea`, `ClaimSummaryArea` |
| Decisions      | `hooks/useClaimDecisionPermissions.ts`, `ClaimNoteModal` (Revise / Reject / Approve)           |
| API            | `api/services/claims`: `PUT /v1/claims/{id}/prices`, `POST /v1/claims/{id}/decision`, `PATCH /v1/claims/{id}/status/pending`, `POST /v1/claims/bulk-approve` |
| Lists          | `ClaimList`; `ApprovalList` (job Bosch approval; bulk approve only for `BOSCH_APPROVAL_PENDING`, `MULTIPLE_APPROVAL_PENDING`) |

## Rules

- Claim rows reuse diagnostics row components and `buildMaterialsRowValues` (same as diagnostics). Field prefix: `claims_claimSpareParts#<i>_<field>`; archived: `claims_claimArchivedSpareParts`.
- Rows rebuild & re-sync on every fresh claim fetch. Claim row keys are in `MANAGED_ROW_KEY_PREFIXES` so the diagnostics snapshot never overwrites them (PR #9: row 0 lost API prices).
- Rules: matched by claim `actionType` + `jobType` from `CountryConfig.diagnosticsConfiguration.rules`. `PN` position requires `CAN_VIEW_NET_DEALER_PRICE`.
- `discountBase` missing in config -> `NET_PRICE`.
- Validate: `onValidateClaim` -> `buildClaimPayload` -> `handleActionWithValidation("onValidate", ...)` -> `PUT /v1/claims/{id}/prices`; response merged into claim data and synced.
- Request approval enabled only when `arePricesValidatedRef.current && !hasClaimChangesRef.current` (refs, not state — avoids stale render).
- Adding a row / special materials sets `hasClaimChangesRef = true`, `arePricesValidatedRef = false`.
- Row deletion allowed only in edit mode + status `REVISED` (`canDeleteRows`). Status `PENDING` locks material inputs (`isClaimPending`).
- Claim summary discount/total callbacks are no-ops; claim summary is read-only.
- Statuses: `PENDING`, `REVISED`, `APPROVED`, `REJECTED`.

## Tests

- `useClaimMaterialsManager.test.ts`, `useClaimMaterialsManager.integration.test.tsx`, `ClaimOverview.test.tsx`, `ClaimSparePartsRow.test.tsx`.
