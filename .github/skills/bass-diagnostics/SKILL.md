---
name: bass-diagnostics
description: "Job diagnostics tab: spare-part rows, position + part-number sequence, backend price recalculation, validate-and-save, summary, archived rows."
---

# Diagnostics (JobOverview `diagnosticData` tab)

## Map

| Piece                       | Location                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| Rows/materials state        | `src/hooks/useDiagnosticsManager.ts` (`useDiagnosticsManager`, `buildMaterialsRowValues`)   |
| Context                     | `modules/JobManagement/JobOverview/DiagnosticsContext.tsx` -> `useDiagnosticsContext()`     |
| Row UI                      | `JobOverview/SparePartsRow/SparePartsRow.tsx` (+ `.components.tsx`)                         |
| Area / summary              | `JobOverview/SparePartsArea/SparePartsArea.tsx`, `SummaryArea.tsx`                          |
| Archived rows               | `JobOverview/ArchivedSparePartsArea`, `ArchivedSparePartsRow`                               |
| Field sequences             | `components/generics/Field/GenericField.tsx` + `GenericField.utils.ts`                      |
| Part number compare         | `JobOverview/SparePartsRow/partNumberUtils.ts`                                              |
| Price editability           | `JobOverview/SparePartsRow/materialPriceEditability.ts`                                     |
| Job-type discount reset     | `JobOverview/SparePartsRow/jobTypeDiscountRepopulation.ts`                                  |
| Price callbacks & mutations | `JobOverview.tsx`: `onRecalculatePrices`, `onValidate`, `buildDiagnosticPayload`            |
| API                         | `api/services/jobs`: `POST /v1/diagnostic/prices/recalculate`, `POST /v2/jobs/flow/validate-and-save` |

## Field Sequences (PR #10, #11, #12 — do not reorder)

Position change (`subtype: diagnosticPosition`):

1. `applyPositionRules` first: reject if `maxCount` already used by other rows (row unchanged); set rule quantity via `resolveQuantityForPosition` (`DEFAULT` -> `defaultQuantity`, `FAULT_CODES` -> fault-code labour qty for LA, `USER` -> untouched); autofill LA `1609888887` / FR `1609888888` + description.
2. `fieldValueChanged` -> `waitForFormCommit()`.
3. Then field's configured action (`onValueChange`, e.g. `onRecalculatePrices`) via `invokeFieldAction`.
4. Positions not in matched rule (special-material SP, claim rows) skip step 1.

Spare part number (`subtype: diagnosticPartNumber`, autocomplete):

1. Typing only sets value + fetches suggestions. No field action.
2. Commit = option select, or blur (exact normalized part-number match preferred, else first suggestion). No match -> not-found error; error survives re-validation.
3. `commitSparePart`: fill row (`handleAutoCompleteSelect`) -> `validateForm` -> not-belongs-to-tool check. Error -> stop.
4. Same part as before (`isSamePartNumber`, ignores spaces/dots/hyphens) -> stop. No recalculation.
5. Else run `onValueChange` then `onBlur` actions once.
6. Cleared value runs no field action until a part is committed.
7. Option buttons keep input focus on `mousedown` (on the native option buttons, not the dropdown div — Sonar rule). Click = only selection; no blur-commit first.

`invokeFieldAction(actionCallbacks, trigger, actionName, name, value)`: `onValueChange` handlers with arity <= 1 get `(value)`; others get `(name, value)`. Async errors are logged, not thrown.

## Pricing (source of truth = backend)

- `onRecalculatePrices(fieldName, value)` -> skip if pending or value `null | undefined | ""` (`isRecalculationValueEmpty`; `0` is sent) -> skip row fields without `materialId` -> validate the whole payload (`getRecalculationPayloadErrors(allFields, validateByAction("validate", values))`: every `diagnostic.*` field, all rows + header); errors -> show + `scrollToFirstError`, no call -> `buildDiagnosticPayload` + `changes: [{ type, lineId, value, scope }]` -> `POST /v1/diagnostic/prices/recalculate`.
  - `fieldMapping.originalName` = field name. Row fields: `type` = originalName (`unitPrice`, `discount`, `quantity`...) except `typeMap`: `type`->`jobType`, `sparePartNumber`->`partNumber`, `position`->`position`. `lineId` = row `materialId`, `scope: null`.
  - Only summary fields end in `Material`: sent without a row id (`lineId: ""`), `scope: { positions: ["SP","PN","AC"], jobTypes: ["CHARGEABLE"] }`, typeMap `summarySubtotalMaterial`->`summaryNetAmount`, `summaryTotalAmountMaterial`->`summaryTotalAmount`, `summaryDiscount(Net)Material`->`summaryDiscount`. Test fixtures must use real field names (PR #52).
  - Sets `arePricesValidated = false`; ignored while mutation pending.
  - Changes accumulate in `recalculatedPricesChanges` and are re-sent on validate.
- Row delete / restore from archived: manager bumps `rowsChangedVersion` once rows settle -> `onRecalculatePricesAfterRowsChange` sends the settled rows with `changes: []`. Invalid payload -> silent skip (Validate reports errors). PR #47, #48.
- Recalculate returns `id: null` for a line whose part number, type or position changed; backend treats it as a new row on save. `syncData` writes form values by row index, not id.
- Field triggers (UIConfiguration `data/data<CC>.json`): row price fields (quantity, unitPrice, suggestedNetPrice, netAmount, tax, taxAmount, grossAmount, discount, discountNet, totalAmount), `sparePartNumber` and summary fields -> `onBlur: onRecalculatePrices`; `position` and `type` -> `onValueChange: onRecalculatePrices`. `onNonPriceFieldChange` was removed; do not reintroduce it.
- Row without `materialId` (new, never saved) -> row-field recalculation returns early; its prices arrive on validate-and-save.
- Responses: recalculate + validate both pass through `extractDiagnosticFromValidateResponse(data, jobId)` (`JobOverview.utils.ts`) -> `queryClient.setQueryData(["diagnostic", jobId], ...)`; rows/summary (`priceSummaryDetailed`, `priceSummaryDetailedByJobType`) re-sync from that cache. Render server values; never persist client math over them.
- `onValidate` -> blur active element, `buildDiagnosticPayload` + accumulated `changes` -> `handleActionWithValidation("validate", ...)` -> `POST /v2/jobs/flow/validate-and-save`.
- `onValidate`: action type or job type differs from the saved diagnostic -> every material `id: null` (guard `Array.isArray(payload.materials)`; copy rows, never mutate).
- `buildDiagnosticPayload`: sorts materials by `order` (ties keep form order) and renumbers 1..n (PR #19); strips non-alphanumerics from `partNumber`; any row without `id` -> `status: "DRAFT"`, all row `price: null`, `priceSummary(Detailed): null`; empty `archivedMaterials` dropped.
- `isValidating` (validate or recalculate pending) locks all row inputs.
- `priceSummaryDetailed.byJobType` re-syncs into summary areas on every server response (not once): new job type -> new area, removed one -> cleared; selected type with no rows -> falls back to `totalSummary` (PR #26).
- Summary (`SummaryArea`): editable only for summary type `chargeable`; discount/total editable only in `WAITING_FOR_APPROVAL` with chargeable pending rows + `CAN_EDIT_TOTAL_DISCOUNT` / `CAN_EDIT_TOTAL_AMOUNT`; net amount summary only in `NET_PRICE`. Summary suggested-net field uses subtype `diagnosticSummarySuggestedNetMaterial` (never the discount subtype, else it becomes editable and shows the discount; PR #31).
- No client price calculator (`utils/priceCalculator.ts`, `useSparePartPriceCalculation`, `SparePartsRow.shared.ts` were removed). Price chain the server values satisfy: `references/price-calculation.md`. Do not reintroduce client price math without a ticket.

## Editability Rules

- Protected positions `LA`, `FR`, `PC` (`isProtectedPosition`). Material positions `SP`, `PN`, `AC`.
- Row price fields editable only for `CHARGEABLE` + protected position: discount always; `totalAmount` in GROSS; `netAmount` in NET.
- `CHARGEABLE` material rows = summary-controlled (`isSummaryControlledRow`).
- Job type change discount (`resolveDiscountOnJobTypeChange`): -> CHARGEABLE: protected 0, else first sibling chargeable discount or 0; from CHARGEABLE or COMMERCIAL_GOODWILL -> 0; else keep.

## State Hazards

- Row status: Revised/Rejected -> Pending reset is backend-owned (works for quantity; backend adds part number + job type). Client workarounds (#20-#22) were reverted in #24; do not reimplement. `syncMaterialStatusesFromAPI` only copies server statuses onto materials by id (APPROVED stays on add).
- Materials effect restores Formik snapshot except keys in `MANAGED_ROW_KEY_PREFIXES` (`diagnosticData_diagnosticsSpareParts`, `claims_claimSpareParts`, `claims_claimArchivedSpareParts`). Add new repeated-row prefixes there, else claim/diag row 0 resets to template zeros (PR #9).
- Part number change (`resolvePartNumberChangeAction`): first render or resync -> `sync`; formatting-only -> `none`; user change -> `reset` (null row price + materialId).
- `mapValuesFromAPI` keeps the old form value when the API sends null. `syncData` runs `clearNullMaterialValues` first: null material `id` -> "", null `price.*` -> 0, null `priceSummaryDetailed` -> zero total.
- Failed validation (`errorMessages`) = prices 0, price fields collapsed, summary hidden, until a validation succeeds (Radmila, 2026-10-20). `arePricesValidated = false`; saved rows with only 0 prices stay collapsed; summary hidden while the latest diagnostic has `priceSummaryDetailed: null` (`hasPriceSummary`). Summary visibility reads prices from the latest response (`hasServerMaterialPrices`, PR #57), falling back to `materials[]` only when the response has none; never from `materials[]` alone (synced once, stays 0 after a failed first validation).
- `materials[]` syncs from the API once; add/delete/restore merge the form back with `syncMaterialsWithForm(..., { syncServerOwnedFields: true })` (id, status, prices incl. 0). Without it row 0 is rebuilt with the first validated part's prices.
- Delete compacts row values with `reindexSparePartsValues` and re-keys `sparePartNotBelongsToTool` / `autocompleteValidation` flags (`reindexSparePartsFlagsInPlace`, accepts null refs); else the deleted row's flags land on the row that moved up (PR #44, #46).
- Delete: `IN_DIAGNOSTICS` -> permanent; other statuses -> archive (`canArchiveOnDelete`), restorable via `onRestoreRow`.
- Row order: `order` field, then `LA, PN, SP, AC, FR, PC`.
- FR visible/insertable only with `CAN_VIEW_FREIGHT_ITEMS` / `CAN_INSERT_AND_DELETE_FREIGHT_ITEMS`.
- Missing `discountBase` in config: managers resolve `NET_PRICE`; row/context fallbacks are `GROSS_PRICE`. Always pass the resolved value from context.

## Tests

- `GenericField.test.tsx`, `GenericField.utils.test.ts`, `AutoComplete.test.tsx`, `formValidation.test.tsx`, `useDiagnosticsManager.test.ts`, `partNumberUtils.test.ts`, `materialPriceEditability.test.ts`.
