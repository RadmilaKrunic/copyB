import { describe, it, expect } from "vitest";
import {
  resolveUserRole,
  toClaimAction,
  toClaimStatus,
  toFailureReason,
  toJobStatus,
  toJobType,
  toPreApprovalAction,
} from "./mappers";
import {
  ClaimAction,
  ClaimStatus,
  FailureReason,
  JobStatus,
  JobType,
  PreApprovalAction,
  UserRole,
} from "../domain/enums";

describe("workflow value mappers", () => {
  it("normalises app UPPERCASE statuses/types to the analytics contract", () => {
    expect(toJobStatus("READY_FOR_DIAGNOSTIC")).toBe(JobStatus.READY_FOR_DIAGNOSTIC);
    expect(toJobStatus("IN_REPAIR")).toBe(JobStatus.IN_REPAIR);
    expect(toClaimStatus("PENDING")).toBe(ClaimStatus.PENDING);
    expect(toJobType("WARRANTY")).toBe(JobType.WARRANTY);
    expect(toJobType("COMMERCIAL_GOODWILL")).toBe(JobType.COMMERCIAL_GOODWILL);
  });

  it("returns undefined for unknown/blank values (so the param is omitted)", () => {
    expect(toJobStatus("NOT_A_STATUS")).toBeUndefined();
    expect(toJobStatus("")).toBeUndefined();
    expect(toJobStatus(null)).toBeUndefined();
    expect(toClaimStatus(undefined)).toBeUndefined();
    expect(toJobType("SERVICE_GOODWILL")).toBeUndefined();
  });

  it("normalises claim / pre-approval decisions to action enums", () => {
    expect(toClaimAction("APPROVED")).toBe(ClaimAction.APPROVED);
    expect(toClaimAction("Revised")).toBe(ClaimAction.REVISED);
    expect(toClaimAction("unknown")).toBeUndefined();
    expect(toPreApprovalAction("REJECTED")).toBe(PreApprovalAction.REJECTED);
    expect(toPreApprovalAction(null)).toBeUndefined();
  });
});

describe("toFailureReason", () => {
  const httpError = (status: number) => ({ response: { status, data: { detail: "secret" } } });

  it("maps rejected input to wrong_entry", () => {
    for (const status of [400, 409, 422]) {
      expect(toFailureReason(httpError(status))).toBe(FailureReason.WRONG_ENTRY);
    }
  });

  it("maps missing rights to no_permission", () => {
    for (const status of [401, 403]) {
      expect(toFailureReason(httpError(status))).toBe(FailureReason.NO_PERMISSION);
    }
  });

  it("maps server errors and other statuses to system_problem", () => {
    for (const status of [404, 429, 500, 502, 503]) {
      expect(toFailureReason(httpError(status))).toBe(FailureReason.SYSTEM_PROBLEM);
    }
  });

  it("maps network errors, timeouts and non-HTTP errors to system_problem", () => {
    expect(toFailureReason({ code: "ERR_NETWORK", message: "Network Error" })).toBe(
      FailureReason.SYSTEM_PROBLEM,
    );
    expect(toFailureReason({ code: "ECONNABORTED", response: undefined })).toBe(
      FailureReason.SYSTEM_PROBLEM,
    );
    expect(toFailureReason(new Error("boom"))).toBe(FailureReason.SYSTEM_PROBLEM);
    expect(toFailureReason(null)).toBe(FailureReason.SYSTEM_PROBLEM);
    expect(toFailureReason(undefined)).toBe(FailureReason.SYSTEM_PROBLEM);
  });
});

describe("resolveUserRole", () => {
  it("maps ASC roles, with manager taking precedence over technician", () => {
    expect(resolveUserRole({ roles: ["ASC_TECHNICIAN"] })).toBe(UserRole.ASC_TECHNICIAN);
    expect(resolveUserRole({ roles: ["ASC_MANAGER"] })).toBe(UserRole.ASC_MANAGER);
    expect(resolveUserRole({ roles: ["ASC_MANAGER_WITHOUT_CLAIM"] })).toBe(UserRole.ASC_MANAGER);
    expect(resolveUserRole({ roles: ["ASC_TECHNICIAN", "ASC_MANAGER"] })).toBe(
      UserRole.ASC_MANAGER,
    );
  });

  it("maps the receptionist role instead of reporting it as unknown", () => {
    expect(resolveUserRole({ roles: ["ASC_RECEPTIONIST"] })).toBe(UserRole.ASC_RECEPTIONIST);
  });

  it("picks the same role regardless of the order the roles arrive in", () => {
    expect(resolveUserRole({ roles: ["ASC_RECEPTIONIST", "ASC_TECHNICIAN"] })).toBe(
      UserRole.ASC_TECHNICIAN,
    );
    expect(resolveUserRole({ roles: ["ASC_TECHNICIAN", "ASC_RECEPTIONIST"] })).toBe(
      UserRole.ASC_TECHNICIAN,
    );
    expect(resolveUserRole({ roles: ["ASC_MANAGER", "ASC_RECEPTIONIST"] })).toBe(
      UserRole.ASC_MANAGER,
    );
  });

  it("detects a country manager via claim/approval permissions", () => {
    expect(resolveUserRole({ permissions: ["AC_A"] })).toBe(UserRole.COUNTRY_MANAGER);
    expect(resolveUserRole({ roles: [], permissions: ["A_WA"] })).toBe(UserRole.COUNTRY_MANAGER);
  });

  it("returns UNKNOWN when nothing matches", () => {
    expect(resolveUserRole({})).toBe(UserRole.UNKNOWN);
    expect(resolveUserRole({ roles: ["SOME_UNMAPPED_ROLE"] })).toBe(UserRole.UNKNOWN);
  });

  it("normalises casing/whitespace and tolerates malformed role entries", () => {
    expect(resolveUserRole({ roles: ["  asc_manager  "] })).toBe(UserRole.ASC_MANAGER);
    expect(resolveUserRole({ roles: [undefined as unknown as string, "ASC_TECHNICIAN"] })).toBe(
      UserRole.ASC_TECHNICIAN,
    );
  });
});
