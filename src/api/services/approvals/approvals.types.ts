import { Job, JobDiagnostic } from "modules/JobManagement/JobList/JobList.types";

export interface ApprovalJob extends Job {
  ascPhoneNumber?: string;
  diagnosticInfo?: NonNullable<Job["diagnosticInfo"]> &
    Partial<Pick<JobDiagnostic, "typeOfUsage" | "faultCode" | "exchangeReason">>;
}

export interface PreApprovalDecision {
  jobId: string;
  materialIds: string[];
  approvalStatus: string;
  message: string | null;
}
