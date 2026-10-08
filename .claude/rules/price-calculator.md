---
paths:
  - "src/utils/priceCalculator.ts"
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
- Triggers (UIConfiguration): row price fields + `sparePartNumber` + summary fields `onBlur`; `position` + `type` `onValueChange`. Rows without `materialId` skip recalculation until validate.
- Claim: `PUT /v1/claims/{id}/prices` on validate.

## `src/utils/priceCalculator.ts` (display math + tests only)

Real exports: `roundToTwo`, `calculatePrices(inputs, changedField, changedValue, mode)`, `resetRowPrices`, `aggregateRowPrices`, `SUMMARY_TYPE_FILTER`, `calculateSummaryTotalAmountDistribution`, `calculateSummaryNetAmountDistribution`, `calculateSummaryDiscountDistribution`, `DISTRIBUTABLE_POSITIONS` (`SP`,`PN`,`AC`), `distributeGrossToRows`, `distributeNetToRows`.

- `GROSS_PRICE`: `suggestedNet = net = qty*unit` -> tax -> `gross` -> `discount = gross*%` -> `total`.
- `NET_PRICE`: `suggestedNet = qty*unit` -> `discount = suggestedNet*%` -> `net` -> tax -> `gross = total`.
- Clamp negatives to 0; tax 0..100; back-calculated negative discount -> 0.
- Mode = `discountBase` (`GROSS_PRICE | NET_PRICE`) from `useDiagnosticsContext()` / `useClaimContext()`. Missing in country config -> managers use `NET_PRICE`.

## Rules

- Never persist client math over a server value. Never inline formulas; use the helpers.
- `useSparePartPriceCalculation` and `distribute*ToRows` are not wired into any screen. Do not re-wire without a ticket.
- Stale row (`roundToTwo(qty*unit) !== suggestedNetPrice`) -> flag / recalc via backend, not a stored local value.
- Tests mock `postRecalculatePrices` / `postValidateAndSave` and assert calls, cache writes and rendered server values.
