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

- `onRecalculatePrices(fieldName, value)` -> `buildDiagnosticPayload` + `changes: [{ type, lineId, value, scope }]` -> `POST /v1/diagnostic/prices/recalculate`.
  - `type` map: `type`->`jobType`, `sparePartNumber`->`partNumber`, `position`->`position`; summary fields `<x>Material` -> `<x>`.
  - Summary (`...Material`) changes carry `scope: { positions: ["SP","PN","AC"], jobTypes: ["CHARGEABLE"] }`; empty value -> no call.
  - Sets `arePricesValidated = false`; ignored while mutation pending.
  - Changes accumulate in `recalculatedPricesChanges` and are re-sent on validate.
- `onValidate` -> blur active element, `buildDiagnosticPayload` + accumulated `changes` -> `handleActionWithValidation("validate", ...)` -> `POST /v2/jobs/flow/validate-and-save`.
- `isValidating` (validate or recalculate pending) locks all row inputs.
- Summary (`SummaryArea`): editable only for summary type `chargeable`; discount/total editable only in `WAITING_FOR_APPROVAL` with chargeable pending rows + `CAN_EDIT_TOTAL_DISCOUNT` / `CAN_EDIT_TOTAL_AMOUNT`; net amount summary only in `NET_PRICE`.
- Client calculator (`utils/priceCalculator.ts`) = display math + tests. See `references/price-calculation.md`. `distribute*ToRows` & `useSparePartPriceCalculation` (via `SparePartsRow.shared.ts`) are currently not wired into the UI; do not re-wire without a ticket.

## Editability Rules

- Protected positions `LA`, `FR`, `PC` (`isProtectedPosition`). Material positions `SP`, `PN`, `AC`.
- Row price fields editable only for `CHARGEABLE` + protected position: discount always; `totalAmount` in GROSS; `netAmount` in NET.
- `CHARGEABLE` material rows = summary-controlled (`isSummaryControlledRow`).
- Job type change discount (`resolveDiscountOnJobTypeChange`): -> CHARGEABLE: protected 0, else first sibling chargeable discount or 0; from CHARGEABLE or COMMERCIAL_GOODWILL -> 0; else keep.

## State Hazards

- Materials effect restores Formik snapshot except keys in `MANAGED_ROW_KEY_PREFIXES` (`diagnosticData_diagnosticsSpareParts`, `claims_claimSpareParts`, `claims_claimArchivedSpareParts`). Add new repeated-row prefixes there, else claim/diag row 0 resets to template zeros (PR #9).
- Part number change (`resolvePartNumberChangeAction`): first render or resync -> `sync`; formatting-only -> `none`; user change -> `reset` (null row price + materialId).
- Delete: `IN_DIAGNOSTICS` -> permanent; other statuses -> archive (`canArchiveOnDelete`), restorable via `onRestoreRow`.
- Row order: `order` field, then `LA, PN, SP, AC, FR, PC`.
- FR visible/insertable only with `CAN_VIEW_FREIGHT_ITEMS` / `CAN_INSERT_AND_DELETE_FREIGHT_ITEMS`.
- Missing `discountBase` in config: managers resolve `NET_PRICE`; row/context fallbacks are `GROSS_PRICE`. Always pass the resolved value from context.

## Tests

- `GenericField.test.tsx`, `GenericField.utils.test.ts`, `AutoComplete.test.tsx`, `formValidation.test.tsx`, `useDiagnosticsManager.test.ts`, `partNumberUtils.test.ts`, `materialPriceEditability.test.ts`, `priceCalculator.test.ts`.
