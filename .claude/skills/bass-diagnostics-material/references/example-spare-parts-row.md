# Example: user edits a spare-part row (job, NET or GROSS)

Map of the real flow; read the named symbols, do not copy code from here.

1. User picks position `SP` -> `GenericField` dropdown `onChange` -> `applyPositionRules` (maxCount guard, `resolveQuantityForPosition`, LA/FR autofill) -> `fieldValueChanged` -> `waitForFormCommit` -> `invokeFieldAction(onValueChange = "onRecalculatePrices")`.
2. `onRecalculatePrices(fieldName, value)` (JobOverview): no `materialId` yet -> return (new row). Prices arrive on validate. Saved row: whole payload validated first (`getRecalculationPayloadErrors`); errors -> shown, no call.
3. User types part number -> value only. Picks option -> `commitSparePart` -> autofill `description`, `unitPrice` -> `validateForm` -> not-belongs check -> same part? stop -> `onBlur = "onRecalculatePrices"`.
4. User changes quantity (0 allowed), leaves field -> `onBlur` -> `onRecalculatePrices` -> `POST /v1/diagnostic/prices/recalculate` `{ ...buildDiagnosticPayload, countryCode, changes: [{ type: "quantity", lineId: materialId, value, scope: null }] }`; `arePricesValidated = false`.
5. Response -> `extractDiagnosticFromValidateResponse` -> `["diagnostic", jobId]` cache -> manager re-syncs rows and `priceSummaryDetailed`.
6. Chargeable summary discount edit (`summaryDiscountMaterial`, WAITING_FOR_APPROVAL + `D_TE`) -> `changes: [{ type: "summaryDiscount", lineId: "", value, scope: { positions: ["SP","PN","AC"], jobTypes: ["CHARGEABLE"] } }]`.
7. Validate -> `onValidate` -> `useActionWithValidation("validate")` -> `POST /v2/jobs/flow/validate-and-save` with all accumulated `changes` -> `markAllValidated`, rows collapse.

8. Delete or restore a row -> `rowsChangedVersion` -> recalculate with `changes: []`.

Check the exact `type` strings: `typeMap` in `onRecalculatePrices`; unmapped fields send `originalName` as is.
