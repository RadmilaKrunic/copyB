---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
---

# Testing Conventions — BASS-Next

## Framework & Setup

- **Vitest** with **React Testing Library**
- **Globals enabled** — `vitest/globals` in `tsconfig.json`, no need to import `describe`, `it`, `expect`
- **Setup file**: `src/setupTests.ts` — imports `@testing-library/jest-dom` matchers
- Mock API with `vi.mock` on `action.ts` / `axiosClient` (house pattern); MSW 2 installed but unused

## Test File Location

**Colocated** — `*.test.ts` / `*.test.tsx` alongside the source file:

```
src/api/services/jobs/
  action.ts
  action.test.ts        ← tests for action.ts
  hooks.ts
  hooks.test.ts         ← tests for hooks.ts
```

## Test Structure

Real example from `src/api/services/jobs/hooks.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock action.ts functions
vi.mock("./action", () => ({
  fetchJobs: vi.fn().mockResolvedValue([]),
  fetchJobById: vi.fn().mockResolvedValue({ id: "j1" }),
  patchJobByJobId: vi.fn().mockResolvedValue(undefined),
}));

import { useJobs, useJobById, usePatchJobById } from "./hooks";
import { fetchJobs, fetchJobById, patchJobByJobId } from "./action";

// React Query wrapper for hooks
function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

describe("useJobs", () => {
  it("fetches jobs and sorts by createdAt descending", async () => {
    const mockJobs = [
      { id: "1", createdAt: "2024-01-01T00:00:00Z" },
      { id: "2", createdAt: "2024-01-02T00:00:00Z" },
    ];
    vi.mocked(fetchJobs).mockResolvedValue(mockJobs);

    const { result } = renderHook(() => useJobs(), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([
      { id: "2", createdAt: "2024-01-02T00:00:00Z" },  // Newest first
      { id: "1", createdAt: "2024-01-01T00:00:00Z" },
    ]);
  });
});

describe("usePatchJobById", () => {
  it("invalidates jobs query on success", async () => {
    const { result } = renderHook(() => usePatchJobById(), { wrapper: makeWrapper() });

    result.current.mutate({ jobId: "j1", data: { status: "COMPLETED" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(patchJobByJobId).toHaveBeenCalledWith("j1", { status: "COMPLETED" });
  });
});
```

## Testing React Query Hooks

Pattern:
1. **Mock action.ts functions** via `vi.mock("./action", () => ({ ... }))`
2. **Create QueryClient wrapper** — disable retry for faster tests
3. **Use `renderHook` from `@testing-library/react`** with wrapper
4. **Wait for success** — `await waitFor(() => expect(result.current.isSuccess).toBe(true))`
5. **Assert on `result.current.data`** — not the hook itself

## Mocking Dependencies

**Vitest mocking** (`vi.mock`):

```typescript
vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import axiosClient from "api/axios-client/axiosClient";

// In test:
vi.mocked(axiosClient.get).mockResolvedValue({ data: { jobs: [] } });
```

**MSW 2** is installed but no test uses it today (0 imports). House pattern: `vi.mock("api/services/<domain>/action")` or `vi.mock("api/axios-client/axiosClient")` (~180 files). Use MSW only if a test genuinely needs network-level behavior.

## Component Testing

**React Testing Library** for components:

```typescript
import { render, screen, fireEvent } from "@testing-library/react";
import GenericField from "./GenericField";
import { Formik } from "formik";

describe("GenericField", () => {
  it("renders text field", () => {
    const field = { name: "firstName", type: "text", label: "First Name" };

    render(
      <Formik initialValues={{ firstName: "" }} onSubmit={vi.fn()}>
        <GenericField field={field} />
      </Formik>
    );

    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
  });

  it("hides field when visibility condition not met", () => {
    const field = {
      name: "optional",
      type: "text",
      dependentFields: [{ fieldName: "enabled", fieldValue: "true" }],
    };

    render(
      <Formik initialValues={{ enabled: "false", optional: "" }} onSubmit={vi.fn()}>
        <GenericField field={field} />
      </Formik>
    );

    expect(screen.queryByLabelText("Optional")).not.toBeInTheDocument();
  });
});
```

## Testing Best Practices

- **Mock at the right layer** — action.ts / axiosClient (vi.mock) > hooks (avoid)
- **Don't test implementation details** — test behavior, not internal state
- **Use `waitFor` for async** — never manually `await new Promise`
- **Disable React Query retry** — `{ queries: { retry: false } }` for faster tests
- **Clean up mocks** — `vi.clearAllMocks()` in `afterEach`
- **Test error states** — mock rejection, verify error handling

## Critical Rules

- **NEVER mock React Query directly** — mock action.ts
- **Always wrap hooks with QueryClientProvider** — use `makeWrapper()` pattern
- **Use `vi.mocked()` for type-safe mock access** — `vi.mocked(fetchJobs).mockResolvedValue(...)`
- **Clean up after tests** — `afterEach(() => vi.clearAllMocks())`
