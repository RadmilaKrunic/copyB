---
name: bass-diagnostics-material
description: >
  Work on diagnostics or claim spare-part rows: SparePartsRow, SparePartsArea, SummaryArea, ArchivedSpareParts,
  position rules and permissions, part-number autocomplete, backend price recalculation, validate-and-save,
  useDiagnosticsManager, useClaimMaterialsManager, DiagnosticsContext, ClaimContext.
---

# Diagnostics Material Rows — BASS-Next

Load first: `.github/skills/bass-diagnostics/SKILL.md` (sequences, pricing, hazards). Claims: `.github/skills/bass-claims/SKILL.md`. Country rules: `.github/skills/bass-country-config/SKILL.md`. This file adds the row-level map only.

## Files

```
src/modules/JobManagement/JobOverview/
  DiagnosticsContext.tsx             useDiagnosticsContext()
  JobOverview.tsx                    onRecalculatePrices, onValidate, buildDiagnosticPayload (read by symbol)
  JobOverview.utils.ts               extractDiagnosticFromValidateResponse
  SparePartsArea/SparePartsArea.tsx  custom area (diagnosticsSpareParts)
  SparePartsArea/SummaryArea.tsx     custom area (diagnosticsSummary)
  SparePartsRow/
    SparePartsRow.tsx                row UI, status + permission gates
    SparePartsRow.components.tsx     SparePartsMainFields, SparePartsCollapsedSection (reused by claims)
    materialPriceEditability.ts      getPriceFieldEditability, isProtectedPosition, isSummaryControlledRow
    jobTypeDiscountRepopulation.ts   resolveDiscountOnJobTypeChange
    partNumberUtils.ts               normalizePartNumber, isSamePartNumber, resolvePartNumberChangeAction
  ArchivedSparePartsArea/, ArchivedSparePartsRow/
src/hooks/useDiagnosticsManager.ts   rows state, buildMaterialsRowValues, resolveQuantityForPosition, getPositionAutofill
src/hooks/useClaimMaterialsManager.ts claim rows (same row builder)
src/components/generics/Field/GenericField.utils.ts  applyPositionRules, handleFaultCodeSelection
```

## Row Gates (`SparePartsRow.tsx`)

- `POSITION_PERMISSIONS[LA|FR|PN|SP|AC...]`: `canView`, `canDelete`, `canEditUnits`, `canEditUnitPrice`, `canEditDiscount`, `canEditTotal` (`PERMISSIONS.DIAGNOSTICS.*`).
- `STATUSES_BLOCKING_DELETION`: IN_REPAIR, REPAIR_DONE, DELIVERED, COMPLETED, READY_FOR_REPAIR, CUSTOMER_APPROVAL_PENDING.
- `STATUSES_DISABLING_ROW`: RETURN_UNASSEMBLY, RETURN_ASSEMBLY, CUSTOMER_APPROVAL_PENDING, MULTIPLE_APPROVAL_PENDING.
- `RESETTABLE_ROW_STATUSES`: REVISED, REJECTED -> back to PENDING on edit (`setRevisedRejectedRowPending`).
- WARRANTY / SERVICE_OFFERING type options disabled for a spare part that does not belong to the tool.
- Prices visible only with `CAN_VIEW_PRICES` (`DP_V`); rows collapse after validation.
- `isValidating` (recalc or validate pending) locks all inputs.

## Adding a Row Behavior

1. Field behavior -> metadata (`subtype`, `onValueChange`/`onBlur` = `onRecalculatePrices`) in `data/data<CC>.json`, not hardcoded names.
2. Position-dependent logic -> `applyPositionRules` (runs before the price action).
3. New repeated-row prefix -> add to `MANAGED_ROW_KEY_PREFIXES` in `useDiagnosticsManager.ts`.
4. Test: `SparePartsRow.test.tsx`, `GenericField.test.tsx`, `useDiagnosticsManager.test.ts`.

Example walkthrough: `references/example-spare-parts-row.md`.
