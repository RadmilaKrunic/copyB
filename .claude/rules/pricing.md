---
paths:
  - "src/hooks/useDiagnosticsManager.ts"
  - "src/hooks/useClaimMaterialsManager.ts"
  - "src/modules/JobManagement/JobOverview/**"
  - "src/modules/ClaimManagement/ClaimOverview/**"
---

# Pricing — BASS-Next

Backend is authoritative. Full rules: `.github/skills/bass-diagnostics/SKILL.md` (job) and `.github/skills/bass-claims/SKILL.md` (claim).

## Where prices come from

- Job: field action `onRecalculatePrices` -> `POST /v1/diagnostic/prices/recalculate` with `changes: [{ type, lineId, value, scope }]`; validate -> `POST /v2/jobs/flow/validate-and-save` with the accumulated `changes`.
- Both responses -> `extractDiagnosticFromValidateResponse(data, jobId)` (`JobOverview.utils.ts`) -> `queryClient.setQueryData(["diagnostic", jobId], ...)` -> rows + `priceSummaryDetailed` re-sync.
- Triggers (UIConfiguration): row price fields + `sparePartNumber` + summary fields `onBlur`; `position` + `type` `onValueChange`. Rows without `materialId` skip recalculation until validate; summary `...Material` fields go without a line id. `0` is a valid value. Whole payload validated before the call.
- Row delete / restore -> `rowsChangedVersion` -> recalculate (job, `changes: []`) or claim prices PUT.
- Recalculate returns `id: null` for a line whose part number / type / position changed (new row on save). Null ids/prices are cleared by `clearNullMaterialValues` before sync.
- Claim: `PUT /v1/claims/{id}/prices` on validate.

## Price chain (server values)

No client price calculator exists (`utils/priceCalculator.ts` was removed). The chain below is what server values satisfy; see `.github/skills/bass-diagnostics/references/price-calculation.md`.

- `GROSS_PRICE`: `suggestedNet = net = qty*unit` -> tax -> `gross` -> `discount = gross*%` -> `total`.
- `NET_PRICE`: `suggestedNet = qty*unit` -> `discount = suggestedNet*%` -> `net` -> tax -> `gross = total`.
- Mode = `discountBase` (`GROSS_PRICE | NET_PRICE`) from `useDiagnosticsContext()` / `useClaimContext()`. Missing in country config -> managers use `NET_PRICE`.

## Rules

- Never compute prices on the client or persist local math over a server value; trigger a backend recalculation instead.
- Do not reintroduce a client price calculator without a ticket.
- Row status Revised/Rejected -> Pending is backend-owned; never set it client-side.
- Failed validation: prices 0, summary hidden until a later validation succeeds.
- Tests mock `postRecalculatePrices` / `postValidateAndSave` and assert calls, cache writes and rendered server values.
