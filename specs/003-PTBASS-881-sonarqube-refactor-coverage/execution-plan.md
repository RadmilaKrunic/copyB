# Execution Plan: Refactor code duplication and increase test coverage to meet quality standards

## Target repo

**Service:** BASS-Next Web  
**Path:** `C:\Projects\Bass\bassnext.web`  
**Area:** Frontend (FE)  
**Stack:** React 19 + TypeScript + Vite + Vitest + React Testing Library

## Context referenced

**CLAUDE.md:** Read and incorporated architecture patterns  
**Rules:**
- `.claude/rules/testing.md` — Vitest + React Testing Library conventions
- `.claude/rules/react-conventions.md` — Component structure, state management
- `.claude/rules/typescript-conventions.md` — Import rules, naming, type patterns
- `.claude/rules/api-domain-pattern.md` — API service layer structure

**Current state:**
- Total statement coverage: 72.44%
- Target coverage: 83%
- Duplicated code identified in Reimbursement module across 3 list components
- 190 existing test files in the project

## Architecture layers affected

1. **Components Layer** — `src/modules/Reimbursement/`, `src/modules/AccountManagement/ASC/`, `src/modules/Dashboard/`
2. **Shared Components** — `src/modules/Reimbursement/shared/` (new)
3. **Hooks Layer** — `src/hooks/useReimbursementListState.ts` (new)
4. **Utils Layer** — `src/utils/queryParamBuilder.ts` (new)
5. **API Services Layer** — `src/api/services/reimbursements/`, `src/api/services/users/`, `src/api/services/serviceCenters/`
6. **UI Components Layer** — `src/components/ui/PurchaseDateModal/`, `src/components/ui/DynamicDropdown/`
7. **Test Infrastructure** — All test files colocated with source files

## Software contracts

### Shared Component Contract: DateChangeObserver

**File:** `src/modules/Reimbursement/shared/DateChangeObserver.tsx`

**Interface:**
```typescript
interface DateFilterValues {
  fromDate: string | null;
  toDate: string | null;
}

interface DateChangeObserverProps {
  onDateChange: (values: DateFilterValues) => void;
  skipSessionStorage: boolean;
  storageKeyPrefix?: string; // "reimbursementList" | "reimbursementASCList" | "reimbursementClaimsList"
}
```

**Behavior:**
- Consumes Formik context via `useFormikContext<DateFilterValues>()`
- Auto-corrects `toDate` if `fromDate > toDate`
- Persists date values to sessionStorage with dynamic prefix
- Triggers `onDateChange` callback on value change
- Returns null (invisible component)

**Type Exports:**
```typescript
export type { DateFilterValues };
export default DateChangeObserver;
```

---

### Custom Hook Contract: useReimbursementListState

**File:** `src/hooks/useReimbursementListState.ts`

**Signature:**
```typescript
function useReimbursementListState(storageKeyPrefix: string): {
  searchValue: string;
  setSearchValue: (value: string) => void;
  debouncedSearchValue: string;
  pagination: { page: number; pageSize: number };
  setPagination: (pagination: { page: number; pageSize: number }) => void;
  dateFilterValues: DateFilterValues;
  setDateFilterValues: (values: DateFilterValues) => void;
  defaultFromDate: string;
  defaultToDate: string;
  isLastMonthSelected: boolean;
  quickFilters: QuickFilter[];
  handleToggleFilter: (key: string) => void;
}
```

**Dependencies:**
- `useDebouncedValue` from `hooks/useDebouncedValue`
- `useReimbursementDateFilter` from `hooks/useReimbursementDateFilter`
- `useState` for search and pagination state
- `sessionStorage` for persistence with dynamic keys

**Initialization:**
- Reads `${storageKeyPrefix}-currentPage`, `${storageKeyPrefix}-pageSize` from sessionStorage
- Default page: 1, default pageSize: 10
- Default date range: last 2 months to today
- Debounce delay: 500ms for search value

---

### Utility Contract: queryParamBuilder

**File:** `src/utils/queryParamBuilder.ts`

**Signature:**
```typescript
interface QueryParams {
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
  page?: number;
  size?: number;
}

function buildQueryParams(params: QueryParams): URLSearchParams;
```

**Behavior:**
- Creates `URLSearchParams` instance
- Conditionally appends parameters only if defined
- Formats dates as `YYYY-MM-DD` using `formatDateForApi` helper
- Returns URLSearchParams ready for axios request

**Example:**
```typescript
const params = buildQueryParams({ fromDate, toDate, page: 1, size: 10 });
const url = `/v1/reimbursements?${params.toString()}`;
```

---

### Test Pattern Contract

**All test files follow this structure:**

**Component Tests (*.test.tsx):**
```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Formik } from "formik";

// Mock dependencies
vi.mock("api/services/reimbursements/action", () => ({
  fetchReimbursements: vi.fn(),
}));

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

afterEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

describe("ComponentName", () => {
  it("renders correctly with default state", () => { /* ... */ });
  it("handles user interactions", async () => { /* ... */ });
});
```

**API Service Tests (action.test.ts / hooks.test.ts):**
```typescript
import { describe, it, expect, vi, afterEach } from "vitest";
import axiosClient from "api/axios-client/axiosClient";

vi.mock("api/axios-client/axiosClient", () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}));

afterEach(() => vi.clearAllMocks());

describe("fetchReimbursements", () => {
  it("builds correct URL with query params", async () => { /* ... */ });
  it("handles errors and logs them", async () => { /* ... */ });
});
```

**Coverage Target:** At least 80% statement coverage per module

---

## Checkpoints

### Checkpoint 1: Extract shared DateChangeObserver component

**Context:**  
Service: BASS-Next Web (`C:\Projects\Bass\bassnext.web`)  
Spec files: `business-behavior-spec.md` (Scenario: Extract duplicated DateChangeObserver component)  
Current state: DateChangeObserver duplicated in 3 files with identical logic except sessionStorage keys

**Contracts implemented:**
- Shared Component Contract: DateChangeObserver

**Verify after:**
1. `npm run typecheck` — no TypeScript errors
2. `npm run lint` — no linting violations
3. `npm run test` — all existing tests pass
4. Manual: Open each Reimbursement list view, verify date filters work identically

**Tasks:**

#### Task 1.1: Create shared DateChangeObserver component
- **Layer:** Components (shared)
- **Files:** `src/modules/Reimbursement/shared/DateChangeObserver.tsx`
- **What:** Extract DateChangeObserver to shared component file. Accept `storageKeyPrefix` prop to make sessionStorage keys dynamic. Export `DateFilterValues` interface for reuse. Component logic:
  - Consume Formik context: `useFormikContext<DateFilterValues>()`
  - Auto-correct toDate if fromDate > toDate
  - Persist to sessionStorage: `${storageKeyPrefix}-fromDate`, `${storageKeyPrefix}-toDate`
  - Call `onDateChange` when values change
  - Use `useRef` to track previous values
- **Contract:** Shared Component Contract: DateChangeObserver
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Extract duplicated DateChangeObserver component"

#### Task 1.2: Refactor ReimbursementList to use shared DateChangeObserver
- **Layer:** Components
- **Files:** `src/modules/Reimbursement/ReimbursementList/ReimbursementList.tsx`
- **What:** Replace inline DateChangeObserver with import from shared component. Pass `storageKeyPrefix="reimbursementList"` prop. Remove local `DateFilterValues` interface and import from shared file. Verify path alias import: `import DateChangeObserver from "modules/Reimbursement/shared/DateChangeObserver"`.
- **Contract:** Shared Component Contract: DateChangeObserver
- **Blocked by:** Task 1.1
- **Spec coverage:** business-behavior-spec.md scenario "Extract duplicated DateChangeObserver component"

#### Task 1.3: Refactor ReimbursementASCList to use shared DateChangeObserver
- **Layer:** Components
- **Files:** `src/modules/Reimbursement/ReimbursementASCList/ReimbursementASCList.tsx`
- **What:** Replace inline DateChangeObserver with import from shared component. Pass `storageKeyPrefix="reimbursementASCList"` prop. Remove local `DateFilterValues` interface and import from shared file. Verify path alias import: `import DateChangeObserver from "modules/Reimbursement/shared/DateChangeObserver"`.
- **Contract:** Shared Component Contract: DateChangeObserver
- **Blocked by:** Task 1.1
- **Spec coverage:** business-behavior-spec.md scenario "Extract duplicated DateChangeObserver component"

#### Task 1.4: Refactor ReimbursementClaimsList to use shared DateChangeObserver
- **Layer:** Components
- **Files:** `src/modules/Reimbursement/ReimbursementClaimsList/ReimbursementClaimsList.tsx`
- **What:** Replace inline DateChangeObserver with import from shared component. Pass `storageKeyPrefix="reimbursementClaimsList"` prop. Remove local `DateFilterValues` interface and import from shared file. Verify path alias import: `import DateChangeObserver from "modules/Reimbursement/shared/DateChangeObserver"`.
- **Contract:** Shared Component Contract: DateChangeObserver
- **Blocked by:** Task 1.1
- **Spec coverage:** business-behavior-spec.md scenario "Extract duplicated DateChangeObserver component"

#### Task 1.5: Write test for shared DateChangeObserver
- **Layer:** Tests
- **Files:** `src/modules/Reimbursement/shared/DateChangeObserver.test.tsx`
- **What:** Test file for DateChangeObserver. Test cases:
  1. Auto-corrects toDate when fromDate > toDate
  2. Calls onDateChange when values change
  3. Persists to sessionStorage with correct prefix
  4. Skips sessionStorage when skipSessionStorage is true
  Wrap in Formik provider with initialValues: `{ fromDate: null, toDate: null }`. Use `vi.fn()` for onDateChange callback. Mock sessionStorage: `vi.spyOn(Storage.prototype, 'setItem')`.
- **Contract:** Test Pattern Contract
- **Blocked by:** Task 1.1
- **Spec coverage:** validation-spec.md scenario "Extracted components preserve TypeScript types"

---

### Checkpoint 2: Extract shared hooks and utilities

**Context:**  
Service: BASS-Next Web  
Spec files: `business-behavior-spec.md` (Scenarios: Extract duplicated date filter/pagination hooks, Extract query param builder)  
Prior checkpoints: Checkpoint 1 (shared DateChangeObserver extracted)

**Contracts implemented:**
- Custom Hook Contract: useReimbursementListState
- Utility Contract: queryParamBuilder

**Verify after:**
1. `npm run typecheck` — no TypeScript errors
2. `npm run lint` — no linting violations
3. `npm run test` — all tests pass including new hook/utility tests
4. Manual: Verify pagination, search, and date filters work in all 3 list views

**Tasks:**

#### Task 2.1: Create queryParamBuilder utility
- **Layer:** Utils
- **Files:** `src/utils/queryParamBuilder.ts`
- **What:** Create utility function `buildQueryParams(params: QueryParams): URLSearchParams`. Extract `formatDateForApi` helper (private, not exported). Conditionally append fromDate, toDate (formatted as YYYY-MM-DD), searchTerm, page, size to URLSearchParams. Return URLSearchParams instance. Add JSDoc comment explaining usage.
- **Contract:** Utility Contract: queryParamBuilder
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Extract duplicated query parameter building utility"

#### Task 2.2: Refactor reimbursements action.ts to use queryParamBuilder
- **Layer:** API Services
- **Files:** `src/api/services/reimbursements/action.ts`
- **What:** Import `buildQueryParams` from `utils/queryParamBuilder`. Replace manual URLSearchParams construction in `fetchReimbursementASCs`, `fetchReimbursements`, `fetchReimbursementsByAscId` with calls to `buildQueryParams({ fromDate, toDate, searchTerm, page, size })`. Remove local `formatDateForApi` function.
- **Contract:** Utility Contract: queryParamBuilder
- **Blocked by:** Task 2.1
- **Spec coverage:** business-behavior-spec.md scenario "Extract duplicated query parameter building utility"

#### Task 2.3: Create useReimbursementListState hook
- **Layer:** Hooks
- **Files:** `src/hooks/useReimbursementListState.ts`
- **What:** Create custom hook managing search, pagination, and date filter state. Accept `storageKeyPrefix: string` parameter. Use `useState` for searchValue (default ""), pagination (read from sessionStorage: `${storageKeyPrefix}-currentPage`, `${storageKeyPrefix}-pageSize`, defaults 1/10). Use `useDebouncedValue(searchValue, 500)` for debouncedSearchValue. Use `useState` for dateFilterValues (default: last 2 months to today). Use `useReimbursementDateFilter({ storageKeyPrefix })` for quickFilters and handleToggleFilter. Calculate `defaultFromDate` and `defaultToDate` (2 months ago to today, formatted). Return object matching hook contract. Add TypeScript explicit return type.
- **Contract:** Custom Hook Contract: useReimbursementListState
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Extract duplicated date filter and pagination hooks"

#### Task 2.4: Write test for queryParamBuilder utility
- **Layer:** Tests
- **Files:** `src/utils/queryParamBuilder.test.ts`
- **What:** Test file for queryParamBuilder. Test cases:
  1. Builds params with all fields defined
  2. Builds params with only fromDate and toDate
  3. Builds params with only searchTerm
  4. Returns empty URLSearchParams when no params defined
  5. Formats dates correctly (YYYY-MM-DD)
  Mock Date objects for consistent test results.
- **Contract:** Test Pattern Contract
- **Blocked by:** Task 2.1
- **Spec coverage:** validation-spec.md scenario "Extracted utilities are pure functions"

#### Task 2.5: Write test for useReimbursementListState hook
- **Layer:** Tests
- **Files:** `src/hooks/useReimbursementListState.test.ts`
- **What:** Test file for useReimbursementListState hook. Test cases:
  1. Initializes with default values
  2. Initializes from sessionStorage if present
  3. Updates search value and debounces correctly
  4. Updates pagination and persists to sessionStorage
  5. Updates date filter values
  Use `renderHook` from `@testing-library/react`. Mock `useDebouncedValue` and `useReimbursementDateFilter` with `vi.mock()`. Mock sessionStorage.
- **Contract:** Test Pattern Contract
- **Blocked by:** Task 2.3
- **Spec coverage:** validation-spec.md scenario "Extracted hooks preserve React hook rules"

---

### Checkpoint 3: Write tests for Reimbursement module components

**Context:**  
Service: BASS-Next Web  
Spec files: `business-behavior-spec.md` (Scenario: Write tests for Reimbursement module components)  
Prior checkpoints: Checkpoints 1 & 2 (refactoring complete)

**Contracts implemented:**
- Test Pattern Contract (for Reimbursement components)

**Verify after:**
1. `npm run test src/modules/Reimbursement` — all tests pass
2. `npm run test:cov` — Reimbursement module coverage > 80%
3. Coverage report shows ReimbursementList, ReimbursementASCList, ReimbursementClaimsList adequately covered

**Tasks:**

#### Task 3.1: Write test for ReimbursementList component
- **Layer:** Tests
- **Files:** `src/modules/Reimbursement/ReimbursementList/ReimbursementList.test.tsx`
- **What:** Test file for ReimbursementList. Test cases:
  1. Renders table with reimbursement data
  2. Renders loading state while fetching
  3. Handles search input and triggers debounced search
  4. Handles pagination change
  5. Handles date filter change
  Mock `useReimbursements` hook with `vi.mock("api/services/reimbursements/hooks")`. Mock `useReimbursementListState` if refactored (Task 2.3). Wrap in QueryClientProvider and MemoryRouter. Use `waitFor` for async rendering.
- **Contract:** Test Pattern Contract
- **Blocked by:** Checkpoint 1, Checkpoint 2
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for Reimbursement module components"

#### Task 3.2: Write test for ReimbursementASCList component
- **Layer:** Tests
- **Files:** `src/modules/Reimbursement/ReimbursementASCList/ReimbursementASCList.test.tsx`
- **What:** Test file for ReimbursementASCList. Test cases:
  1. Renders table with ASC reimbursement data
  2. Renders loading state while fetching
  3. Handles search input and triggers debounced search
  4. Handles pagination change
  5. Handles date filter change
  Mock `useReimbursementASCs` hook. Mock `useReimbursementListState` if refactored. Wrap in QueryClientProvider and MemoryRouter. Use `waitFor` for async rendering.
- **Contract:** Test Pattern Contract
- **Blocked by:** Checkpoint 1, Checkpoint 2
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for Reimbursement module components"

#### Task 3.3: Write test for ReimbursementClaimsList component
- **Layer:** Tests
- **Files:** `src/modules/Reimbursement/ReimbursementClaimsList/ReimbursementClaimsList.test.tsx`
- **What:** Test file for ReimbursementClaimsList. Test cases:
  1. Renders table with claims data
  2. Renders loading state while fetching
  3. Handles search input and triggers debounced search
  4. Handles pagination change
  5. Handles date filter change
  Mock `useReimbursementsByAscId` hook. Mock `useReimbursementListState` if refactored. Wrap in QueryClientProvider and MemoryRouter. Mock `useParams` to provide ascId. Use `waitFor` for async rendering.
- **Contract:** Test Pattern Contract
- **Blocked by:** Checkpoint 1, Checkpoint 2
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for Reimbursement module components"

---

### Checkpoint 4: Write tests for ASC module components

**Context:**  
Service: BASS-Next Web  
Spec files: `business-behavior-spec.md` (Scenario: Write tests for ASC module components)  
Current coverage: ASCList 7%, ASCDetail minimal

**Contracts implemented:**
- Test Pattern Contract (for ASC components)

**Verify after:**
1. `npm run test src/modules/AccountManagement/ASC` — all tests pass
2. `npm run test:cov` — ASCList > 80%, ASCDetail > 80%

**Tasks:**

#### Task 4.1: Write additional tests for ASCList component
- **Layer:** Tests
- **Files:** `src/modules/AccountManagement/ASC/ASCList/AscList.test.tsx` (enhance existing or create)
- **What:** Expand test coverage for AscList. Test cases:
  1. Renders list of ASCs
  2. Handles search filtering
  3. Handles navigation to ASC detail
  4. Renders empty state when no ASCs
  5. Handles API errors gracefully
  Mock ASC service hooks. Wrap in QueryClientProvider and MemoryRouter.
- **Contract:** Test Pattern Contract
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for ASC module components"

#### Task 4.2: Write tests for ASC detail components
- **Layer:** Tests
- **Files:** `src/modules/AccountManagement/ASC/AscOverview/AscOverview.test.tsx`, `src/modules/AccountManagement/ASC/AddAsc/AddASC.test.tsx`
- **What:** Test files for ASC detail views. Test cases for AscOverview:
  1. Renders ASC details correctly
  2. Handles loading state
  3. Displays error on fetch failure
  Test cases for AddASC:
  1. Renders form with all fields
  2. Handles form submission
  3. Validates required fields
  Mock ASC service hooks and mutations. Wrap in QueryClientProvider, Formik if needed.
- **Contract:** Test Pattern Contract
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for ASC module components"

---

### Checkpoint 5: Write tests for Dashboard module

**Context:**  
Service: BASS-Next Web  
Spec files: `business-behavior-spec.md` (Scenario: Write tests for Dashboard module)  
Current coverage: Dashboard 33.86%

**Contracts implemented:**
- Test Pattern Contract (for Dashboard components)

**Verify after:**
1. `npm run test src/modules/Dashboard` — all tests pass
2. `npm run test:cov` — Dashboard module > 80%

**Tasks:**

#### Task 5.1: Write test for Dashboard main component
- **Layer:** Tests
- **Files:** `src/modules/Dashboard/Dashboard.test.tsx` (enhance existing)
- **What:** Expand existing Dashboard test. Test cases:
  1. Renders dashboard layout with all sections
  2. Renders loading state while fetching data
  3. Displays snapshots/tiles correctly
  4. Displays grid with cards
  Mock dashboard data hooks. Wrap in QueryClientProvider.
- **Contract:** Test Pattern Contract
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for Dashboard module"

#### Task 5.2: Write tests for Dashboard widget components
- **Layer:** Tests
- **Files:** 
  - `src/modules/Dashboard/components/ClaimsCard/ClaimsCard.test.tsx`
  - `src/modules/Dashboard/components/JobsCard/JobsCard.test.tsx`
  - `src/modules/Dashboard/components/RecentActivity/RecentActivity.test.tsx`
  - `src/modules/Dashboard/components/TechnicianWorkload/TechnicianWorkload.test.tsx`
- **What:** Test files for Dashboard widget components. Each test file covers:
  1. Renders with data correctly
  2. Renders empty state when no data
  3. Handles data formatting/display logic
  4. Handles user interactions (if applicable)
  Mock data hooks for each widget. Wrap in QueryClientProvider.
- **Contract:** Test Pattern Contract
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for Dashboard module"

---

### Checkpoint 6: Write tests for API service layers

**Context:**  
Service: BASS-Next Web  
Spec files: `business-behavior-spec.md` (Scenario: Write tests for API service layers)  
Current coverage: reimbursements 5%, users 28%, serviceCenters low

**Contracts implemented:**
- Test Pattern Contract (for API services)

**Verify after:**
1. `npm run test src/api/services/reimbursements` — all tests pass
2. `npm run test src/api/services/users` — all tests pass
3. `npm run test src/api/services/serviceCenters` — all tests pass
4. `npm run test:cov` — each service > 80%

**Tasks:**

#### Task 6.1: Write test for reimbursements action.ts
- **Layer:** Tests
- **Files:** `src/api/services/reimbursements/action.test.ts`
- **What:** Test file for reimbursements action.ts. Test cases:
  1. fetchReimbursements builds correct URL with query params
  2. fetchReimbursementASCs builds correct URL with query params
  3. fetchReimbursementsByAscId includes ascId in URL
  4. fetchReimbursementClaims fetches by reimbursementId
  5. All functions handle axios errors and log them
  Mock `axiosClient` with `vi.mock("api/axios-client/axiosClient")`. Mock console.error to verify error logging.
- **Contract:** Test Pattern Contract
- **Blocked by:** Task 2.2 (queryParamBuilder refactor)
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for API service layers"

#### Task 6.2: Write test for reimbursements hooks.ts
- **Layer:** Tests
- **Files:** `src/api/services/reimbursements/hooks.test.ts`
- **What:** Test file for reimbursements hooks.ts. Test cases:
  1. useReimbursements constructs correct queryKey
  2. useReimbursementASCs calls fetchReimbursementASCs with correct params
  3. useReimbursementsByAscId is enabled only when ascId is provided
  4. useReimbursementClaims caches by reimbursementId
  Mock action.ts functions with `vi.mock("./action")`. Use `renderHook` with QueryClientProvider wrapper.
- **Contract:** Test Pattern Contract
- **Blocked by:** Task 6.1
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for API service layers"

#### Task 6.3: Write test for users action.ts
- **Layer:** Tests
- **Files:** `src/api/services/users/action.test.ts` (enhance existing)
- **What:** Expand existing users action test. Test cases:
  1. Fetches users with correct endpoint
  2. Handles pagination parameters
  3. Handles errors and logs them
  Mock `axiosClient`.
- **Contract:** Test Pattern Contract
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for API service layers"

#### Task 6.4: Write test for users hooks.ts (if exists)
- **Layer:** Tests
- **Files:** `src/api/services/users/hooks.test.ts` (create if hooks.ts exists)
- **What:** Test file for users hooks.ts (only if hooks.ts exists in users service). Test cases:
  1. Hook constructs correct queryKey
  2. Hook calls action with correct params
  Mock action.ts functions. Use `renderHook` with QueryClientProvider wrapper.
- **Contract:** Test Pattern Contract
- **Blocked by:** Task 6.3
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for API service layers"

#### Task 6.5: Write test for serviceCenters action.ts
- **Layer:** Tests
- **Files:** `src/api/services/serviceCenters/action.test.ts` (enhance existing)
- **What:** Expand existing serviceCenters action test. Test cases:
  1. Fetches service centers with correct endpoint
  2. Fetches single service center by ID
  3. Handles errors and logs them
  Mock `axiosClient`.
- **Contract:** Test Pattern Contract
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for API service layers"

#### Task 6.6: Write test for serviceCenters hooks.ts
- **Layer:** Tests
- **Files:** `src/api/services/serviceCenters/hooks.test.ts`
- **What:** Test file for serviceCenters hooks.ts. Test cases:
  1. Hook constructs correct queryKey
  2. Hook calls action with correct params
  3. Hook handles enabled flag correctly
  Mock action.ts functions. Use `renderHook` with QueryClientProvider wrapper.
- **Contract:** Test Pattern Contract
- **Blocked by:** Task 6.5
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for API service layers"

---

### Checkpoint 7: Write tests for UI components

**Context:**  
Service: BASS-Next Web  
Spec files: `business-behavior-spec.md` (Scenario: Write tests for UI components)  
Current coverage: DynamicDropdown partial, PurchaseDateModal 0%, ClaimSparePartsArea 0%

**Contracts implemented:**
- Test Pattern Contract (for UI components)

**Verify after:**
1. `npm run test src/components/ui/DynamicDropdown` — tests pass, > 80% coverage
2. `npm run test src/components/ui/PurchaseDateModal` — tests pass, > 80% coverage
3. `npm run test src/modules/ClaimManagement/ClaimOverview/ClaimSparePartsArea` — tests pass, > 80% coverage

**Tasks:**

#### Task 7.1: Enhance test for DynamicDropdown component
- **Layer:** Tests
- **Files:** `src/components/ui/DynamicDropdown/DynamicDropdown.test.tsx` (enhance existing)
- **What:** Expand existing DynamicDropdown test. Additional test cases:
  1. Fetches options from optionsEndpoint
  2. Handles loading state while fetching options
  3. Handles error state on fetch failure
  4. Filters options based on search term
  5. Handles multi-select mode
  Mock axios for optionsEndpoint. Wrap in Formik provider.
- **Contract:** Test Pattern Contract
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for UI components"

#### Task 7.2: Write test for PurchaseDateModal component
- **Layer:** Tests
- **Files:** `src/components/ui/PurchaseDateModal/PurchaseDateModal.test.tsx`
- **What:** Test file for PurchaseDateModal. Test cases:
  1. Renders modal when isOpen is true
  2. Calls onClose when cancel button clicked
  3. Submits purchase date and calls API
  4. Displays error message on API failure
  5. Invalidates job query on success
  Mock `usePostPurchaseDate` hook. Mock `MessagesContext` provider. Mock `useQueryClient`. Wrap in required providers.
- **Contract:** Test Pattern Contract
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for UI components"

#### Task 7.3: Enhance test for ClaimSparePartsArea component
- **Layer:** Tests
- **Files:** `src/modules/ClaimManagement/ClaimOverview/ClaimSparePartsArea/ClaimSparePartsArea.test.tsx` (enhance existing if exists, otherwise create)
- **What:** Expand or create ClaimSparePartsArea test. Test cases:
  1. Renders spare parts rows correctly
  2. Adds new spare part row on button click
  3. Removes spare part row on delete action
  4. Updates spare part fields via Formik
  5. Validates required fields
  Mock Formik context. Wrap in Formik provider with initialValues containing spareParts array.
- **Contract:** Test Pattern Contract
- **Blocked by:** —
- **Spec coverage:** business-behavior-spec.md scenario "Write tests for UI components"

---

### Checkpoint 8: Verify overall coverage and finalize

**Context:**  
Service: BASS-Next Web  
Spec files: `business-behavior-spec.md` (Scenario: Verify overall coverage reaches target), `integration-spec.md` (all scenarios)  
Prior checkpoints: All refactoring and test writing complete

**Contracts implemented:**
- All contracts validated

**Verify after:**
1. `npm run test` — all tests pass
2. `npm run test:cov` — total statement coverage >= 83%
3. `npm run typecheck` — no errors
4. `npm run lint` — no violations
5. `npm run build:dev` — successful build
6. Coverage HTML report shows no critical gaps in priority modules

**Tasks:**

#### Task 8.1: Run coverage analysis and identify gaps
- **Layer:** Testing Infrastructure
- **Files:** N/A (analysis task)
- **What:** Run `npm run test:cov` and analyze coverage HTML report. Identify any modules below 80% coverage in priority areas (Reimbursement, ASC, Dashboard, API services, UI components). List uncovered files and functions. Document findings.
- **Contract:** N/A
- **Blocked by:** Checkpoints 1-7
- **Spec coverage:** business-behavior-spec.md scenario "Verify overall coverage reaches target"

#### Task 8.2: Write additional tests for uncovered code paths
- **Layer:** Tests
- **Files:** TBD based on Task 8.1 analysis
- **What:** Write additional test cases for uncovered code paths identified in Task 8.1. Prioritize:
  1. Utility functions in `src/utils/`
  2. Helper functions in modules
  3. Error handling branches
  4. Edge cases in components
  Target: raise overall coverage to >= 83%.
- **Contract:** Test Pattern Contract
- **Blocked by:** Task 8.1
- **Spec coverage:** business-behavior-spec.md scenario "Verify overall coverage reaches target"

#### Task 8.3: Verify all linting and type checking passes
- **Layer:** Quality Assurance
- **Files:** N/A (verification task)
- **What:** Run quality checks:
  1. `npm run lint` — verify no errors, no relative imports, no `any` types
  2. `npm run typecheck` — verify no TypeScript errors
  3. Verify all test files use path aliases (not relative imports)
  4. Verify all mocks are cleaned up in `afterEach` hooks
  Fix any violations found.
- **Contract:** N/A
- **Blocked by:** Checkpoints 1-7, Task 8.2
- **Spec coverage:** integration-spec.md scenarios "Refactored code passes linting", "Refactored code passes type checking"

#### Task 8.4: Verify build and dev server work correctly
- **Layer:** Build System
- **Files:** N/A (verification task)
- **What:** Verify build and dev server:
  1. `npm run build:dev` — verify successful build, no errors
  2. `npm run dev` — verify dev server starts, no module resolution errors
  3. Open application in browser, manually test:
     - ReimbursementList view (date filters, search, pagination)
     - ReimbursementASCList view (same)
     - ReimbursementClaimsList view (same)
  4. Verify HMR (hot module replacement) works for refactored components
  Fix any runtime errors found.
- **Contract:** N/A
- **Blocked by:** Task 8.3
- **Spec coverage:** integration-spec.md scenarios "Build succeeds with refactored code", "Development server runs with refactored code"

#### Task 8.5: Final coverage validation and SonarQube readiness
- **Layer:** Quality Assurance
- **Files:** N/A (validation task)
- **What:** Final validation:
  1. Run `npm run test:cov` — confirm >= 83% statement coverage
  2. Verify coverage/lcov.info file generated for SonarQube upload
  3. Review coverage HTML report for any critical gaps
  4. Verify SonarQube metrics:
     - Code duplication reduced in Reimbursement module
     - Coverage >= 83%
     - Quality gate ready to pass
  Document final coverage metrics.
- **Contract:** N/A
- **Blocked by:** Task 8.4
- **Spec coverage:** business-behavior-spec.md scenario "Verify overall coverage reaches target", integration-spec.md scenario "SonarQube quality gate passes"

---

## Testing strategy

### Unit Tests (Vitest + React Testing Library)

**Coverage target:** 83% statement coverage overall, 80% per module minimum

**Test categories:**
1. **Component Tests** — UI rendering, user interactions, conditional rendering
2. **Hook Tests** — Custom hooks (useReimbursementListState), React Query hooks
3. **Utility Tests** — Pure functions (queryParamBuilder)
4. **API Service Tests** — action.ts functions (axios calls), hooks.ts (React Query wrappers)

**Mocking strategy:**
- **API calls:** Mock `axiosClient` with `vi.mock("api/axios-client/axiosClient")`
- **React Query hooks:** Mock action.ts functions with `vi.mock("./action")`
- **Custom hooks:** Mock dependencies with `vi.mock()`
- **sessionStorage:** Mock with `vi.spyOn(Storage.prototype, 'getItem/setItem')`

**Test patterns:**
- **Component tests:** Wrap in `QueryClientProvider` (retry: false), `MemoryRouter`, `Formik` as needed
- **Hook tests:** Use `renderHook` from `@testing-library/react` with wrapper
- **Async tests:** Use `waitFor` from `@testing-library/react`, never manual promises
- **Cleanup:** `afterEach(() => { vi.clearAllMocks(); sessionStorage.clear(); })`

### Integration Tests (Manual)

**Per checkpoint verification:**
- **Checkpoint 1:** Manual test of date filters in all 3 Reimbursement list views
- **Checkpoint 2:** Manual test of search, pagination, date range in all list views
- **Checkpoints 3-7:** Automated via Vitest
- **Checkpoint 8:** Full regression test of Reimbursement module + build verification

### Coverage Reporting

**Tools:**
- **Coverage provider:** `v8` (Vitest default)
- **Reporters:** `text`, `html`, `lcov`
- **Reports directory:** `coverage/`

**Exclusions (from vitest.config.ts):**
- `**/*.d.ts`
- `**/*.types.ts`
- `src/setupTests.ts`
- `src/main.tsx`

**CI/CD integration:**
- Coverage data in `lcov` format uploaded to SonarQube
- SonarQube quality gate enforces >= 83% coverage

---

## Risks and open questions

### Risks

1. **Coverage target may require >80% tests per module**
   - **Mitigation:** Prioritize high-impact modules first (Reimbursement, API services), write happy-path tests initially, add edge cases incrementally
   - **Fallback:** If 83% not reachable with reasonable effort, document remaining gaps and negotiate revised target with stakeholders

2. **Refactoring may introduce subtle behavioral regressions**
   - **Mitigation:** Run full test suite after each checkpoint, manual regression testing of Reimbursement views, careful sessionStorage key management
   - **Contingency:** Keep git history clean with atomic commits per task, easy to revert if needed

3. **Existing tests may fail after refactoring**
   - **Mitigation:** Update imports in existing tests to use new shared components/hooks, verify sessionStorage keys remain consistent
   - **Validation:** Run `npm run test` after each checkpoint before proceeding

4. **Test execution time may increase significantly**
   - **Mitigation:** Use `retry: false` in QueryClient for tests, mock all API calls at action.ts level, avoid unnecessary `waitFor` delays
   - **Monitoring:** Track test execution time per checkpoint, optimize slow tests

5. **Path alias resolution may fail in tests**
   - **Mitigation:** vitest.config.ts already includes `tsconfigPaths()` plugin and resolve.alias configuration
   - **Validation:** Verify imports work in first checkpoint before proceeding

### Open Questions

1. **Should useReimbursementListState hook be created immediately or after verifying duplication?**
   - **Recommendation:** Create in Checkpoint 2 after shared component extraction proven successful
   - **Rationale:** Lower risk, validates pattern before larger refactor

2. **Should queryParamBuilder be a generic utility or Reimbursement-specific?**
   - **Recommendation:** Generic utility in `src/utils/` — reusable pattern across API services
   - **Rationale:** Already used in 3 reimbursement endpoints, likely applicable to other services

3. **What is the exact current coverage for ASCList and ASCDetail?**
   - **Action:** Run `npm run test:cov` before Checkpoint 4 to baseline current ASC coverage
   - **Impact:** Determines scope of Task 4.1 and 4.2

4. **Are there existing test files for Dashboard components that need enhancement?**
   - **Action:** Check `src/modules/Dashboard/**/*.test.tsx` before Checkpoint 5
   - **Impact:** Task 5.1 may enhance existing test rather than create new one (already noted as "enhance existing")

5. **Does users service have a hooks.ts file?**
   - **Action:** Verify `src/api/services/users/hooks.ts` exists before Task 6.4
   - **Impact:** Task 6.4 is conditional on hooks.ts existence

6. **Should console.error calls in action.ts be removed as per coding rules?**
   - **Recommendation:** Keep them for now as they exist in current codebase, flag as technical debt for separate cleanup
   - **Rationale:** Removing them is out of scope for coverage/refactoring ticket, existing pattern should be maintained
