# Execution Plan: PTBASS-1736 Diagnostics Spare Parts Pricing Bugs

## Target repo
**bassnext.web** — React 19 SPA (TypeScript + Vite)

## Context referenced
- `CLAUDE.md` — React 19 SPA architecture, metadata-driven forms, path aliases, test framework
- `.claude/rules/typescript-conventions.md` — Naming, import order, strict typing
- `.claude/rules/react-conventions.md` — Component structure, state management, Formik integration
- `.claude/rules/price-calculator.md` — Price calculation logic, discount modes, `useDiagnosticsManager`
- `.claude/rules/testing.md` — Vitest + React Testing Library, MSW 2 for API mocking
- `.github/skills/bass-diagnostics/SKILL.md` — Diagnostics calculation logic, context chain

## Architecture layers affected
1. **Hooks layer** — `src/hooks/useDiagnosticsManager.ts`
2. **Component layer** — `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`
3. **Custom hooks layer** — `src/modules/JobManagement/JobOverview/SparePartsRow/useSparePartPriceCalculation.ts`
4. **Pure utility layer** — `src/utils/priceCalculator.ts` (no changes needed, read-only reference)
5. **Test layer** — Unit tests for modified hooks

## Software contracts

### Hook API contract: `useSparePartPriceCalculation`

**File:** `src/modules/JobManagement/JobOverview/SparePartsRow/useSparePartPriceCalculation.ts`

**Interface (no changes to signature):**
```typescript
interface SparePartFieldNames {
  quantity: string;
  unitPrice: string;
  netAmount: string;
  tax: string;
  grossAmount: string;
  discount: string;
  discountSibling?: string;
  discountHidden: string;
  discountAmountHidden?: string;
  taxAmount: string;
  totalAmount: string;
  suggestedNetPrice: string;
  areaNamePrefix?: string;
  onUserEdit?: () => void;
  isResyncingRef?: RefObject<boolean>;
  discountBase?: discountBase;
}

export const useSparePartPriceCalculation = (fieldNames: SparePartFieldNames) => void;
```

**Behavior change:** Prevent `onUserEdit()` from being called when:
- `isValidating` flag is true (validation API in flight)
- `isResyncingRef.current` is true (API-driven reinitialization)

**Implementation strategy:**
- Add `isValidating` param to `SparePartFieldNames` interface
- Guard `onUserEdit()` call with `!isResyncingRef.current && !isValidating`

---

### Hook API contract: `useDiagnosticsManager`

**File:** `src/hooks/useDiagnosticsManager.ts`

**Return type extension (new field added):**
```typescript
export interface UseDiagnosticsManagerReturn {
  // ... existing fields ...
  isValidating: boolean;  // NEW: exposes validation-in-flight state
}
```

**Behavior change:** Track validation API in-flight state via new `isValidatingRef` and expose as `isValidating` boolean.

**Implementation strategy:**
- Add `isValidatingRef = useRef(false)` to internal state
- Add `isValidating: boolean` to return object
- Set `isValidatingRef.current = true` before validation API call
- Set `isValidatingRef.current = false` after validation completes (success or failure)
- This requires locating the validation API call site in `JobOverview` or related modules — NOT part of this hook's file

---

### Component API contract: `SparePartsRow.tsx`

**File:** `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`

**No signature changes** — internal bug fixes only.

**Behavior change:**
1. **Bug 1 fix:** Check `isValidating` flag before calling `markRowDirty` to prevent dirty-marking during validation
2. **Bug 5 fix:** Prevent `onUserEdit` from being called during validation or resyncing

**Implementation strategy:**
- Read `isValidating` from `useDiagnosticsContext()`
- Pass `isValidating` to `useSparePartPriceCalculation` via `SparePartFieldNames` interface
- Guard `markRowDirty` call in `useEffect` with `&& !isValidating`

---

### Context API contract: `DiagnosticsContext`

**File:** (inferred location) `src/modules/JobManagement/JobOverview/DiagnosticsContext.tsx` or similar

**Interface extension (new field exposed):**
```typescript
interface DiagnosticsContextValue {
  // ... existing fields ...
  isValidating: boolean;  // NEW: propagated from useDiagnosticsManager
}
```

**Behavior change:** Pass through `isValidating` flag from `useDiagnosticsManager` to consuming components.

**Implementation strategy:**
- Read `isValidating` from `useDiagnosticsManager` return value
- Add `isValidating` to context provider value
- Components consuming `useDiagnosticsContext()` can now read this flag

---

### Validation API integration contract

**File:** (inferred location) `src/modules/JobManagement/JobOverview/JobOverview.tsx` or `SparePartsArea.tsx`

**Behavior change:**
1. Set `isValidatingRef.current = true` before calling validation API
2. Set `isValidatingRef.current = false` in `.then()` and `.catch()` blocks after validation completes
3. Ensure `isResyncingRef.current = true` before Formik reinitialization with validated data

**Implementation strategy:**
- Locate the validation button's `onClick` handler (likely calls `validateAndSave` or similar)
- Wrap the API call:
  ```typescript
  isValidatingRef.current = true;
  validatePrices(payload)
    .then((response) => {
      isResyncingRef.current = true;
      // ... update materials, reinitialize Formik ...
    })
    .finally(() => {
      isValidatingRef.current = false;
    });
  ```

---

## Checkpoints

### Checkpoint 1: Add validation state tracking to `useDiagnosticsManager`

**Context:** `src/hooks/useDiagnosticsManager.ts` — the root diagnostics state hook. This checkpoint exposes the `isValidating` flag so downstream hooks and components can read it.

**Contracts implemented:** Hook API contract (useDiagnosticsManager return type extension)

**Verify after:**
```bash
npm run typecheck
npm run test src/hooks/useDiagnosticsManager.test.ts
```
Expected: Type checks pass, new `isValidating` field is present in return type.

**Tasks:**

#### Task 1.1: Add `isValidatingRef` to `useDiagnosticsManager`
- **Layer:** Hooks
- **Files:** `src/hooks/useDiagnosticsManager.ts`
- **What:** Add `const isValidatingRef = useRef(false);` at line ~793 (after `archivedTemplateRef`).
- **Contract:** Hook API contract — internal state for tracking validation in-flight
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation" (setup for fix)

#### Task 1.2: Expose `isValidating` in return object
- **Layer:** Hooks
- **Files:** `src/hooks/useDiagnosticsManager.ts`
- **What:** Add `isValidating: isValidatingRef.current` to the return object at line ~1640 (inside the return block). Update `UseDiagnosticsManagerReturn` interface (line ~587) to include `isValidating: boolean;`.
- **Contract:** Hook API contract — public API extension
- **Blocked by:** Task 1.1
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

#### Task 1.3: Pass `isValidatingRef` to consumers via props
- **Layer:** Hooks
- **Files:** `src/hooks/useDiagnosticsManager.ts`
- **What:** Add `isValidatingRef` to the return object at line ~1640. Add `isValidatingRef: RefObject<boolean>` to `UseDiagnosticsManagerReturn` interface (line ~587).
- **Contract:** Hook API contract — expose ref so parent can set it before/after API calls
- **Blocked by:** Task 1.2
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

---

### Checkpoint 2: Propagate `isValidating` through `DiagnosticsContext`

**Context:** `DiagnosticsContext.tsx` (exact path TBD — likely `src/modules/JobManagement/JobOverview/DiagnosticsContext.tsx` or `src/contexts/DiagnosticsContext.tsx`). This checkpoint wires the new flag from the hook to all consuming components.

**Contracts implemented:** Context API contract (DiagnosticsContext interface extension)

**Verify after:**
```bash
npm run typecheck
npm run test src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.test.tsx
```
Expected: `SparePartsRow` can read `isValidating` from `useDiagnosticsContext()`.

**Tasks:**

#### Task 2.1: Extend `DiagnosticsContextValue` interface
- **Layer:** Context
- **Files:** `src/modules/JobManagement/JobOverview/DiagnosticsContext.tsx` (or similar)
- **What:** Add `isValidating: boolean;` and `isValidatingRef: RefObject<boolean>;` to the context interface.
- **Contract:** Context API contract — type definition
- **Blocked by:** Checkpoint 1 complete
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

#### Task 2.2: Pass `isValidating` and `isValidatingRef` to provider value
- **Layer:** Context
- **Files:** `src/modules/JobManagement/JobOverview/DiagnosticsContext.tsx` (or similar)
- **What:** Read `isValidating` and `isValidatingRef` from `useDiagnosticsManager` return value. Add both to the context provider's `value` object.
- **Contract:** Context API contract — runtime propagation
- **Blocked by:** Task 2.1
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

---

### Checkpoint 3: Fix dirty-marking during validation in `SparePartsRow`

**Context:** `SparePartsRow.tsx` consumes `isValidating` from context and guards the `markRowDirty` call. This checkpoint implements **Bug 1 fix** from the spec.

**Contracts implemented:** Component API contract (SparePartsRow internal behavior change)

**Verify after:**
```bash
npm run test src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.test.tsx
npm run dev  # Manual test: trigger validation, verify user-entered prices are not marked dirty
```
Expected: Validation does not incorrectly mark rows dirty; `arePricesValidated` remains true after successful validation.

**Tasks:**

#### Task 3.1: Read `isValidating` from `useDiagnosticsContext()`
- **Layer:** Component
- **Files:** `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`
- **What:** Add `isValidating` to destructuring of `useDiagnosticsContext()` at line ~149.
- **Contract:** Component API contract — read validation state
- **Blocked by:** Checkpoint 2 complete
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

#### Task 3.2: Guard `markRowDirty` call with `isValidating` check
- **Layer:** Component
- **Files:** `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`
- **What:** Modify the `useEffect` at line ~467 that calls `markRowDirty`. Add `&& !isValidating` guard to the final condition (line ~477). The guard should be: `if (isResyncingRef.current || isValidating) return;`.
- **Contract:** Component API contract — Bug 1 fix (prevent dirty-marking during validation)
- **Blocked by:** Task 3.1
- **Spec coverage:** business-behavior-spec.md scenarios "User-entered price values remain intact after validation", "User-entered discount values remain intact after validation", "User-entered total amount remains intact after validation"

---

### Checkpoint 4: Prevent `onUserEdit` during validation in `useSparePartPriceCalculation`

**Context:** `useSparePartPriceCalculation.ts` — the price recalculation hook. This checkpoint implements **Bug 5 fix** by preventing `onUserEdit` from being called during validation.

**Contracts implemented:** Hook API contract (useSparePartPriceCalculation interface extension)

**Verify after:**
```bash
npm run test src/modules/JobManagement/JobOverview/SparePartsRow/useSparePartPriceCalculation.test.ts
npm run dev  # Manual test: enter prices, click validate, verify onUserEdit is not called during validation
```
Expected: `onUserEdit` is not called during validation API in-flight period; `markRowDirty` is not invoked during validation.

**Tasks:**

#### Task 4.1: Extend `SparePartFieldNames` interface with `isValidating`
- **Layer:** Custom hooks
- **Files:** `src/modules/JobManagement/JobOverview/SparePartsRow/useSparePartPriceCalculation.ts`
- **What:** Add `isValidating?: boolean;` to `SparePartFieldNames` interface at line ~32.
- **Contract:** Hook API contract — parameter extension
- **Blocked by:** Checkpoint 2 complete (so `isValidating` is available in `SparePartsRow`)
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

#### Task 4.2: Guard `onUserEdit()` call with `isValidating` check
- **Layer:** Custom hooks
- **Files:** `src/modules/JobManagement/JobOverview/SparePartsRow/useSparePartPriceCalculation.ts`
- **What:** Modify the `onUserEdit` call at line ~301. Change:
  ```typescript
  if (!isInitialRecalculation) {
    fieldNames.onUserEdit?.();
  }
  ```
  To:
  ```typescript
  if (!isInitialRecalculation && !fieldNames.isValidating) {
    fieldNames.onUserEdit?.();
  }
  ```
- **Contract:** Hook API contract — Bug 5 fix (prevent onUserEdit during validation)
- **Blocked by:** Task 4.1
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

#### Task 4.3: Pass `isValidating` from `SparePartsRow` to `useSparePartsRowCommon`
- **Layer:** Component
- **Files:** `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.tsx`
- **What:** Locate the call to `useSparePartsRowCommon` at line ~445. This hook internally calls `useSparePartPriceCalculation`. Pass `isValidating` to the hook (requires inspecting `SparePartsRow.shared.ts` to determine how to thread this through).
  
  **Note:** The exact implementation depends on `useSparePartsRowCommon`'s API. If it already accepts an options object, add `isValidating` to that. If not, add it as a new parameter and pass it through to `useSparePartPriceCalculation`.
  
  **Files to inspect:** `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.shared.ts`
- **Contract:** Component API contract — wire validation flag through to price calculation hook
- **Blocked by:** Task 4.2
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

---

### Checkpoint 5: Set `isValidatingRef` before/after validation API call

**Context:** `JobOverview.tsx` or `SparePartsArea.tsx` (exact file TBD — wherever the validation button's `onClick` handler lives). This checkpoint wires the validation lifecycle to the new ref.

**Contracts implemented:** Validation API integration contract

**Verify after:**
```bash
npm run dev  # Manual test: open diagnostics tab, edit prices, click validate button, observe isValidating flag
```
Expected: `isValidating` is `true` during validation API in-flight, `false` after completion.

**Tasks:**

#### Task 5.1: Locate validation API call site
- **Layer:** Component (research task)
- **Files:** `src/modules/JobManagement/JobOverview/JobOverview.tsx`, `src/modules/JobManagement/JobOverview/SparePartsArea/*.tsx`, or similar
- **What:** Search for the validation button's `onClick` handler. Look for:
  - Button with label matching `t("validate")` or similar
  - API call to endpoint matching `/diagnostics/validate` or similar
  - Function name like `validateAndSave`, `onValidate`, `handleValidation`
  
  **Search strategy:**
  ```bash
  grep -r "validate" src/modules/JobManagement/JobOverview/
  grep -r "validateAndSave" src/modules/JobManagement/JobOverview/
  ```
- **Contract:** Validation API integration contract — locate the call site
- **Blocked by:** Checkpoint 1 complete (isValidatingRef exists)
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

#### Task 5.2: Set `isValidatingRef.current = true` before API call
- **Layer:** Component
- **Files:** (result of Task 5.1)
- **What:** In the validation handler function, immediately before the API call:
  ```typescript
  isValidatingRef.current = true;
  validatePrices(payload)
    .then((response) => { /* ... */ })
    .catch((error) => { /* ... */ })
    .finally(() => {
      isValidatingRef.current = false;
    });
  ```
- **Contract:** Validation API integration contract — set flag before API call
- **Blocked by:** Task 5.1
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

#### Task 5.3: Set `isValidatingRef.current = false` after API call completes
- **Layer:** Component
- **Files:** (result of Task 5.1)
- **What:** Add `.finally(() => { isValidatingRef.current = false; })` to the API promise chain. Ensure `finally` runs even if the API call fails.
- **Contract:** Validation API integration contract — clear flag after API call
- **Blocked by:** Task 5.2
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation", error-handling-spec.md scenario "Validation API failure preserves user-entered data"

#### Task 5.4: Ensure `isResyncingRef.current = true` before Formik reinitialization
- **Layer:** Component
- **Files:** (result of Task 5.1)
- **What:** In the `.then()` block after successful validation, immediately before calling Formik's `resetForm` or `setValues`:
  ```typescript
  isResyncingRef.current = true;
  resetForm({ values: newValues });
  // isResyncingRef is cleared elsewhere (likely in a useEffect watching form values)
  ```
- **Contract:** Validation API integration contract — prevent recalculation during API-driven reinitialization
- **Blocked by:** Task 5.3
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

---

### Checkpoint 6: Unit tests for validation state tracking

**Context:** Test files for modified hooks. Verify that `isValidating` flag correctly prevents dirty-marking and `onUserEdit` calls.

**Contracts implemented:** All contracts (test coverage)

**Verify after:**
```bash
npm run test src/hooks/useDiagnosticsManager.test.ts
npm run test src/modules/JobManagement/JobOverview/SparePartsRow/useSparePartPriceCalculation.test.ts
npm run test:cov  # Verify coverage for new branches
```
Expected: All tests pass, coverage includes new branches.

**Tasks:**

#### Task 6.1: Add test for `useDiagnosticsManager` `isValidating` exposure
- **Layer:** Test
- **Files:** `src/hooks/useDiagnosticsManager.test.ts` (create if missing)
- **What:** Add test case:
  ```typescript
  it("exposes isValidating flag", () => {
    const { result } = renderHook(() => useDiagnosticsManager({ /* ... */ }));
    expect(result.current.isValidating).toBe(false);
    // Simulate setting isValidatingRef.current = true externally
    act(() => {
      result.current.isValidatingRef.current = true;
    });
    expect(result.current.isValidating).toBe(true);
  });
  ```
- **Contract:** Hook API contract (useDiagnosticsManager)
- **Blocked by:** Checkpoint 1 complete
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

#### Task 6.2: Add test for `useSparePartPriceCalculation` skipping `onUserEdit` during validation
- **Layer:** Test
- **Files:** `src/modules/JobManagement/JobOverview/SparePartsRow/useSparePartPriceCalculation.test.ts` (create if missing)
- **What:** Add test case:
  ```typescript
  it("does not call onUserEdit when isValidating is true", () => {
    const onUserEdit = vi.fn();
    const { result } = renderHook(() =>
      useSparePartPriceCalculation({
        /* ... field names ... */
        onUserEdit,
        isValidating: true,
        isResyncingRef: { current: false },
      })
    );
    // Simulate user editing unitPrice
    act(() => {
      setFieldValue("unitPrice", 100);
    });
    expect(onUserEdit).not.toHaveBeenCalled();
  });
  ```
- **Contract:** Hook API contract (useSparePartPriceCalculation)
- **Blocked by:** Checkpoint 4 complete
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

#### Task 6.3: Add test for `SparePartsRow` not calling `markRowDirty` during validation
- **Layer:** Test
- **Files:** `src/modules/JobManagement/JobOverview/SparePartsRow/SparePartsRow.test.tsx` (likely exists)
- **What:** Add test case:
  ```typescript
  it("does not mark row dirty when isValidating is true", () => {
    const markRowDirty = vi.fn();
    render(
      <DiagnosticsContext.Provider value={{ isValidating: true, markRowDirty, /* ... */ }}>
        <Formik initialValues={{ /* ... */ }} onSubmit={vi.fn()}>
          <SparePartsRow fields={mockFields} />
        </Formik>
      </DiagnosticsContext.Provider>
    );
    // Simulate changing a non-price field
    fireEvent.change(screen.getByLabelText("Part Number"), { target: { value: "1234567890" } });
    expect(markRowDirty).not.toHaveBeenCalled();
  });
  ```
- **Contract:** Component API contract (SparePartsRow)
- **Blocked by:** Checkpoint 3 complete
- **Spec coverage:** business-behavior-spec.md scenario "User-entered price values remain intact after validation"

---

## Testing strategy

### Unit tests
- **Framework:** Vitest + React Testing Library
- **Pattern:** Colocated `*.test.ts` / `*.test.tsx` files
- **Coverage targets:**
  - `useDiagnosticsManager.ts` — test `isValidating` exposure and ref tracking
  - `useSparePartPriceCalculation.ts` — test `onUserEdit` guard with `isValidating` flag
  - `SparePartsRow.tsx` — test `markRowDirty` guard with `isValidating` flag
  - `DiagnosticsContext.tsx` — test context propagation of `isValidating`

### Integration tests
- **Manual testing per checkpoint:**
  - Checkpoint 1: TypeScript compiler confirms `isValidating` is in return type
  - Checkpoint 2: `SparePartsRow` can read `isValidating` from context without errors
  - Checkpoint 3: Manual flow: edit prices → validate → observe `arePricesValidated` remains true
  - Checkpoint 4: Manual flow: edit prices → validate → observe `onUserEdit` is not called (via console.log or debugger)
  - Checkpoint 5: Manual flow: click validate button → observe network tab → confirm `isValidating` flag transitions
  - Checkpoint 6: `npm run test:cov` confirms new branches are covered

### Live testing (manual)
- **Scenario:** User enters prices, clicks validate, prices remain intact
  - Expected: No dirty-marking during validation API call
  - Expected: `arePricesValidated` remains `true` after successful validation
  - Expected: User-entered values are not overwritten by API response

---

## Risks and open questions

### Risks
1. **Validation API call site unknown:** Task 5.1 must locate the validation handler. If it's in a non-obvious location, this may require additional file reading.
   - **Mitigation:** Use `grep` to search for validation-related terms; read `JobOverview.tsx` and `SparePartsArea.tsx` as likely candidates.

2. **`useSparePartsRowCommon` API unclear:** Task 4.3 requires passing `isValidating` through `useSparePartsRowCommon`. The exact signature is not yet known.
   - **Mitigation:** Read `SparePartsRow.shared.ts` before implementing Task 4.3 to determine the correct API.

3. **`DiagnosticsContext` file location unknown:** Checkpoint 2 assumes the file exists but path is inferred.
   - **Mitigation:** Search for `DiagnosticsContext` or `useDiagnosticsContext` in codebase; common locations are `src/contexts/` or `src/modules/JobManagement/JobOverview/`.

### Open questions
1. **Is there a single validation API call or multiple?** — The spec mentions "validateAndSave" but the exact function name and location are TBD. Task 5.1 will resolve this.

2. **Does `useSparePartsRowCommon` already accept an options object?** — If yes, add `isValidating` to it. If no, add it as a new parameter. Task 4.3 implementation depends on this.

3. **Should `isValidatingRef` be set in `useDiagnosticsManager` or in the component?** — The design choice is to expose the ref from `useDiagnosticsManager` and let the parent component (JobOverview or SparePartsArea) set it. This keeps validation orchestration at the component level while state tracking is in the hook.

4. **Are there other places where validation is triggered?** — The spec focuses on the "validate" button, but there may be auto-validation or other triggers. If found during Task 5.1, apply the same `isValidatingRef` wrapping pattern.
