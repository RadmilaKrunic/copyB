---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
---

# TypeScript Conventions — BASS-Next

## Imports

Import order enforced by linter:
- External dependencies (`react`, `axios`, `@tanstack/react-query`, etc.)
- Internal path aliases (`@/`, `api/`, `components/`, `modules/`, `hooks/`, `utils/`, `types/`)
- Relative imports — **PROHIBITED** (zero relative imports enforced - use path aliases only)

Path aliases configured in `tsconfig.json`:
- `@/` → `src/`
- Bare names: `api/`, `components/`, `modules/`, `hooks/`, `utils/`, `types/`

Example:
```typescript
import { useFormikContext } from "formik";
import { useQuery } from "@tanstack/react-query";
import axiosClient from "api/axios-client/axiosClient";
import { GenericField } from "components/generics/Field/GenericField";
import { useFormInitialization } from "hooks/useFormInitialization";
```

## Naming

- **Interfaces**: PascalCase — `GenericForm`, `Section`, `Field`, `JobOverviewItem`
- **Types**: PascalCase — use interfaces for data structures, types for unions/utilities
- **Components**: PascalCase — `GenericField`, `AccessoryArea`, `JobOverview`
- **Hooks**: `use` prefix — `useFormikContext`, `useDiagnosticsManager`, `useHasPermission`
- **Files**: kebab-case for SCSS, PascalCase for `.tsx`/`.ts` components/types
- **Constants**: UPPER_SNAKE_CASE — `DEFAULT_STALE_TIME_MS`, `PERMISSIONS`

## Type Definitions

- **Interfaces for data structures** — not types (e.g., `Field`, `Area`, `Section`)
- **Never use `any`** — linter enforces this strictly
- **Use `unknown` for dynamic values** — cast with type guards
- **Type files named `*.types.ts`** — colocated with their module

Example from `GenericField.types.ts`:
```typescript
interface Field {
  name: string;
  type: string;
  attributeMapping?: string;
  subtype?: string;
  autoFillFields?: string[];
  dependentFields?: { fieldName: string; fieldValue: string }[];
  dependFieldCondition?: "AND" | "OR";
  permissions?: string[];
}
```

## Strict Type Checking

- **`unknown` for untyped API responses** — cast after validation
- **Type guards for runtime validation** — especially for form values
- **Explicit return types for exported functions**
- **Generic constraints** — `<T extends object>` when applicable

## Console Logging

**PROHIBITED in production code** — no `console.log`, `console.warn`, `console.error`

Exceptions:
- Error boundaries catching errors
- Axios interceptors logging 401/403 responses
- `catch` blocks for debugging (must be removed before commit)
