---
paths:
  - "src/api/services/**"
---

# API Domain Pattern — BASS-Next

**MANDATORY structure** for every API domain in `src/api/services/`:

```
src/api/services/yourDomain/
├── action.ts              # Raw axios calls using axiosClient
├── hooks.ts               # useQuery / useMutation wrappers
└── yourDomain.types.ts    # Request/response types (optional if types are imported)
```

## Centralized Axios Client

**Use `axiosClient`** from `src/api/axios-client/axiosClient.ts` for ALL requests:

```typescript
import axiosClient from "api/axios-client/axiosClient";
```

Features:
- **JWT token auto-injected** from `localStorage.getItem("token")`
- **`withCredentials: true`** for cookie-based session alongside JWT
- **401 response**: redirects to `${VITE_API_BASE_URL}/auth/login?redirect_uri=<currentPath>`
- **403 on `/auth/me`**: redirects to `${VITE_API_BASE_URL}/v1/auth/logout`
- **403 on other paths**: logs error, does not redirect

## action.ts — Raw API Calls

Contains **pure axios calls** — no React Query, no hooks, no component logic.

Real example from `src/api/services/jobs/action.ts`:

```typescript
import axiosClient from "api/axios-client/axiosClient";
import { Job, JobList, JobOverviewItem, Message } from "modules/JobManagement/JobList/JobList.types";
import { AxiosResponse } from "axios";

export const fetchJobs = async (): Promise<Job[]> => {
  try {
    const response: AxiosResponse<JobList> = await axiosClient.get<JobList>("/v1/jobs");
    return response.data.jobs || [];
  } catch (error) {
    console.error("Error fetching jobs:", error);
    throw error;
  }
};

export const fetchJobById = async (jobId: string): Promise<JobOverviewItem> => {
  try {
    const response: AxiosResponse<JobOverviewItem> = await axiosClient.get<JobOverviewItem>(
      `/v1/jobs/${jobId}`,
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching job ${jobId}:`, error);
    throw error;
  }
};

export const patchJobByJobId = async (jobId: string, data: unknown): Promise<JobOverviewItem> => {
  try {
    const response: AxiosResponse<JobOverviewItem> = await axiosClient.patch<JobOverviewItem>(
      `/v1/jobs/${jobId}`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error(`Error updating job ${jobId}:`, error);
    throw error;
  }
};
```

Pattern:
1. **Type the response** — `AxiosResponse<T>`, extract `.data`
2. **Try-catch wrapper** — log error, re-throw for React Query to handle
3. **Export async functions** — consumed by hooks.ts
4. **Return typed data** — not the full response object

## hooks.ts — React Query Wrappers

Contains **React Query hooks** wrapping action.ts functions.

Real example from `src/api/services/jobs/hooks.ts`:

```typescript
import { useQuery, UseQueryOptions, useMutation, UseMutationOptions, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_GC_TIME_MS, DEFAULT_STALE_TIME_MS } from "utils/queryConstants";
import { Job, Message } from "modules/JobManagement/JobList/JobList.types";
import { fetchJobs, fetchJobById, patchJobByJobId } from "./action";

export const useJobs = (options?: UseQueryOptions<Job[], Error>) => {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: fetchJobs,
    refetchOnWindowFocus: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    refetchOnMount: "always",
    select: (data: Job[]) => {
      return [...data].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    },
    ...options,
  });
};

export const useJobById = (jobId: string) => {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: () => fetchJobById(jobId),
    enabled: !!jobId,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: DEFAULT_STALE_TIME_MS,
    gcTime: DEFAULT_GC_TIME_MS,
  });
};

export const usePatchJob = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: unknown }) => patchJobByJobId(jobId, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["job", variables.jobId] });
    },
  });
};
```

Pattern:
1. **Named hooks** — `useJobs`, `useJobById`, `usePatchJob`
2. **`queryKey` array** — hierarchical caching: `["jobs"]`, `["job", jobId]`
3. **`staleTime` / `gcTime`** — use constants from `utils/queryConstants`
4. **`enabled` for dependent queries** — `enabled: !!jobId`
5. **`select` for transformations** — sort, filter, map at query level
6. **Mutations invalidate related queries** — `queryClient.invalidateQueries()`

## Query Keys Convention

Hierarchical structure:
- `["jobs"]` — all jobs list
- `["job", jobId]` — single job by ID
- `["messages", jobId, "job"]` — messages for a job
- `["messages", jobId, "claim"]` — messages for a claim
- `["UIConfiguration", countryCode]` — UI config by country

Invalidate parent keys to refresh child queries.

## Error Handling

- **action.ts**: log and re-throw — React Query catches the error
- **hooks.ts**: optional `onError` callback for UI notifications
- **Components**: consume `error` and `isError` from query results

## Critical Rules

- **NEVER call axios directly in components** — always go through action.ts
- **NEVER use `fetch`** — use `axiosClient` only
- **NEVER skip the try-catch in action.ts** — error logging is mandatory
- **NEVER mutate without invalidating** — mutations MUST invalidate related queries
- **Always type the response** — `AxiosResponse<T>`, not `any`
