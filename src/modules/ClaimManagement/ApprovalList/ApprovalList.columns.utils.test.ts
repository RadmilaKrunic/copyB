import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getVisibleColumns,
  getSelectedCustomColumnsCount,
  isColumnDisabled,
  getDefaultFixedColumns,
  getInitialApprovalColumnConfig,
  DEFAULT_COLUMN_CONFIGURATION,
  MAX_CUSTOM_COLUMNS,
  saveVisibleColumns,
} from "./ApprovalList.columns.utils";
import type { ApprovalColumnConfiguration } from "./ApprovalList.columns.utils";
import { saveApprovalListColumns } from "api/services/approvals/action";

vi.mock("api/services/approvals/action", () => ({
  saveApprovalListColumns: vi.fn().mockResolvedValue(undefined),
}));

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

const makeConfig = (
  overrides: Partial<ApprovalColumnConfiguration>[],
): ApprovalColumnConfiguration[] =>
  overrides.map((o) => ({
    key: "jobId",
    isFixed: false,
    isChecked: false,
    order: 0,
    ...o,
  })) as ApprovalColumnConfiguration[];

describe("getVisibleColumns", () => {
  it("returns only checked columns in display order", () => {
    const config = makeConfig([
      { key: "jobId", isFixed: true, isChecked: true, order: 0 },
      { key: "ascName", isFixed: true, isChecked: true, order: 1 },
      { key: "customer", isFixed: false, isChecked: true, order: 2 },
      { key: "assignee", isFixed: false, isChecked: false, order: 3 },
    ]);
    const result = getVisibleColumns(config);
    expect(result).toContain("jobId");
    expect(result).toContain("ascName");
    expect(result).not.toContain("customer");
    expect(result).not.toContain("assignee");
  });

  it("returns empty array when no columns checked", () => {
    const config = makeConfig([{ key: "jobId", isChecked: false }]);
    expect(getVisibleColumns(config)).toHaveLength(0);
  });
});

describe("getSelectedCustomColumnsCount", () => {
  it("counts checked non-fixed columns", () => {
    const config = makeConfig([
      { key: "jobId", isFixed: true, isChecked: true },
      { key: "customer", isFixed: false, isChecked: true },
      { key: "assignee", isFixed: false, isChecked: false },
    ]);
    expect(getSelectedCustomColumnsCount(config)).toBe(1);
  });
});

describe("isColumnDisabled", () => {
  it("returns true for fixed columns", () => {
    const config = makeConfig([{ key: "jobId", isFixed: true, isChecked: true }]);
    expect(isColumnDisabled("jobId" as any, config)).toBe(true);
  });

  it("returns false for unchecked column below max", () => {
    const config = makeConfig([
      { key: "customer", isFixed: false, isChecked: false },
      { key: "assignee", isFixed: false, isChecked: true },
    ]);
    expect(isColumnDisabled("customer" as any, config)).toBe(false);
  });

  it("returns true for unchecked column at MAX_CUSTOM_COLUMNS", () => {
    const custom = Array.from({ length: MAX_CUSTOM_COLUMNS }, (_, i) => ({
      key: `col${i}` as any,
      isFixed: false,
      isChecked: true,
      order: i,
    }));
    const config = makeConfig([
      ...custom,
      { key: "customer", isFixed: false, isChecked: false, order: MAX_CUSTOM_COLUMNS },
    ]);
    expect(isColumnDisabled("customer" as any, config)).toBe(true);
  });
});

describe("getDefaultFixedColumns", () => {
  it("has same length as DEFAULT_COLUMN_CONFIGURATION", () => {
    expect(getDefaultFixedColumns()).toHaveLength(DEFAULT_COLUMN_CONFIGURATION.length);
  });

  it("sets isChecked to isFixed for each column", () => {
    getDefaultFixedColumns().forEach((col) => {
      expect(col.isChecked).toBe(col.isFixed);
    });
  });
});

describe("getInitialApprovalColumnConfig", () => {
  it("restores Approval-only selections after save without forcing unchecked options", async () => {
    const config = getDefaultFixedColumns().map((col) => ({
      ...col,
      isChecked: col.isFixed || col.key === "materialCost" || col.key === "ascPhoneNumber",
    }));
    await saveVisibleColumns(config);

    expect(getInitialApprovalColumnConfig([{ key: "bareToolNumber", isChecked: true }])).toEqual(
      config,
    );
    expect(saveApprovalListColumns).toHaveBeenCalledWith(config);
  });

  it("does not store failed saves", async () => {
    vi.mocked(saveApprovalListColumns).mockRejectedValueOnce(new Error("save failed"));
    await expect(saveVisibleColumns(getDefaultFixedColumns())).rejects.toThrow("save failed");
    expect(sessionStorage.getItem("approvalList-visibleColumns")).toBeNull();
  });

  it("falls back to server preferences for corrupt session data", () => {
    sessionStorage.setItem("approvalList-visibleColumns", "invalid json");
    expect(
      getInitialApprovalColumnConfig([{ key: "bareToolNumber", isChecked: true }]).find(
        (col) => col.key === "bareToolNumber",
      )?.isChecked,
    ).toBe(true);
  });

  it("preserves saved custom selections for approval columns", () => {
    const config = getInitialApprovalColumnConfig([
      { key: "bareToolNumber", isChecked: true },
      { key: "materialCost", isChecked: false },
    ]);

    expect(config.find((col) => col.key === "bareToolNumber")?.isChecked).toBe(true);
    expect(config.find((col) => col.key === "materialCost")?.isChecked).toBe(false);
  });

  it("keeps approval fixed columns checked when missing from saved config", () => {
    const config = getInitialApprovalColumnConfig([{ key: "customer", isChecked: true }]);

    expect(config.find((col) => col.key === "ascName")?.isChecked).toBe(true);
    expect(config.find((col) => col.key === "actionType")?.isChecked).toBe(true);
    expect(config.filter((col) => col.isFixed).map((col) => col.key)).toEqual([
      "jobId",
      "createdAt",
      "ascName",
      "actionType",
    ]);
  });

  it("offers every requested optional column in display order", () => {
    const config = DEFAULT_COLUMN_CONFIGURATION.map((col) => ({ ...col, isChecked: true }));
    expect(getVisibleColumns(config)).toEqual([
      "jobId",
      "createdAt",
      "ascName",
      "actionType",
      "toolModelName",
      "materialCost",
      "jobStatus",
      "ascPhoneNumber",
      "internalReferenceNumber",
      "bareToolNumber",
      "typeOfUsage",
      "faultCode",
      "exchangeReason",
      "customerType",
      "assetCategory",
    ]);
    expect(
      DEFAULT_COLUMN_CONFIGURATION.filter((col) => !col.isFixed).every((col) => !col.isChecked),
    ).toBe(true);
  });
});
