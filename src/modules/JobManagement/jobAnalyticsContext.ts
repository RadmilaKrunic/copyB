import type { QueryClient } from "@tanstack/react-query";
import { toJobStatus, toJobType, type JobContextPayload } from "@/analytics";
import type { JobDiagnostic, JobOverviewItem } from "./JobList/JobList.types";

export const getCachedJobContext = (
  queryClient: QueryClient,
  jobId: string | undefined,
): JobContextPayload => ({
  jobType: toJobType(queryClient.getQueryData<JobDiagnostic>(["diagnostic", jobId])?.jobType),
  jobStatus: toJobStatus(queryClient.getQueryData<JobOverviewItem>(["job", jobId])?.job?.jobStatus),
});
