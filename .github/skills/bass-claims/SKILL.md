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
- Row delete / restore from archived: `useClaimMaterialsManager` bumps `rowsChangedVersion` -> `onUpdateClaimPricesAfterRowsChange` -> `PUT /v1/claims/{id}/prices` on the settled rows; invalid form -> silent skip (PR #48).
- Each claim row carries its own API material as `sourceMaterial` through load, delete/archive and restore; `buildClaimPayload` reads status/approvedBy from it, never from `claimData.materials[idx]` (PR #48).
- Row naming hazard: `claims_claimSpareParts#N_*` keeps N after a delete and new rows get max+1, so N != position in `materials[]`. PR #53 mapped rows by rank (`getClaimRowMaterialIndex` in `ClaimSparePartsRow.utils.ts`) and synced `onAddRow` by area prefix; commit 814a90e (2026-10-20) restored the `#N` lookup, so the "new row locked after delete" bug is back. `syncMaterialsWithForm` and claim validate paths also use `#i`. Confirm intent before touching.
- "Add row" type: code currently uses `WARRANTY` (814a90e); PR #53 used the claim's `currentJobType` (Radmila's ask, 2026-10-16). Explosion-drawing rows default to `WARRANTY`.
- Claim summary discount/total callbacks are no-ops; claim summary is read-only.
- Statuses: `PENDING`, `REVISED`, `APPROVED`, `REJECTED`.

## Tests

- `ClaimSparePartsRow.utils.test.ts`, `useClaimMaterialsManager.test.ts`, `useClaimMaterialsManager.integration.test.tsx`, `ClaimOverview.test.tsx`, `ClaimSparePartsRow.test.tsx`.
