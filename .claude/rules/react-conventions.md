---
paths:
  - "src/components/**/*.tsx"
  - "src/modules/**/*.tsx"
---

# React Conventions — BASS-Next

## Component Structure

Standard order:
1. Imports (external → internal → path aliases → relative)
2. Type/Interface definitions
3. Component function (default export)
4. Helper functions if colocated (avoid — prefer `utils/`)

Example:
```typescript
import { useFormikContext } from "formik";
import { TextField } from "@bosch/react-frok";
import Field from "components/generics/Field/GenericField.types";
import "./GenericField.scss";

interface Props {
  field: Field;
  disabled?: boolean;
}

const GenericField = ({ field, disabled = false }: Props) => {
  const { values, setFieldValue } = useFormikContext();
  
  return (
    <div className="generic-field">
      <TextField name={field.name} disabled={disabled} />
    </div>
  );
};

export default GenericField;
```

## State Management

- **React Query** for all server state — no raw `useEffect` for data fetching
- **Formik** for all form state — consume via `useFormikContext()`, never prop-drill
- **Context API** for breadcrumbs (`BreadcrumbsContext`) and generic form state (`GenericFormContext`)
- **Local state** (`useState`) only for UI toggles, modals, accordions

Example from `hooks.ts`:
```typescript
export const useJobById = (jobId: string) => {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobById(jobId),
    enabled: !!jobId,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
  });
};
```

## Formik Integration

**All generic components consume Formik context** — never prop-drill form state:

```typescript
const { values, setFieldValue, errors, touched } = useFormikContext<unknown>();
```

Never pass `formik` instance as props — rely on context.

## Styling

- **Plain SCSS per component** — `Component.scss` imported as a side effect (`import "./Component.scss"`); no `.module.scss` files exist
- **BEM-like naming** — `.generic-field`, `.field-label`, `.field-input`
- **Global SCSS variables** auto-injected by Vite — `@use "@/styles/variables.scss" as *;`
- **Bosch FROK components** for UI primitives — `Button`, `TextField`, `Dropdown`, `Icon`

Example:
```scss
.generic-field {
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  &__label {
    font-weight: $font-weight-bold;
  }
}
```

## Error Boundaries

**Wrap every route** in `<ErrorBoundaryWrapper>` (local wrapper in `Routes.tsx` around `react-error-boundary`'s `ErrorBoundary`, keyed by pathname):

```typescript
<Route
  path="/job-overview/:jobId"
  element={
    <ErrorBoundaryWrapper>
      <JobOverview />
    </ErrorBoundaryWrapper>
  }
/>
```

## Hooks

- **Custom hooks** in `src/hooks/` — prefix with `use`
- **React Query hooks** in `src/api/services/{domain}/hooks.ts`
- **Formik hooks** consumed via `useFormikContext()`
- **Permission check** via `useHasPermission(permissions: string[])`

## Testing

- **Vitest + React Testing Library**
- **Test files colocated** — `Component.test.tsx` alongside `Component.tsx`
- **API mocking** — `vi.mock` on `action.ts` / `axiosClient`; never mock React Query
- **`@testing-library/jest-dom` matchers** imported in `setupTests.ts`
