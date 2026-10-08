# Execution Plan — PTBASS-1399 Diagnostics Validation Bug Fixes

**Branch:** `bugfix/PTBASS-1399-user-can-define-by-him-self-warranty-price`
**Scope:** Frontend only — 8 bugs across price calculation, resync/state management, type-change
fields, and validation race condition.

---

## Contracts

### Hook State Contracts

**`useDiagnosticsManager` — no new state.** Existing refs and state are reused. The only
behavioral change is in `recalculateMissingPrices` (guards `isPriceSetManually`) and
`resyncMaterialsFromAPI` (resets `isResyncingRef` only via the double-RAF mechanism, not manually).

**`useSparePartPriceCalculation` — no new state.** The `prevValuesRef` stale-suggestedNetPrice bug
(bug 7) is fixed by always computing fresh `suggestedNetPrice` inside `detectChangedField` before
comparing to `cur.suggestedNetPrice`, not relying on the stored ref value.

**`DiagnosticsContext` — one new field added:**

```typescript
// DiagnosticsContext.tsx (or wherever the context value is assembled in JobOverview.tsx)
isValidating: boolean; // = validateAndSaveMutation.isPending
```

### Component Prop Contracts

**`SparePartsArea`** receives one new prop:

```typescript
isValidating: boolean; // passed from JobOverview via DiagnosticsContext
```

**`SparePartsRow`** reads `isValidating` from `useDiagnosticsContext()` — no new prop drilling,
context is the transport.

**`SparePartsRow` `isDisabled` prop** is already present. The lock is implemented by combining
`isDisabled || isValidating` in the `isRowFullyDisabled` expression (line ~189).

### Calculation Fix Contracts

**Bug 3 — GROSS mode totalAmount with grossAmount=0:**

|                                                                   | Current (buggy)                                            | Fixed                                                                                                                           |
| ----------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `grossAmount = 0`, `totalAmount = 0`, user edits totalAmount to T | `discountPercent = 0`, `discountAmount = 0` (silent no-op) | `discountPercent = 0`, `discountAmount = 0`, `totalAmount = T` (value accepted, grossAmount still 0, user sees what they typed) |
| `grossAmount > 0`, user edits totalAmount to T > gross            | clamp: `discountPercent = 0`, `totalAmount = grossAmount`  | unchanged (already correct)                                                                                                     |

The fix: when `grossAmount === 0` in the `totalAmount` GROSS case, still assign `totalAmount` so
the field is not silently no-oped. The discount computation block (`if (grossAmount > 0) ... else
discountPercent = 0`) already handles the zero case — just add `totalAmount = changedValue` in the
`else` branch so the assignment is not lost.

**Bug 7 — stale `suggestedNetPrice` in `prevValuesRef`:**

When `detectChangedField` sees `cur.unitPrice !== prev.unitPrice` and the "initial recalculation"
path runs, `resolveInitialRecalculation` computes `needsStaleRecalculation` by comparing
`cur.quantity * cur.unitPrice` to `cur.suggestedNetPrice`. The bug is that after the **previous**
validate, `prevValuesRef.current.suggestedNetPrice` holds the server-returned `suggestedNetPrice`
(e.g. 2500.09 from the API), so when the user next changes `unitPrice`, `detectChangedField` fires
on the `unitPrice` branch — but `buildPriceInputs(false, cur, prev)` puts `prev.suggestedNetPrice`
into the `PriceInputs.suggestedNetPrice`, which `applyNetPriceSwitch` uses in its `totalAmount`
and `grossAmount` cases as `baseSugNet`. Those cases derive discount from `baseSugNet − netAmount`,
yielding a rounding artifact (2500 − 2499.91 → 0.09 discount → wrong netAmount).

Fix: in `useSparePartPriceCalculation`, whenever `changedField === "unitPrice"` (user or initial
recalculation), always override `inputs.suggestedNetPrice` to `roundToTwo(quantity * unitPrice)`
before calling `calculatePrices`. This matches what the `unitPrice` branch in
`applyNetPriceSwitch` already does internally, so it is idempotent for that branch but prevents
stale `baseSugNet` from leaking into `totalAmount`/`grossAmount` branches if mode is
`GROSS_PRICE` with a cascading call.

Concretely, after `buildPriceInputs(...)` and before `calculatePrices(...)`:

```typescript
// Bug 7 fix: always derive suggestedNetPrice fresh when unitPrice changed
if (changedField === "unitPrice" || changedField === "quantity") {
  inputs.suggestedNetPrice = roundToTwo(inputs.quantity * changedValue);
}
```

This ensures `baseSugNet` in `applyNetPriceSwitch` is always `qty × newUnitPrice`, not a
stale API-returned value.

---

## Checkpoint 1 — Price Calculation Correctness

**Fixes bugs 3 and 7. Pure logic changes, no UI changes.**

After this checkpoint: `npm run typecheck` passes, `npm run test` passes, price arithmetic is
correct in both NET_PRICE and GROSS_PRICE modes with zero and non-zero grossAmount.

### Task 1.1 — Fix GROSS totalAmount zero-grossAmount silent no-op

- **Layer:** utility
- **File:** `src/utils/priceCalculator.ts`
- **What:** In the `calculatePrices` function, GROSS mode `case "totalAmount":` block (lines 271–285).
  The `else` branch (when `grossAmount === 0`) currently sets `discountPercent = 0` and
  `discountAmount = 0` but never assigns `totalAmount`, so the user's input is silently discarded.
  Add `totalAmount = changedValue;` inside the `else` branch so the field retains the typed value.
  Also add a guard: if `grossAmount === 0` but `suggestedNetPrice > 0`, compute `grossAmount` from
  `suggestedNetPrice + taxAmount` before the `if (grossAmount > 0)` check so the discount can
  still be derived when grossAmount is stale-zero but unit price is set.

  Exact change in the `else` branch:

  ```typescript
  } else {
    discountPercent = 0;
    discountAmount = 0;
    totalAmount = changedValue;   // ← add this line
  }
  ```

  Additionally, the `clampDiscountPercent` guard at line 276–280 already handles
  `discountPercent < 0`, so no further clamping is needed.

- **Blocked by:** —
- **Spec coverage:**
  - `validation-spec.md` § "Discount percentage is 0% when gross amount is zero in GROSS_PRICE mode"
  - `validation-spec.md` § "Discount percentage cannot become negative when total amount exceeds gross amount in GROSS_PRICE mode"

---

### Task 1.2 — Fix stale suggestedNetPrice causing rounding artifact in NET_PRICE mode

- **Layer:** hook
- **File:** `src/modules/JobManagement/JobOverview/SparePartsRow/useSparePartPriceCalculation.ts`
- **What:** In `useSparePartPriceCalculation`'s main `useEffect`, after `buildPriceInputs` returns
  `inputs` and before `calculatePrices` is called, override `inputs.suggestedNetPrice` when
  `changedField` is `"unitPrice"` or `"quantity"`:

  ```typescript
  const inputs: PriceInputs = buildPriceInputs(isInitialRecalculation, cur, prev);

  // Bug 7 fix: always recompute suggestedNetPrice from live values when
  // quantity or unitPrice changed, to prevent stale API-returned values
  // from corrupting baseSugNet in applyNetPriceSwitch.
  if (changedField === "unitPrice" || changedField === "quantity") {
    const freshQty = changedField === "quantity" ? changedValue : inputs.quantity;
    const freshPrice = changedField === "unitPrice" ? changedValue : inputs.unitPrice;
    inputs.suggestedNetPrice = roundToTwo(freshQty * freshPrice);
  }
  ```

  This is safe because `calculatePrices` already recomputes `suggestedNetPrice` internally in
  these branches — this just ensures the input is clean for the `totalAmount`/`grossAmount`
  branches that use `baseSugNet`.

- **Blocked by:** —
- **Spec coverage:**
  - `validation-spec.md` § "Changing unit price when the suggested net price is stale does not introduce a rounding error"
  - `business-behavior-spec.md` § "Entered price value is preserved exactly after validation in NET_PRICE mode"

---

## Checkpoint 2 — Resync and State Management Fixes

**Fixes bugs 1, 2, 5, 6, 8. Changes in `useDiagnosticsManager.ts` and
`validateAndSaveMutation.onSuccess` in `JobOverview.tsx`.**

After this checkpoint: resync does not overwrite `isPriceSetManually` prices, tax persists across
per-row/per-validation workflows, the double-RAF isResyncingRef window reliably covers Formik
reinit, and form flicker is eliminated.

### Task 2.1 — Guard recalculateMissingPrices against isPriceSetManually rows

- **Layer:** hook (utility helper inside `useDiagnosticsManager.ts`)
- **File:** `src/hooks/useDiagnosticsManager.ts`
- **What:** `recalculateMissingPrices` (lines 196–238) currently overwrites `netAmount`,
  `grossAmount`, `totalAmount`, `discountAmount`, `suggestedNetPrice` whenever it detects stale or
  missing prices — it does not check `item.isPriceSetManually`. Add an early return for manually
  priced rows that already have all required prices:

  ```typescript
  const recalculateMissingPrices = (item: MaterialItem, mode: discountBase): MaterialItem => {
    // Bug 2 fix: never overwrite a manually-set price unless prices are truly missing
    if (item.isPriceSetManually && item.netAmount > 0 && item.totalAmount > 0) return item;
    // ... existing logic unchanged
  ```

  This preserves the user-set `netAmount` (and therefore discount) through the resync triggered
  by `resyncMaterialsFromAPI` after validation.

  The `hasstalePrices` path (lines 207–211) specifically targets rows where
  `suggestedNetPrice !== qty × unitPrice` — a legitimate stale-price scenario. It must still run
  when `isPriceSetManually` is `false`. The guard only short-circuits when the user has explicitly
  set the price AND the prices are non-zero.

- **Blocked by:** —
- **Spec coverage:**
  - `business-behavior-spec.md` § "isPriceSetManually flag is respected when the API returns a price after validation"
  - `business-behavior-spec.md` § "Discount remains stable after repeated validations of a COMMERCIAL_GOODWILL row"
  - `business-behavior-spec.md` § "Discount stays correct after validating a COMMERCIAL_GOODWILL row once"

---

### Task 2.2 — Fix tax:0 for new unsaved rows after resync (buildEmptyMaterial)

- **Layer:** hook
- **File:** `src/hooks/useDiagnosticsManager.ts`
- **What:** `buildEmptyMaterial` (lines 240–266) creates rows with `tax: 0`. When a user adds a
  new row after validation, `resyncMaterialsFromAPI` resets `hasSyncedFromAPIRef` so Effect 1
  re-fires. Effect 1 maps `diagnosticData.materials` — which at that point includes only
  previously-validated rows that have an API tax value — back into `items`. The new unsaved row is
  not in `diagnosticData.materials` and is therefore constructed with `buildEmptyMaterial`, which
  gives it `tax: 0`.

  Fix: In Effect 1 (after the API re-sync), after building `recalculatedItems`, merge any
  existing materials that have `isNew: true` or no `materialId` from `materialsRef.current` and
  preserve their tax value if the API didn't return one:

  ```typescript
  // Bug 6 fix: preserve tax for in-progress rows not yet returned by the API
  const mergedItems = recalculatedItems.map((item) => {
    if (item.materialId) return item; // API-sourced, use API tax
    const existing = materialsRef.current.find(
      (m) => m.position === item.position && !m.materialId,
    );
    if (existing && existing.tax > 0 && item.tax === 0) {
      return { ...item, tax: existing.tax };
    }
    return item;
  });
  setMaterials(sortMaterialsByOrder(mergedItems));
  ```

  Additionally, `buildEmptyMaterial` is called in `onAddRow`. After `resyncMaterialsFromAPI` runs,
  the new row is re-added with `tax: 0`. The proper fix is to set the default tax from the most
  recent API-returned tax value. In `onAddRow`, read `materialsRef.current` and use the first
  non-zero tax found:

  ```typescript
  // Bug 6 fix: use tax from existing validated rows as default for new rows
  const defaultTax = materialsRef.current.find((m) => m.tax > 0)?.tax ?? 0;
  const newItem = { ...buildEmptyMaterial(...), tax: defaultTax };
  ```

- **Blocked by:** —
- **Spec coverage:**
  - `business-behavior-spec.md` § "Tax value is preserved for all rows when spare parts are added one by one with validation after each"
  - `validation-spec.md` § "Tax amount is recalculated correctly for each row when rows are added sequentially"
  - `error-handling-spec.md` § "Summary total net amount is non-zero even when a row has zero tax"

---

### Task 2.3 — Eliminate Formik flicker during resync (forceRebuildRef + isResyncingRef timing)

- **Layer:** hook / component
- **File:** `src/hooks/useDiagnosticsManager.ts`, `src/modules/JobManagement/JobOverview/JobOverview.tsx`
- **What:** Bug 8 — when `resyncMaterialsFromAPI(true)` is called in `onSuccess`, it sets
  `forceRebuildRef.current = true`. Effect 3 then fires, sets `skipFormResetRef.current = true`,
  and calls `setInitialFormValues(prev => ({ ...prev, ...rowValues }))`. Formik's `enableReinitialize`
  causes it to flash old values in between the state update and the reinit completing. Meanwhile
  `isResyncingRef.current` is set to `true` just before the `setQueryData` call (line 576), and is
  cleared by the double-RAF effect tied to `initialFormValues` changes (lines 1522–1533).

  The flicker occurs because `setArePricesValidated(true)` is called (line 611) before the
  double-RAF has had a chance to clear `isResyncingRef`. The sequence is:
  1. `isResyncingRef = true`
  2. `markAllValidated()` + `resyncMaterialsFromAPI(true)` → triggers Effect 1 → triggers Effect 3
     → `setInitialFormValues` → triggers double-RAF → RAF queued
  3. `await queryClient.refetchQueries(...)` — suspends
  4. React re-renders, Formik sees `enableReinitialize` + new `initialFormValues` → flashes old
     values for one frame
  5. RAF fires → `isResyncingRef = false`
  6. `setArePricesValidated(true)` → validation complete

  Fix: Move `setArePricesValidated(true)` to fire **inside** the double-RAF callback so it only
  fires after `isResyncingRef` has been cleared and Formik has had at least two animation frames to
  settle. In `JobOverview.tsx` the double-RAF effect (lines 1522–1533) cannot be directly extended
  (it is in the component body). Instead, pass a `onResyncComplete` callback ref into
  `DiagnosticsContext` (or set it on a ref visible to both the effect and the onSuccess handler):

  ```typescript
  // In JobOverview.tsx component body:
  const onResyncCompleteRef = useRef<(() => void) | null>(null);

  // The existing double-RAF effect — add callback invocation:
  useEffect(() => {
    if (!isResyncingRef.current) return;
    if (clearResyncRafRef.current !== null) cancelAnimationFrame(clearResyncRafRef.current);
    clearResyncRafRef.current = requestAnimationFrame(() => {
      clearResyncRafRef.current = requestAnimationFrame(() => {
        clearResyncRafRef.current = null;
        isResyncingRef.current = false;
        onResyncCompleteRef.current?.(); // ← add this
        onResyncCompleteRef.current = null; // ← clear after fire
      });
    });
  }, [initialFormValues]);

  // In validateAndSaveMutation.onSuccess, replace:
  //   setArePricesValidated(true);
  // with:
  onResyncCompleteRef.current = () => setArePricesValidated(true);
  ```

  This guarantees that `arePricesValidated` becomes `true` only after the double-RAF has run,
  i.e., after Formik has completed its reinit with the API-fresh values. Fields never see a stale
  frame after this.

- **Blocked by:** Task 2.1 (the `isPriceSetManually` fix must land first so `buildRowValues` emits
  the correct values into `initialFormValues`).
- **Spec coverage:**
  - `business-behavior-spec.md` § "No visible price flicker occurs when validation completes"
  - `error-handling-spec.md` § "Price calculation does not trigger during API-driven reinitialization after validation"

---

### Task 2.4 — Fix isResyncingRef staying true too long / markRowDirty firing during resync window

- **Layer:** component / hook
- **File:** `src/modules/JobManagement/JobOverview/JobOverview.tsx`,
  `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`
- **What:** Bug 1 — `isResyncingRef.current` is set to `true` at the top of `onSuccess` (line 576)
  but cleared only by the double-RAF tied to `initialFormValues` changes. If Effect 3 is delayed
  (e.g. `diagnosticData` has not yet re-fired Effect 1), the RAF never fires for this round and
  `isResyncingRef` stays `true` indefinitely, making `enableValidate()` always return `false`.

  The issue is that `isResyncingRef` being `true` suppresses `useSparePartPriceCalculation`'s
  recalculation (correct behaviour) AND makes `SparePartsRow`'s first-render dirty-tracking skip
  (also correct). But `enableValidate` in `useDiagnosticsManager` does NOT check `isResyncingRef`;
  the `managerEnableValidate` → `enableValidate` callback at line 1535 reads `arePricesValidated`
  and `pendingArchivedDeletionsRef`. The bug is actually that `markRowDirty` (called via
  `onUserEdit` in `useSparePartsRowCommon`) can fire during the brief window when Formik is
  reinitializing form fields **before** `isResyncingRef.current` becomes `true` (i.e. between
  `setQueryData` and the next React render cycle where `isResyncingRef.current` is checked in
  `useSparePartPriceCalculation`).

  Fix: Set `isResyncingRef.current = true` **before** calling `markAllValidated()` and
  `resyncMaterialsFromAPI()` in `onSuccess`. It is already set on line 576 (the first line of
  `onSuccess`), which is correct. The additional problem is that `isFirstRowRender.current` in
  `SparePartsRow` is reset to `true` on Formik reinit only if the component unmounts/remounts —
  but with `skipFormResetRef = true` it stays mounted, so `isFirstRowRender` remains `false` and
  the dirty-tracking effect fires on the next field change.

  Additional guard: In `SparePartsRow.tsx`, the dirty-tracking effect (lines 431–449) already
  checks `isResyncingRef.current` and `arePricesValidatedRef.current`. Ensure that the effect's
  dependency array includes `validateAndSaveMutation.isPending` (passed through context as
  `isValidating`) so that the effect is suppressed when validation is in flight:

  In `SparePartsRow.tsx`, inside the dirty-tracking effect:

  ```typescript
  // Bug 1 fix: also skip if validation is currently in flight
  if (isValidating) return;
  ```

  `isValidating` is already passed through `DiagnosticsContext` (added in Checkpoint 4 Task 4.1).
  Add this guard immediately after the existing `isResyncingRef.current` check.

- **Blocked by:** Task 4.1 (isValidating context field must exist).
- **Spec coverage:**
  - `business-behavior-spec.md` § "Validate button is always clickable exactly once per dirty state"
  - `error-handling-spec.md` § "Price calculation does not trigger during API-driven reinitialization after validation"
  - `error-handling-spec.md` § "Archived deletions pending count is reset after successful validation"

---

## Checkpoint 3 — Type-Change and Discount Field Fixes

**Fixes bug 4. Change in `SparePartsRow.tsx` type-change effect.**

After this checkpoint: switching from COMMERCIAL_GOODWILL → CHARGEABLE (and vice-versa) does not
leave stale discounts in either hidden or visible discount fields.

### Task 3.1 — Clear discountAmountHidden when type changes away from COMMERCIAL_GOODWILL

- **Layer:** component
- **File:** `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`
- **What:** The type-change `useEffect` (lines 347–407) already handles resetting the visible
  discount and `discountHiddenFieldName` when switching from CHARGEABLE → WARRANTY/COMMERCIAL_GOODWILL
  (via `isLeavingTargetToReset`). It also applies the summary discount when entering CHARGEABLE.
  But it never explicitly clears `discountAmountHidden` when leaving COMMERCIAL_GOODWILL → CHARGEABLE
  or CHARGEABLE → COMMERCIAL_GOODWILL. The `discountAmountHidden` field carries the API-submitted
  discount amount and persists through type changes.

  Fix: After the existing `setFieldValue(discountHiddenFieldName, nextDiscount)` call, add:

  ```typescript
  // Bug 4 fix: also clear discountAmountHidden on type change so the API receives 0
  if (discountAmountHiddenFieldName && (shouldResetToZero || isEnteringTargetType)) {
    const nextDiscountAmount = shouldResetToZero ? 0 : 0; // always 0 on type change
    void setFieldValue(discountAmountHiddenFieldName, nextDiscountAmount);
  }
  ```

  The `discountAmountHiddenFieldName` is already resolved via `resolveDiscountFieldNames` and is
  available in the effect's closure (it must be added to the effect's dependency array).

  Full logic:
  - When entering CHARGEABLE from any source: set visible discount, hidden discount, and hidden
    discount amount all to `summaryDiscount` (the currently distributed summary value).
  - When leaving CHARGEABLE to a RESET_TO_ZERO_SOURCE_TYPE: set all three to 0.
  - When entering COMMERCIAL_GOODWILL from CHARGEABLE: the `isLeavingTargetToReset` path covers
    this — set all to 0.

  The effect currently only sets `activeDiscountFieldName`, `discountSiblingFieldName`, and
  `discountHiddenFieldName`. Add `discountAmountHiddenFieldName` to the same block.

  Also add `discountAmountHiddenFieldName` to the effect dependency array.

- **Blocked by:** —
- **Spec coverage:**
  - `business-behavior-spec.md` § "Switching row type from COMMERCIAL_GOODWILL to CHARGEABLE clears the discount"
  - `business-behavior-spec.md` § "Switching row type from CHARGEABLE to COMMERCIAL_GOODWILL clears any prior CHARGEABLE discount"
  - `validation-spec.md` § "Discount fields (visible, hidden, and hidden amount) are reset when row type changes"

---

## Checkpoint 4 — Race Condition Fix (Validation Lock)

**Fixes bug 9. Add `isValidating` to context and lock all spare parts row inputs while
`validateAndSave` is pending.**

After this checkpoint: no field in any spare parts row can be edited while validation is in flight.
The Validate button is also disabled (already handled by `validateAndSaveMutation.isPending` check
in `enableValidate` at line 1536).

### Task 4.1 — Expose isValidating through DiagnosticsContext

- **Layer:** component (context)
- **File:** `src/modules/JobManagement/JobOverview/DiagnosticsContext.tsx` (or wherever
  `DiagnosticsContext` is defined and the context value object is assembled in `JobOverview.tsx`)
- **What:** Add `isValidating: boolean` to the context type and value:

  ```typescript
  // DiagnosticsContext type:
  isValidating: boolean;

  // In JobOverview.tsx where the DiagnosticsContext.Provider value is assembled:
  isValidating: validateAndSaveMutation.isPending,
  ```

  This re-renders all `SparePartsRow` consumers whenever the mutation state changes, which is
  already the correct granularity (the diagnostic tab re-renders on validate anyway).

- **Blocked by:** —
- **Spec coverage:**
  - `business-behavior-spec.md` § "All diagnostic inputs are locked while validation is in progress"
  - `error-handling-spec.md` § "Validate button remains disabled until the in-flight validation response arrives"
  - `error-handling-spec.md` § "Changing row type while validation is in progress does not corrupt row values"
  - `error-handling-spec.md` § "Changing row price while validation is in progress does not corrupt row values"

---

### Task 4.2 — Lock SparePartsRow inputs while isValidating is true

- **Layer:** component
- **File:** `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`
- **What:** Consume `isValidating` from `useDiagnosticsContext()` (alongside the existing
  destructured values at lines 139–149) and fold it into `isRowFullyDisabled`:

  ```typescript
  const {
    arePricesValidated,
    markRowDirty,
    allowedPositions,
    isResyncingRef,
    setRevisedRejectedRowPending,
    canArchiveOnDelete,
    resyncMaterialsFromAPI,
    jobStatus,
    discountBase,
    automaticRows,
    isValidating, // ← add
  } = useDiagnosticsContext();

  // existing line ~189:
  const isRowFullyDisabled = isDisabled || isApproved || isStatusDisabled || isValidating; // ← add || isValidating
  ```

  `isRowFullyDisabled = true` causes `applyFieldPermissions` to return every field with
  `isDisabled: true` (lines 221–251), which propagates to `GenericField` rendering all inputs as
  disabled. No new rendering logic is needed.

  Also add the guard to the dirty-tracking effect (Task 2.4):

  ```typescript
  if (isValidating) return; // inside the isFirstRowRender effect
  ```

- **Blocked by:** Task 4.1
- **Spec coverage:**
  - `business-behavior-spec.md` § "All diagnostic inputs are locked while validation is in progress"
  - `business-behavior-spec.md` § "Row inputs are unlocked after successful validation"
  - `business-behavior-spec.md` § "Row inputs are unlocked after validation fails"
  - `error-handling-spec.md` § "Changing row type while validation is in progress does not corrupt row values"
  - `error-handling-spec.md` § "Changing row price while validation is in progress does not corrupt row values"

---

## Checkpoint Summary

| Checkpoint                           | Bugs fixed    | Files changed                                           | Verifiable by                                                                                                  |
| ------------------------------------ | ------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1 — Price calculation correctness    | 3, 7          | `priceCalculator.ts`, `useSparePartPriceCalculation.ts` | `npm run typecheck && npm run test`                                                                            |
| 2 — Resync and state management      | 1, 2, 5, 6, 8 | `useDiagnosticsManager.ts`, `JobOverview.tsx`           | Manual: validate COMMERCIAL_GOODWILL row twice; check tax persists; check no flicker                           |
| 3 — Type-change discount fields      | 4             | `SparePartsRow.tsx`                                     | Manual: switch COMMERCIAL_GOODWILL → CHARGEABLE and back; confirm discount and discountAmountHidden reset to 0 |
| 4 — Validation lock (race condition) | 9             | `DiagnosticsContext.tsx`, `SparePartsRow.tsx`           | Manual: click Validate and immediately try to edit a field; confirm field is read-only until response arrives  |

---

## Task Dependency Graph

```
Task 1.1  ──────────────────────────────────── (independent)
Task 1.2  ──────────────────────────────────── (independent)
Task 2.1  ──────────────────────────────────── (independent)
Task 2.2  ──────────────────────────────────── (independent)
Task 4.1  ──────────────────────────────────── (independent)
Task 3.1  ──────────────────────────────────── (independent)
Task 2.3  ← depends on Task 2.1
Task 2.4  ← depends on Task 4.1
Task 4.2  ← depends on Task 4.1
```

Checkpoints 1, 3, and 4 are fully independent. Checkpoint 2 has two internal dependencies:
Task 2.3 requires Task 2.1 (so `isPriceSetManually` rows emit correct values into
`initialFormValues` before the flicker fix defers `setArePricesValidated`), and Task 2.4 requires
Task 4.1 (the `isValidating` context value must exist before the dirty-tracking effect can read it).

---

## Risk Register

| Risk                                                                                | Likelihood | Mitigation                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Double-RAF timing insufficient on slow devices                                      | Low        | The two-frame window was already in production for the `isResyncingRef` clear; adding `setArePricesValidated` inside it extends existing logic rather than introducing a new timing dependency. |
| `isPriceSetManually` guard in `recalculateMissingPrices` hides genuine stale prices | Low        | The guard only fires when `netAmount > 0 && totalAmount > 0`; truly missing prices (both zero) still trigger recalculation.                                                                     |
| `isValidating` context causes unnecessary re-renders                                | Very low   | `DiagnosticsContext` already updates on every `arePricesValidated` change; adding `isPending` adds at most two additional renders per validation cycle (start and end).                         |
| `discountAmountHiddenFieldName` not resolvable for some field configurations        | Low        | `resolveDiscountFieldNames` already handles missing fields by returning `""`. The fix wraps the `setFieldValue` call in `if (discountAmountHiddenFieldName)`.                                   |
