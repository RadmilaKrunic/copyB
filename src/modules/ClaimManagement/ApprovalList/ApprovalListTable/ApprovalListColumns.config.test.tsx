import { describe, it, expect, vi } from "vitest";
import React from "react";
import { Job } from "modules/JobManagement/JobList/JobList.types";

vi.mock("components/ui/StatusIndicator/StatusIndicator", () => ({
  default: ({ status }: { status: string }) => React.createElement("span", null, status),
}));
vi.mock("@bosch/react-frok", () => ({
  Icon: ({ iconName }: { iconName: string }) => React.createElement("span", null, iconName),
}));

import { getApprovalColumns } from "./ApprovalListColumns.config";

const t = (key: string) => key;
const columns = getApprovalColumns(t);

const mockJob: Job = {
  jobId: "J001",
  orderId: "O001",
  ascId: "ASC001",
  attachments: [],
  jobStatus: "WAITING_FOR_APPROVAL",
  createdAt: "2023-01-15T10:00:00Z",
  updatedAt: "2023-02-20T12:00:00Z",
  assigneeName: "Tech1",
  customer: {
    customerType: "INDIVIDUAL_PRIVATE",
    firstName: "John",
    lastName: "Doe",
    companyName: "",
  },
  customerWish: "Repair",
  pickupType: "STORE",
  paymentType: "CASH",
  source: "WALK_IN",
  asset: {
    toolModelName: "Drill X",
    serialNumber: "SN123",
    bareToolNumber: "BT001",
  },
};

describe("getApprovalColumns", () => {
  it("uses ASC phone, not customer phone", () => {
    const job = { ...mockJob, ascPhoneNumber: "ASC-123" };
    expect(columns.ascPhoneNumber.getValue(job)).toBe("ASC-123");
    expect(columns.ascPhoneNumber.getValue(mockJob)).toBe("-");
  });

  it("uses job internal reference and asset product number", () => {
    expect(
      columns.internalReferenceNumber.getValue({ ...mockJob, internalReferenceNumber: "REF-1" }),
    ).toBe("REF-1");
    expect(columns.bareToolNumber.getValue(mockJob)).toBe("BT001");
    expect(columns.customerType.getValue(mockJob)).toBe("INDIVIDUAL_PRIVATE");
    expect(columns.assetCategory.getValue({ ...mockJob, asset: { category: "DRILL" } })).toBe(
      "DRILL",
    );
  });

  it("renders diagnostic values and hides exchange reason for repair", () => {
    const diagnosticInfo = {
      actionType: "NEW_TOOL_EXCHANGE",
      typeOfUsage: "PROFESSIONAL",
      faultCode: "E001",
      exchangeReason: "NOT_REPAIRABLE",
      materialsJobType: [],
    };
    const job = { ...mockJob, diagnosticInfo };
    expect(columns.typeOfUsage.getValue(job)).toBe("PROFESSIONAL");
    expect(columns.faultCode.getValue(job)).toBe("E001");
    expect(columns.exchangeReason.getValue(job)).toBe("NOT_REPAIRABLE");
    expect(
      columns.exchangeReason.getValue({
        ...job,
        diagnosticInfo: { ...diagnosticInfo, actionType: "REPAIR" },
      }),
    ).toBe("-");
  });

  it("renders missing optional data as '-'", () => {
    expect(columns.internalReferenceNumber.getValue(mockJob)).toBe("-");
    expect(columns.typeOfUsage.getValue(mockJob)).toBe("-");
    expect(columns.faultCode.getValue(mockJob)).toBe("-");
    expect(columns.exchangeReason.getValue(mockJob)).toBe("-");
    expect(columns.assetCategory.getValue(mockJob)).toBe("-");
  });

  it("returns jobId", () => {
    expect(columns.jobId.getValue(mockJob)).toBe("J001");
  });

  it("returns formatted createdAt", () => {
    expect(typeof columns.createdAt.getValue(mockJob)).toBe("string");
  });

  it("returns assignee name", () => {
    expect(columns.assignee.getValue(mockJob)).toBe("Tech1");
  });

  it("returns un-assigned label when assigneeName is un-assigned", () => {
    expect(
      columns.assignee.getValue({ ...(mockJob as object), assigneeName: "un-assigned" } as never),
    ).toBe("unassigned");
  });

  it("returns '-' when no customer", () => {
    expect(columns.customer.getValue({ ...(mockJob as object), customer: null } as never)).toBe(
      "-",
    );
  });

  it("renders customer with icon when customer exists", () => {
    const node = columns.customer.getValue(mockJob);
    expect(node).toBeTruthy();
  });

  it("renders jobStatus as StatusIndicator", () => {
    const node = columns.jobStatus.getValue(mockJob);
    expect(node).toBeTruthy();
  });

  it("returns customerWish translated", () => {
    expect(columns.customerWish.getValue(mockJob)).toBe("Repair");
  });

  it("returns '-' when customerWish is empty", () => {
    expect(
      columns.customerWish.getValue({ ...(mockJob as object), customerWish: "" } as never),
    ).toBe("-");
  });
});
