import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchApprovals,
  saveApprovalListColumns,
  updateApprovalStatus,
  approveJobs,
} from "./action";

vi.mock("api/axios-client/axiosClient", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    defaults: { baseURL: "http://localhost", headers: {} },
  },
}));

vi.mock("../jobs/action", () => ({
  fetchJobs: vi.fn(),
  fetchDiagnosticByJobId: vi.fn(),
}));

vi.mock("../serviceCenters/action", () => ({
  getASCById: vi.fn(),
}));

import axiosClient from "api/axios-client/axiosClient";
import { fetchJobs, fetchDiagnosticByJobId } from "../jobs/action";
import { getASCById } from "../serviceCenters/action";
import { Job, JobDiagnostic } from "modules/JobManagement/JobList/JobList.types";
import { ServiceCenter } from "../serviceCenters/serviceCenters.types";

const mockPost = vi.mocked(axiosClient.post);
const mockFetchJobs = vi.mocked(fetchJobs);
const mockFetchDiagnostic = vi.mocked(fetchDiagnosticByJobId);
const mockGetASC = vi.mocked(getASCById);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchApprovals", () => {
  it("returns all jobs as approvals", async () => {
    mockFetchJobs.mockResolvedValueOnce([{ jobId: "J001" }] as any);
    const result = await fetchApprovals();
    expect(result).toEqual([{ jobId: "J001" }]);
    expect(mockFetchDiagnostic).not.toHaveBeenCalled();
    expect(mockGetASC).not.toHaveBeenCalled();
  });

  it("populates ASC phone and diagnostic fields while preserving list data", async () => {
    const jobs = ["J001", "J002"].map(
      (jobId) =>
        ({
          jobId,
          ascId: "ASC001",
          diagnosticInfo: {
            actionType: "NEW_TOOL_EXCHANGE",
            materialCost: 10,
            materialsJobType: ["WARRANTY"],
          },
        }) as Job,
    );
    mockFetchJobs.mockResolvedValueOnce(jobs);
    mockGetASC.mockResolvedValueOnce({ phoneNumber: "ASC-123" } as ServiceCenter);
    mockFetchDiagnostic.mockResolvedValue({
      typeOfUsage: "PROFESSIONAL",
      faultCode: "E001",
      exchangeReason: "NOT_REPAIRABLE",
    } as JobDiagnostic);

    const result = await fetchApprovals();

    expect(mockGetASC).toHaveBeenCalledExactlyOnceWith("ASC001");
    expect(mockFetchDiagnostic).toHaveBeenCalledWith("J001");
    expect(mockFetchDiagnostic).toHaveBeenCalledWith("J002");
    expect(result).toEqual(
      jobs.map((job) => ({
        ...job,
        ascPhoneNumber: "ASC-123",
        diagnosticInfo: {
          ...job.diagnosticInfo,
          typeOfUsage: "PROFESSIONAL",
          faultCode: "E001",
          exchangeReason: "NOT_REPAIRABLE",
        },
      })),
    );
    expect(jobs[0]).not.toHaveProperty("ascPhoneNumber");
    expect(jobs[0].diagnosticInfo).not.toHaveProperty("faultCode");
  });

  it("fetches ASC phone without requesting absent diagnostic details", async () => {
    mockFetchJobs.mockResolvedValueOnce([{ jobId: "J001", ascId: "ASC001" } as Job]);
    mockGetASC.mockResolvedValueOnce({ phoneNumber: "ASC-123" } as ServiceCenter);

    expect(await fetchApprovals()).toEqual([
      { jobId: "J001", ascId: "ASC001", ascPhoneNumber: "ASC-123" },
    ]);
    expect(mockFetchDiagnostic).not.toHaveBeenCalled();
  });

  it("bounds concurrent diagnostic requests and preserves row order across batches", async () => {
    const jobs: Job[] = Array.from({ length: 21 }, (_, index) => ({
      jobId: `J${index}`,
      orderId: `O${index}`,
      ascId: "",
      source: "WALK_IN",
      pickupType: "PICKUP_IN_WORKSHOP",
      customer: { firstName: "Test", lastName: "Customer" },
      createdAt: "2026-10-06T00:00:00Z",
      updatedAt: "2026-10-06T00:00:00Z",
      assigneeName: null,
      jobStatus: "BOSCH_APPROVAL_PENDING",
      attachments: [],
      diagnosticInfo: { materialsJobType: [] },
    }));
    mockFetchJobs.mockResolvedValueOnce(jobs);
    let activeRequests = 0;
    let maximumActiveRequests = 0;
    const fetchDiagnostic = async (jobId: string): Promise<JobDiagnostic> => {
      activeRequests += 1;
      maximumActiveRequests = Math.max(maximumActiveRequests, activeRequests);
      await Promise.resolve();
      activeRequests -= 1;
      return { faultCode: jobId } as JobDiagnostic;
    };
    jobs.forEach(() => mockFetchDiagnostic.mockImplementationOnce(fetchDiagnostic));

    const result = await fetchApprovals();

    expect(maximumActiveRequests).toBe(10);
    expect(mockFetchDiagnostic).toHaveBeenCalledTimes(21);
    expect(result.map((job) => job.diagnosticInfo?.faultCode)).toEqual(
      jobs.map((job) => job.jobId),
    );
  });

  it.each(["ASC", "diagnostic", "both"] as const)(
    "preserves all rows and successful enrichment when %s lookup fails",
    async (failedLookup) => {
      const jobs = ["J001", "J002"].map(
        (jobId) =>
          ({
            jobId,
            ascId: `ASC-${jobId}`,
            diagnosticInfo: {
              actionType: "REPAIR",
              materialCost: 10,
              materialsJobType: ["WARRANTY"],
            },
          }) as Job,
      );
      const diagnostic = { typeOfUsage: "PROFESSIONAL", faultCode: "E001" } as JobDiagnostic;
      mockFetchJobs.mockResolvedValueOnce(jobs);
      if (failedLookup === "ASC" || failedLookup === "both") {
        mockGetASC.mockRejectedValueOnce(new Error("ASC detail failed"));
      } else {
        mockGetASC.mockResolvedValueOnce({ phoneNumber: "ASC-123" } as ServiceCenter);
      }
      if (failedLookup === "diagnostic" || failedLookup === "both") {
        mockFetchDiagnostic.mockRejectedValueOnce(new Error("diagnostic detail failed"));
      } else {
        mockFetchDiagnostic.mockResolvedValueOnce(diagnostic);
      }
      mockGetASC.mockResolvedValueOnce({ phoneNumber: "ASC-456" } as ServiceCenter);
      mockFetchDiagnostic.mockResolvedValueOnce(diagnostic);

      const result = await fetchApprovals();

      expect(result.map((job) => job.jobId)).toEqual(["J001", "J002"]);
      expect(result[0].ascPhoneNumber).toBe(failedLookup === "diagnostic" ? "ASC-123" : undefined);
      expect(result[0].diagnosticInfo).toEqual(
        failedLookup === "ASC"
          ? { ...jobs[0].diagnosticInfo, ...diagnostic, exchangeReason: undefined }
          : jobs[0].diagnosticInfo,
      );
      expect(result[1]).toEqual({
        ...jobs[1],
        ascPhoneNumber: "ASC-456",
        diagnosticInfo: { ...jobs[1].diagnosticInfo, ...diagnostic, exchangeReason: undefined },
      });
    },
  );

  it("throws when fetchJobs fails", async () => {
    mockFetchJobs.mockRejectedValueOnce(new Error("fetch failed"));
    await expect(fetchApprovals()).rejects.toThrow("fetch failed");
  });
});

describe("saveApprovalListColumns", () => {
  it("posts selected column keys to approval preferences endpoint", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await saveApprovalListColumns([
      { key: "jobId", isChecked: true, isFixed: true, order: 0 },
      { key: "toolModelName", isChecked: false, isFixed: false, order: 4 },
      { key: "faultCode", isChecked: true, isFixed: false, order: 11 },
    ]);

    expect(mockPost).toHaveBeenCalledWith("/v1/profile/preferences/approval", [
      "jobId",
      "faultCode",
    ]);
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("save failed"));
    await expect(saveApprovalListColumns([])).rejects.toThrow("save failed");
  });
});

describe("updateApprovalStatus", () => {
  it("posts approval update", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await updateApprovalStatus({
      jobId: "J001",
      materialIds: ["M1"],
      approvalStatus: "APPROVED",
      message: "OK",
    });
    expect(mockPost).toHaveBeenCalledWith("/v1/jobs/J001/flow/bosch-approval", {
      materialIds: ["M1"],
      approvalStatus: "APPROVED",
      message: "OK",
    });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("update failed"));
    await expect(
      updateApprovalStatus({
        jobId: "J001",
        materialIds: [],
        approvalStatus: "REJECTED",
        message: "",
      }),
    ).rejects.toThrow("update failed");
  });
});

describe("approveJobs", () => {
  it("posts job ids for bulk approval", async () => {
    mockPost.mockResolvedValueOnce(undefined);
    await approveJobs(["J001", "J002"]);
    expect(mockPost).toHaveBeenCalledWith("/v1/jobs/flow/bosch-approval/approve", {
      jobIds: ["J001", "J002"],
    });
  });

  it("throws on error", async () => {
    mockPost.mockRejectedValueOnce(new Error("approve failed"));
    await expect(approveJobs(["J001"])).rejects.toThrow("approve failed");
  });
});
