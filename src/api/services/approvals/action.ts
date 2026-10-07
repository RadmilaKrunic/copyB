import { GoodwillApproval } from "modules/ClaimManagement/ApprovalList/ApprovalList.types";
import { ApprovalColumnConfiguration } from "modules/ClaimManagement/ApprovalList/ApprovalListTable/ApprovalListColumns.config";
import { fetchJobs, fetchDiagnosticByJobId } from "../jobs/action";
import { getASCById } from "../serviceCenters/action";
import axiosClient from "api/axios-client/axiosClient";
import { PreApprovalDecision } from "./approvals.types";
import { DEFAULT_COLUMN_CONFIGURATION as JOB_COLUMN_CONFIGURATION } from "modules/JobManagement/JobList/JobList.columns.utils";

const APPROVAL_DETAILS_BATCH_SIZE = 10;

export const fetchApprovals = async (): Promise<GoodwillApproval[]> => {
  try {
    const allJobs = await fetchJobs();
    const serviceCenterRequests = new Map<string, ReturnType<typeof getASCById>>();
    const approvals: GoodwillApproval[] = [];

    for (
      let startIndex = 0;
      startIndex < allJobs.length;
      startIndex += APPROVAL_DETAILS_BATCH_SIZE
    ) {
      const batch = await Promise.all(
        allJobs.slice(startIndex, startIndex + APPROVAL_DETAILS_BATCH_SIZE).map(async (job) => {
          let serviceCenterRequest = serviceCenterRequests.get(job.ascId);
          if (job.ascId && serviceCenterRequest === undefined) {
            serviceCenterRequest = getASCById(job.ascId);
            serviceCenterRequests.set(job.ascId, serviceCenterRequest);
          }

          const [serviceCenter, diagnostic] = await Promise.all([
            serviceCenterRequest?.catch(() => undefined),
            job.diagnosticInfo
              ? fetchDiagnosticByJobId(job.jobId).catch(() => undefined)
              : undefined,
          ]);
          const approval: GoodwillApproval = { ...job };
          if (serviceCenter) {
            approval.ascPhoneNumber = serviceCenter.phoneNumber;
          }
          if (job.diagnosticInfo && diagnostic) {
            approval.diagnosticInfo = {
              ...job.diagnosticInfo,
              typeOfUsage: diagnostic.typeOfUsage,
              faultCode: diagnostic.faultCode,
              exchangeReason: diagnostic.exchangeReason,
            };
          }
          return approval;
        }),
      );
      approvals.push(...batch);
    }
    return approvals;
  } catch (error) {
    console.error("Error fetching goodwill approvals:", error);
    throw error;
  }
};

export const saveApprovalListColumns = async (
  columns: ApprovalColumnConfiguration[],
): Promise<void> => {
  try {
    const jobColumnKeys = new Set<string>(JOB_COLUMN_CONFIGURATION.map((col) => col.key));
    const selectedColumnKeys = new Set<string>(
      JOB_COLUMN_CONFIGURATION.filter((col) => col.isFixed).map((col) => col.key),
    );
    columns
      .filter((col) => col.isChecked && jobColumnKeys.has(col.key))
      .forEach((col) => selectedColumnKeys.add(col.key));
    await axiosClient.post(`/v1/profile/preferences/job`, [...selectedColumnKeys]);
  } catch (error) {
    console.error("Error saving approval list columns:", error);
    throw error;
  }
};

export const updateApprovalStatus = async ({
  jobId,
  materialIds,
  approvalStatus,
  message,
}: PreApprovalDecision): Promise<void> => {
  try {
    await axiosClient.post(`/v1/jobs/${jobId}/flow/bosch-approval`, {
      materialIds,
      approvalStatus,
      message,
    });
  } catch (error) {
    console.error(`Error updating approval status for job ${jobId}:`, error);
    throw error;
  }
};

export const approveJobs = async (jobIds: string[]): Promise<void> => {
  try {
    await axiosClient.post("/v1/jobs/flow/bosch-approval/approve", { jobIds });
  } catch (error) {
    console.error("Error approving jobs:", error);
    throw error;
  }
};
