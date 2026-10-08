# Execution Plan — PTBASS-1435: Reimbursement Filter Parity (ASC List + Reimbursement List)

## Goal

Make the `ReimbursementList` tab behave identically to `ReimbursementASCList` with respect to date-range filtering:

- Both tabs support two modes based on UIConfiguration availability:
  - **UIConfig present**: Date picker visible, defaults to current-month range, chip deselected by default
  - **UIConfig absent**: Date picker hidden, defaults to last-month range, chip selected by default
- Both tabs drive the API with optional `fromDate`/`endDate` query params (server-side filtering).
- Both tabs keep chip + date range in sync when UIConfig is present.
- Both tabs persist and restore filter state from `sessionStorage`.
- The existing render-cycle race condition in `ReimbursementASCList` is fixed.
- Text search stays client-side on both tabs.

---

## Constraints & Resolved Decisions

| Question                  | Decision                                                                                                   |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Inverted date range guard | DatePicker already prevents it — no extra hook guard needed                                                |
| Session restore on mount  | Restore chip + date range from session if present; otherwise use UIConfig-conditional defaults             |
| Text search               | Client-side only — only date filtering moves to server-side                                                |
| UIConfig missing behavior | Date picker hidden, chip selected by default, API called with last-month range (or no dates if deselected) |
| Optional date params      | `fromDate?`/`endDate?` in API; when both undefined, call without query string (fetch all data)             |

---

## Architecture Overview

### UIConfig-Conditional Behavior

**Both tabs** adapt their UI and defaults based on whether UIConfiguration provides a `reimbursementFilters` form:

| Condition                                                  | Date Picker | Default Date Range          | Default Chip State | Chip Toggle Behavior                                           |
| ---------------------------------------------------------- | ----------- | --------------------------- | ------------------ | -------------------------------------------------------------- |
| **UIConfig present** (`reimbursementFiltersArea` exists)   | Visible     | Current month (1st → today) | Deselected         | Selected = last month; Deselected = current month              |
| **UIConfig absent** (`reimbursementFiltersArea` is `null`) | Hidden      | Last month (1st → last day) | Selected           | Selected = last month dates; Deselected = no dates (fetch all) |

**Both tabs** check `hasUIConfig = !!reimbursementFiltersArea` to determine mode.

**The only difference:** when UIConfig is present, the date picker implementation differs:

- **ASC List**: renders `GenericArea` (metadata-driven)
- **Reimbursement List**: renders standalone `DatePicker` component

### Shared utility: `Reimbursement.utils.ts`

Promote the date-range helper functions out of `ReimbursementASCList` into the shared utils file. Both tabs will import them.

### Shared hook: `useReimbursementDateFilter.ts` (new)

Extract the chip + date-range state machine into a single reusable hook used by both tabs. This eliminates the duplicated logic and fixes the race condition in one place.

**UIConfig-conditional behavior:**

- When `hasUIConfig: true`: date picker visible, default to current-month range, chip deselected by default
- When `hasUIConfig: false`: date picker hidden, default to last-month dates, chip selected by default; toggling chip switches between last-month dates and `undefined` (no filter)

### API layer: `action.ts` + `hooks.ts`

Add **optional** `fromDate?`/`endDate?` parameters to `fetchReimbursements`, `fetchReimbursementASCs`, and their hooks. The `queryKey` must include the dates (or a sentinel when undefined) so React Query treats each distinct filter state as a separate cache entry.

When both params are `undefined`, call the API without query string (fetch all data).

### Component changes

- `ReimbursementASCList`: remove inline state logic, consume the shared hook, fix the Formik render-cycle bug.
- `ReimbursementList`: remove client-side `filterReimbursements` date logic, consume the shared hook, add the `fromDate`/`endDate` params to its query.

---

## Step-by-Step Implementation

### Step 1 — Promote date helpers to `Reimbursement.utils.ts`

**File:** `src/modules/Reimbursement/Reimbursement.utils.ts`

Add the following exported functions (they currently live as private functions inside `ReimbursementASCList.tsx`):

```typescript
// Returns a DD.MM.YYYY string
export const formatDateDMY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// "DD.MM.YYYY - DD.MM.YYYY" string for current month: 1st → today
export const getDefaultDateRange = (): string => {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  return `${formatDateDMY(firstOfMonth)} - ${formatDateDMY(today)}`;
};

// "DD.MM.YYYY - DD.MM.YYYY" string for previous calendar month
export const getLastMonthDateRange = (): string => {
  const today = new Date();
  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  return `${formatDateDMY(firstOfLastMonth)} - ${formatDateDMY(lastOfLastMonth)}`;
};

// Parses "DD.MM.YYYY - DD.MM.YYYY" into { fromDate, toDate } or null
export const parseDateRangeString = (s: string): { fromDate: Date; toDate: Date } | null => {
  if (!s?.includes(" - ")) return null;
  const [fromStr, toStr] = s.split(" - ");
  const parseDate = (ds: string): Date | null => {
    const parts = ds.trim().split(".");
    if (parts.length !== 3) return null;
    const day = Number.parseInt(parts[0], 10);
    const month = Number.parseInt(parts[1], 10) - 1;
    const year = Number.parseInt(parts[2], 10);
    if (Number.isNaN(day) || Number.isNaN(month) || Number.isNaN(year)) return null;
    return new Date(year, month, day);
  };
  const fromDate = parseDate(fromStr);
  const toDate = parseDate(toStr);
  if (!fromDate || !toDate) return null;
  return { fromDate, toDate };
};
```

Remove `isDateInLastMonth` and the date filtering logic from `filterReimbursements` — the date filter moves to the server. The `filterReimbursements` function will only handle `searchValue` after this change. The `advancedFilters` parameter may be removed or kept as a no-op if other callers exist (check first).

---

### Step 2 — Create shared hook `useReimbursementDateFilter`

**File:** `src/hooks/useReimbursementDateFilter.ts` (new file)

This hook owns:

- `dateRangeFilter` state (string in `DD.MM.YYYY - DD.MM.YYYY` format)
- `quickFilters` state (array with `lastMonth` chip)
- Parsed `{ fromDate, toDate }` for the query key (memoized)
- `handleToggleFilter(key)` — updates chip and date range atomically
- `handleDateRangeChange(newRange)` — updates date range and syncs chip; call from the Formik `useEffect` (see Step 4)

Session storage keys are tab-scoped (passed as a parameter).

```typescript
// src/hooks/useReimbursementDateFilter.ts
import { useState, useMemo } from "react";
import { QuickFilter } from "components/ui/List/List.types";
import {
  getDefaultDateRange,
  getLastMonthDateRange,
  parseDateRangeString,
} from "modules/Reimbursement/Reimbursement.utils";

interface UseReimbursementDateFilterOptions {
  storageKeyPrefix: string; // e.g. "reimbursement" | "reimbursementList"
  hasUIConfig: boolean; // true = date picker visible; false = hidden, chip-only mode
}

interface UseReimbursementDateFilterResult {
  dateRangeFilter: string;
  quickFilters: QuickFilter[];
  parsedDateRange: { fromDate: Date; toDate: Date } | null;
  fromDate: Date | undefined;
  toDate: Date | undefined;
  handleToggleFilter: (key: string) => void;
  handleDateRangeChange: (newRange: string) => void;
}

export function useReimbursementDateFilter({
  storageKeyPrefix,
  hasUIConfig,
}: UseReimbursementDateFilterOptions): UseReimbursementDateFilterResult {
  const quickFiltersKey = `${storageKeyPrefix}-quickFilters`;
  const dateRangeKey = `${storageKeyPrefix}-dateRange`;

  // Session restore: chip state
  const storedQuickFilters = (() => {
    try {
      return JSON.parse(sessionStorage.getItem(quickFiltersKey) || "null");
    } catch {
      return null;
    }
  })();

  // Session restore: date range — fall back to UIConfig-conditional default if absent or malformed
  const storedDateRange = (() => {
    try {
      const raw = sessionStorage.getItem(dateRangeKey);
      if (!raw) return null;
      // Validate it parses; if not, discard
      return parseDateRangeString(raw) ? raw : null;
    } catch {
      return null;
    }
  })();

  // UIConfig-conditional defaults
  const defaultChipSelected = !hasUIConfig; // selected when UIConfig missing
  const defaultRange = hasUIConfig ? getDefaultDateRange() : getLastMonthDateRange();

  const QUICK_FILTERS_DEFAULT: QuickFilter[] = [
    { key: "lastMonth", label: "lastMonth", selected: defaultChipSelected },
  ];

  const [quickFilters, setQuickFilters] = useState<QuickFilter[]>(
    storedQuickFilters ?? QUICK_FILTERS_DEFAULT,
  );
  const [dateRangeFilter, setDateRangeFilter] = useState<string>(storedDateRange ?? defaultRange);

  // Initialise session storage on first mount if nothing was stored
  if (!storedDateRange) {
    sessionStorage.setItem(dateRangeKey, dateRangeFilter);
  }
  if (!storedQuickFilters) {
    sessionStorage.setItem(quickFiltersKey, JSON.stringify(quickFilters));
  }

  const parsedDateRange = useMemo(() => parseDateRangeString(dateRangeFilter), [dateRangeFilter]);

  // When UIConfig missing + chip deselected, return undefined dates (no filter)
  const isLastMonthSelected = quickFilters.find((f) => f.key === "lastMonth")?.selected ?? false;
  const fromDate = !hasUIConfig && !isLastMonthSelected ? undefined : parsedDateRange?.fromDate;
  const toDate = !hasUIConfig && !isLastMonthSelected ? undefined : parsedDateRange?.toDate;

  const handleToggleFilter = (key: string) => {
    setQuickFilters((prev) => {
      const updated = prev.map((f) => (f.key === key ? { ...f, selected: !f.selected } : f));
      sessionStorage.setItem(quickFiltersKey, JSON.stringify(updated));

      if (key === "lastMonth") {
        const isNowSelected = updated.find((f) => f.key === "lastMonth")?.selected ?? false;

        if (hasUIConfig) {
          // UIConfig present: toggle between last month and current month
          const newRange = isNowSelected ? getLastMonthDateRange() : getDefaultDateRange();
          setDateRangeFilter(newRange);
          sessionStorage.setItem(dateRangeKey, newRange);
        } else {
          // UIConfig absent: toggle between last month and "no filter" (but keep range in state for when re-selected)
          // When deselected, fromDate/toDate computed above will return undefined
          if (isNowSelected) {
            const newRange = getLastMonthDateRange();
            setDateRangeFilter(newRange);
            sessionStorage.setItem(dateRangeKey, newRange);
          }
          // When deselected, keep dateRangeFilter as-is so re-selecting restores it
        }
      }

      return updated;
    });
  };

  const handleDateRangeChange = (newRange: string) => {
    if (newRange === dateRangeFilter) return;
    setDateRangeFilter(newRange);
    sessionStorage.setItem(dateRangeKey, newRange);

    // Sync chip: select lastMonth chip if range matches last month, else deselect
    const lastMonthRange = getLastMonthDateRange();
    setQuickFilters((prev) => {
      const alreadySynced =
        prev.find((f) => f.key === "lastMonth")?.selected === (newRange === lastMonthRange);
      if (alreadySynced) return prev;
      const updated = prev.map((f) =>
        f.key === "lastMonth" ? { ...f, selected: newRange === lastMonthRange } : f,
      );
      sessionStorage.setItem(quickFiltersKey, JSON.stringify(updated));
      return updated;
    });
  };

  return {
    dateRangeFilter,
    quickFilters,
    parsedDateRange,
    fromDate,
    toDate,
    handleToggleFilter,
    handleDateRangeChange,
  };
}
```

Key design decisions:

- `hasUIConfig` toggles between two modes: date-picker-visible (current-month default, chip deselected) vs chip-only (last-month default, chip selected).
- When `hasUIConfig: false` and chip is deselected, `fromDate`/`toDate` are `undefined` (signals "no date filter" to API).
- `parseDateRangeString` validates session storage — malformed values silently ignored.
- `handleToggleFilter`/`handleDateRangeChange` split keeps chip and date range in sync without coupling inside Formik render function.
- Both state setters use functional form to avoid stale-closure bugs.

---

### Step 3 — Extend the API layer to accept optional date parameters

**File:** `src/api/services/reimbursements/action.ts`

Make date params **optional** in `fetchReimbursements` and `fetchReimbursementASCs`:

```typescript
// Keep formatDateForApi private here (already exists in action.ts)
export const fetchReimbursements = async (
  fromDate?: Date,
  endDate?: Date,
): Promise<Reimbursement[]> => {
  try {
    let url = "/v1/reimbursements";
    if (fromDate && endDate) {
      const formattedFromDate = formatDateForApi(fromDate);
      const formattedEndDate = formatDateForApi(endDate);
      url += `?fromDate=${formattedFromDate}&endDate=${formattedEndDate}`;
    }
    const response: AxiosResponse<ReimbursementList> =
      await axiosClient.get<ReimbursementList>(url);
    return response.data.reimbursements ?? [];
  } catch (error) {
    console.error("Error fetching reimbursements:", error);
    throw error;
  }
};
```

Update `fetchReimbursementASCs` similarly (it already has date params; make them optional):

```typescript
export const fetchReimbursementASCs = async (
  fromDate?: Date,
  endDate?: Date,
): Promise<ReimbursementAsc[]> => {
  try {
    let url = "/v1/reimbursements/service-centers";
    if (fromDate && endDate) {
      const formattedFromDate = formatDateForApi(fromDate);
      const formattedEndDate = formatDateForApi(endDate);
      url += `?fromDate=${formattedFromDate}&endDate=${formattedEndDate}`;
    }
    const response: AxiosResponse<ReimbursementAscList> =
      await axiosClient.get<ReimbursementAscList>(url);
    return response.data.serviceCenters;
  } catch (error) {
    console.error("Failed to search ASC names", error);
    throw error;
  }
};
```

Note: `formatDateForApi` already exists in `action.ts` as a private helper. It formats as `YYYY-MM-DD`, which satisfies the validation spec.

**File:** `src/api/services/reimbursements/hooks.ts`

Update `useReimbursements` to accept optional date params and conditionally include them in `queryKey`:

```typescript
export const useReimbursements = (
  fromDate?: Date,
  endDate?: Date,
  options?: UseQueryOptions<Reimbursement[], Error>,
) => {
  const queryKey =
    fromDate && endDate
      ? ["reimbursements", fromDate.toISOString(), endDate.toISOString()]
      : ["reimbursements"];

  return useQuery({
    queryKey,
    queryFn: () => fetchReimbursements(fromDate, endDate),
    enabled: true,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: true,
    ...options,
  });
};
```

The `queryKey` now includes ISO date strings when dates are defined, so React Query automatically caches each distinct range as a separate entry and does not confuse responses from different date ranges (no race condition). When dates are `undefined`, the key is just `["reimbursements"]` (fetch all).

---

### Step 4 — Fix `ReimbursementASCList` (race condition + use shared hook)

**File:** `src/modules/Reimbursement/ReimbursementASCList/ReimbursementASCList.tsx`

#### 4a. Remove local date helpers

Delete the local `formatDate`, `getDefaultDateRange`, `getLastMonthDateRange`, `parseDateRange` functions and the `QUICK_FILTERS` constant — these are now in shared locations.

#### 4b. Replace local state with `useReimbursementDateFilter`

```typescript
const hasUIConfig = !!reimbursementFiltersArea;

const {
  dateRangeFilter,
  quickFilters,
  parsedDateRange,
  fromDate,
  toDate,
  handleToggleFilter,
  handleDateRangeChange,
} = useReimbursementDateFilter({
  storageKeyPrefix: "reimbursement",
  hasUIConfig,
});
```

Remove `const [quickFilters, setQuickFilters] = useState(...)`, `const [dateRangeFilter, setDateRangeFilter] = useState(...)`, and the manual `dateRange` memo — the hook provides all of these.

Update the query call to use the hook's `fromDate`/`toDate` (which may be `undefined` when UIConfig is missing and chip is deselected):

```typescript
const { data: serviceCenters = [] } = useQuery({
  queryKey: ["ascProfiles", fromDate?.toISOString(), toDate?.toISOString()],
  queryFn: () => fetchReimbursementASCs(fromDate, toDate),
  enabled: true,
  refetchOnWindowFocus: false,
  staleTime: DEFAULT_STALE_TIME_MS,
  refetchOnMount: true,
});
```

#### 4c. Fix the Formik render-cycle race condition

The current code calls `setDateRangeFilter` and `setFieldValue` synchronously inside the Formik render function. This causes React to warn about state updates during render and can cause infinite re-render loops.

**Before (broken):**

```tsx
{({ values, setFieldValue }) => {
  if (values.createdOn && values.createdOn !== dateRangeFilter) {
    setDateRangeFilter(values.createdOn);  // state update in render!
    ...
  }
  if (dateRangeFilter && dateRangeFilter !== values.createdOn) {
    void setFieldValue("createdOn", dateRangeFilter);  // state update in render!
  }
  return <GenericArea area={reimbursementFiltersArea} />;
}}
```

**After (fixed):** Conditionally render date picker based on `hasUIConfig`, move synchronization into `useEffect`.

```tsx
{
  hasUIConfig && reimbursementFiltersArea && (
    <div className="inline-date-filter">
      <GenericFormContext.Provider value={contextValue}>
        <Formik
          initialValues={{ createdOn: dateRangeFilter }}
          onSubmit={() => {}}
          enableReinitialize
        >
          <ASCListFormikSync
            dateRangeFilter={dateRangeFilter}
            onDateRangeChange={handleDateRangeChange}
          />
          <GenericArea area={reimbursementFiltersArea} />
        </Formik>
      </GenericFormContext.Provider>
    </div>
  );
}
```

Create a thin inner component (or use a custom hook) `ASCListFormikSync` that calls `useFormikContext` and runs `useEffect` to sync:

```typescript
// Colocated in ReimbursementASCList.tsx (not exported)
function ASCListFormikSync({
  dateRangeFilter,
  onDateRangeChange,
}: {
  dateRangeFilter: string;
  onDateRangeChange: (v: string) => void;
}) {
  const { values, setFieldValue } = useFormikContext<{ createdOn: string }>();

  // Formik value changed by DatePicker → propagate to hook state
  useEffect(() => {
    if (values.createdOn && values.createdOn !== dateRangeFilter) {
      onDateRangeChange(values.createdOn);
    }
  }, [values.createdOn]); // eslint-disable-line react-hooks/exhaustive-deps

  // External state change (chip click) → sync Formik field
  useEffect(() => {
    if (dateRangeFilter && dateRangeFilter !== values.createdOn) {
      void setFieldValue("createdOn", dateRangeFilter);
    }
  }, [dateRangeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
```

This satisfies the error-handling spec scenario: "The ASC List tab does not call setDateRangeFilter inside the Formik render function."

#### 4d. Remove the `formikRef` and pagination session key collision

The `formikRef` is no longer needed after the render-function sync is removed. Remove it.

Also note: `ReimbursementASCList` currently stores pagination under `reimbursementList-currentPage` and `reimbursementList-pageSize` keys — the same keys used by `ReimbursementList`. Rename to `reimbursementASCList-currentPage` and `reimbursementASCList-pageSize` to avoid collision.

---

### Step 5 — Refactor `ReimbursementList` (server-side date filtering)

**File:** `src/modules/Reimbursement/ReimbursementList/ReimbursementList.tsx`

#### 5a. Add UIConfig query and `useReimbursementDateFilter` hook

First, query UIConfiguration (same as ASCList):

```typescript
const user = queryClient.getQueryData<HeaderUserData>(["user"]);
const uiConfiguration = queryClient.getQueryData<{ forms: GenericForm[] }>([
  "UIConfiguration",
  user?.countryCode,
]);

const reimbursementFiltersForm = uiConfiguration?.forms.find(
  (f) => f.name === "reimbursementFilters",
);
const reimbursementFiltersArea = reimbursementFiltersForm?.sections[0]?.areas[0];

const hasUIConfig = !!reimbursementFiltersArea;
```

Then consume the hook with the same logic as ASCList:

```typescript
const {
  dateRangeFilter,
  quickFilters,
  parsedDateRange,
  fromDate,
  toDate,
  handleToggleFilter,
  handleDateRangeChange,
} = useReimbursementDateFilter({
  storageKeyPrefix: "reimbursementList",
  hasUIConfig,
});
```

Remove:

- Local `quickFilters`, `dateRangeFilter` state declarations
- Manual `quickFiltersFromStorage` / `dateRangeFromStorage` session reads
- The local `handleToggleFilter` function (replaced by hook)
- The `advancedFilters` memo (date filter is now server-side)

#### 5b. Switch to server-side date filtering

Replace:

```typescript
const { data: reimbursements = [] } = useReimbursements();
```

With:

```typescript
const { data: reimbursements = [], isError } = useReimbursements(fromDate, toDate);
```

The hook's `fromDate`/`toDate` are already `undefined` when the chip is deselected (in `hasUIConfig: false` mode), so the API will be called without query string (fetch all). No need for `enabled: !!parsedDateRange` — always fetch.

#### 5c. Remove client-side date filtering

Update `filteredReimbursements`:

```typescript
const filteredReimbursements = useMemo(
  () => filterReimbursements(reimbursements, searchValue),
  [reimbursements, searchValue],
);
```

`filterReimbursements` signature in `Reimbursement.utils.ts` will be simplified to only handle text search (see Step 1 — remove date filter from it).

#### 5d. Sync Formik and chip

The `ReimbursementList` uses a standalone `DatePicker` (not `GenericArea`). Replace the broken render-function sync pattern:

```tsx
{({ values }) => {
  if (values.created !== dateRangeFilter) {   // state update in render!
    setDateRangeFilter(values.created || "");
    ...
  }
  return <DatePicker ... />;
}}
```

With an inner sync component:

```typescript
function ReimbursementListFormikSync({
  dateRangeFilter,
  onDateRangeChange,
}: {
  dateRangeFilter: string;
  onDateRangeChange: (v: string) => void;
}) {
  const { values, setFieldValue } = useFormikContext<{ created: string }>();

  useEffect(() => {
    if (values.created && values.created !== dateRangeFilter) {
      onDateRangeChange(values.created);
    }
  }, [values.created]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (dateRangeFilter && dateRangeFilter !== values.created) {
      void setFieldValue("created", dateRangeFilter);
    }
  }, [dateRangeFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
```

And update the Formik usage (**conditionally render** — hidden when `hasUIConfig: false`):

```tsx
{
  hasUIConfig && (
    <div className="inline-date-filter">
      <Formik initialValues={{ created: dateRangeFilter }} onSubmit={() => {}} enableReinitialize>
        <ReimbursementListFormikSync
          dateRangeFilter={dateRangeFilter}
          onDateRangeChange={handleDateRangeChange}
        />
        <DatePicker
          name="created"
          label={t("creationDate")}
          calendar={{
            maxDate: "",
            minDate: "",
            defaultDate: "",
            startOfTheDay: false,
            endOfTheDay: false,
            startYear: 1995,
            endYear: 2035,
            startMonth: 1,
            endMonth: 12,
            useDateInput: true,
            useDatePicker: true,
            dateFormat: "dd.MM.yyyy",
            allowDateRange: true,
            setDefaultToday: false,
          }}
        />
      </Formik>
    </div>
  );
}
```

The date picker is conditionally rendered based on `hasUIConfig`. When UIConfig is absent, only the chip is visible.

#### 5e. Default behavior on first visit

`useReimbursementDateFilter` now initialises with UIConfig-conditional defaults for **both tabs**:

- **`hasUIConfig: true`**: current-month range, chip deselected
- **`hasUIConfig: false`**: last-month range, chip selected

This is the "first visit" default behaviour required by the updated spec. No extra logic needed in the component.

---

### Step 6 — Update `Reimbursement.utils.ts` — simplify `filterReimbursements`

After moving date filtering to the server, `filterReimbursements` only needs to handle text search and the quick filter chip (which is now also driven by the hook, so the chip check can be removed from filtering entirely since the server already filters by date).

Simplified signature:

```typescript
export function filterReimbursements(
  reimbursements: Array<{
    reimbursementId: string;
    ascName: string;
    created: string;
    status: string;
    period: string;
  }>,
  searchValue: string,
): Array<...> {
  if (!searchValue.trim()) return reimbursements;
  const query = searchValue.toLowerCase();
  return reimbursements.filter((r) =>
    flattenReimbursementForSearch(r).some((v) => v.toLowerCase().includes(query)),
  );
}
```

Remove `isDateInLastMonth`, `advancedFilters` parameter, and all date-related filter logic. Remove the `isDateInRange` import from `JobList.utils` if it is no longer used here.

---

### Step 7 — i18n key audit

Verify `bass-en-US.json` already contains:

- `"reimbursement"` — exists (used for breadcrumb)
- `"ascList"` — check; add if missing
- `"reimbursementList"` — check; add if missing
- `"lastMonth"` — check; add if missing
- `"creationDate"` — check; add if missing

Only edit `/i18n/source/bass-en-US.json`. Other locale files are Crowdin-managed.

---

### Step 8 — Error states

Both tabs must show an error state when the API call fails. Add `isError` / `error` handling from the query result:

```tsx
if (isError) {
  return <div className="error-state">{t("errorLoadingData")}</div>;
}
```

Check if `"errorLoadingData"` key exists in `bass-en-US.json`; add it if not.

The filter controls (date picker + chip + search) must remain rendered and interactive even in the error state — render them above the error message, not conditional on success.

---

## File Change Summary

| File                                                                      | Change type        | Summary                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/modules/Reimbursement/Reimbursement.utils.ts`                        | Modify             | Add `formatDateDMY`, `getDefaultDateRange`, `getLastMonthDateRange`, `parseDateRangeString`; simplify `filterReimbursements` to text-search-only; remove `isDateInLastMonth`                                                                                                              |
| `src/hooks/useReimbursementDateFilter.ts`                                 | New                | Shared hook for chip+date-range state with `hasUIConfig` conditional: UIConfig present = date picker visible, current-month default; UIConfig absent = date picker hidden, last-month default, chip selected                                                                              |
| `src/api/services/reimbursements/action.ts`                               | Modify             | Make `fromDate?`/`endDate?` **optional** in `fetchReimbursements` and `fetchReimbursementASCs`; when both undefined, call API without query string                                                                                                                                        |
| `src/api/services/reimbursements/hooks.ts`                                | Modify             | Make `fromDate?`/`endDate?` **optional** params; conditional `queryKey`: `["reimbursements"]` when undefined, `["reimbursements", fromISO, endISO]` when defined                                                                                                                          |
| `src/modules/Reimbursement/ReimbursementASCList/ReimbursementASCList.tsx` | Modify             | Remove local date helpers; use `useReimbursementDateFilter({ hasUIConfig: !!reimbursementFiltersArea })`; conditionally render date picker; fix Formik render-cycle race via `ASCListFormikSync`; fix pagination session key collision                                                    |
| `src/modules/Reimbursement/ReimbursementList/ReimbursementList.tsx`       | Modify             | Query UIConfiguration; remove client-side date filter; use `useReimbursementDateFilter({ hasUIConfig: !!reimbursementFiltersArea })`; conditionally render date picker (same logic as ASCList); switch to `useReimbursements(fromDate, toDate)`; fix Formik render-cycle; add error state |
| `i18n/source/bass-en-US.json`                                             | Modify (if needed) | Add any missing translation keys                                                                                                                                                                                                                                                          |

---

## Testing Checklist

These scenarios map directly to the BDD specs:

### Business behavior (UIConfig present — both tabs)

- [ ] ASC List with UIConfig: mounts with current-month date range, chip deselected, when no session state
- [ ] ASC List with UIConfig: exactly one API call on mount with correct `fromDate`/`endDate`
- [ ] ASC List with UIConfig: "Last Month" chip toggles between last-month and current-month ranges
- [ ] ASC List with UIConfig: Manual date picker change syncs chip (selects if last-month range, else deselects)
- [ ] ASC List with UIConfig: Clearing date picker reverts to current-month default
- [ ] ASC List with UIConfig: Date picker renders as `GenericArea` (metadata-driven)
- [ ] Reimbursement List with UIConfig: mounts with current-month date range, chip deselected, when no session state
- [ ] Reimbursement List with UIConfig: "Last Month" chip toggles between last-month and current-month ranges
- [ ] Reimbursement List with UIConfig: Date picker renders as standalone `DatePicker` component
- [ ] Tab switch and return: filter state persists, no redundant API call if range unchanged

### Business behavior (UIConfig absent — both tabs)

- [ ] ASC List without UIConfig: date picker hidden
- [ ] ASC List without UIConfig: mounts with chip selected, last-month dates passed to API
- [ ] ASC List without UIConfig: deselecting chip calls API with no query string (fetch all)
- [ ] ASC List without UIConfig: re-selecting chip calls API with last-month dates again
- [ ] Reimbursement List without UIConfig: date picker hidden
- [ ] Reimbursement List without UIConfig: mounts with chip selected, last-month dates passed to API
- [ ] Reimbursement List without UIConfig: deselecting chip calls API with no query string (fetch all)
- [ ] Reimbursement List without UIConfig: re-selecting chip calls API with last-month dates again

### Validation

- [ ] Complete range with UIConfig: `fromDate`/`endDate` sent as `YYYY-MM-DD` format
- [ ] Edge case (UIConfig present): first day of month — `fromDate === endDate` for default range
- [ ] Last-month chip on 1 July: fromDate = 2025-06-01, endDate = 2025-06-30
- [ ] Optional params: when both `fromDate` and `endDate` are `undefined`, API called without query string
- [ ] Optional params: when both `fromDate` and `endDate` are defined, API called with `?fromDate=YYYY-MM-DD&endDate=YYYY-MM-DD`

### Error handling

- [ ] API error: table shows error state, controls remain usable
- [ ] No race condition: changing date range mid-flight uses latest range's result
- [ ] No Formik render-cycle infinite loop (no `setDateRangeFilter` inside render function)
- [ ] Malformed session storage: silently ignored, default range used

### Authorization

- [ ] Route protected by `PERMISSIONS.REIMBURSEMENT.CAN_VIEW` (`"R__V"`) — already in `Routes.tsx`, no change needed
- [ ] Reimbursement detail protected — already in `Routes.tsx`, no change needed
- [ ] No data fetch when permission missing — handled by `ProtectedRoute` wrapper (React Query `enabled: true` always, but route blocks render)

---

## Implementation Order

1. `Reimbursement.utils.ts` — add helpers, simplify `filterReimbursements`
2. `src/hooks/useReimbursementDateFilter.ts` — create shared hook
3. `src/api/services/reimbursements/action.ts` — add date params to `fetchReimbursements`
4. `src/api/services/reimbursements/hooks.ts` — update `useReimbursements` signature + queryKey
5. `ReimbursementASCList.tsx` — consume hook, fix Formik sync, fix pagination key
6. `ReimbursementList.tsx` — consume hook, switch to server-side filtering, fix Formik sync
7. `i18n/source/bass-en-US.json` — add any missing keys
8. Run `npm run typecheck` and `npm run lint`
9. Run `npm run test` — fix any broken tests (the `useReimbursements` signature change will break existing test mocks)

---

## Risk Notes

- **`useReimbursements` signature change**: The params are now **optional**, so existing calls `useReimbursements()` will still compile and run (fetching all data). Search with `useReimbursements(` before touching `hooks.ts` to audit all call sites. At time of writing only `ReimbursementList.tsx` calls it directly.
- **`fetchReimbursementASCs` signature change**: Existing call in `ReimbursementASCList.tsx` already passes `fromDate` and `endDate`. Making them optional is backward-compatible — the call site does not need to change unless it wants to pass `undefined`.
- **`reimbursementList-currentPage` session key collision**: Both tabs currently share pagination session keys. Rename ASCList keys to `reimbursementASCList-*` to prevent one tab resetting the other's page position.
- **`enableReinitialize` on Formik**: Both tabs use `enableReinitialize`. Combined with `useEffect` sync, this is safe — `enableReinitialize` only reinitialises when `initialValues` reference changes, and `initialValues` is derived from `dateRangeFilter` which only changes after the effects run, not during render.
- **Identical UIConfig-conditional logic**: Both tabs now query UIConfiguration and use `hasUIConfig = !!reimbursementFiltersArea`. The only difference is the date picker implementation when UIConfig is present: ASCList uses `GenericArea`, ReimbursementList uses standalone `DatePicker`.
