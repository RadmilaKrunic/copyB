import {
  ApprovalColumnKey,
  ApprovalColumnConfiguration,
  getApprovalColumns,
} from "./ApprovalListTable/ApprovalListColumns.config";
import { saveApprovalListColumns } from "api/services/approvals/action";
import { Column } from "components/ui/List/List.types";
import { Job } from "modules/JobManagement/JobList/JobList.types";

export type { ApprovalColumnConfiguration } from "./ApprovalListTable/ApprovalListColumns.config";

export const MAX_CUSTOM_COLUMNS = 4;
const COLUMN_STORAGE_KEY = "approvalList-visibleColumns";

export const DEFAULT_COLUMN_CONFIGURATION: ApprovalColumnConfiguration[] = [
  { key: "jobId", isFixed: true, isChecked: true, order: 0 },
  { key: "createdAt", isFixed: true, isChecked: true, order: 1 },
  { key: "ascName", isFixed: true, isChecked: true, order: 2 },
  { key: "actionType", isFixed: true, isChecked: true, order: 3 },
  { key: "toolModelName", isFixed: false, isChecked: false, order: 4 },
  { key: "materialCost", isFixed: false, isChecked: false, order: 5 },
  { key: "jobStatus", isFixed: false, isChecked: false, order: 6 },
  { key: "ascPhoneNumber", isFixed: false, isChecked: false, order: 7 },
  { key: "internalReferenceNumber", isFixed: false, isChecked: false, order: 8 },
  { key: "bareToolNumber", isFixed: false, isChecked: false, order: 9 },
  { key: "typeOfUsage", isFixed: false, isChecked: false, order: 10 },
  { key: "faultCode", isFixed: false, isChecked: false, order: 11 },
  { key: "exchangeReason", isFixed: false, isChecked: false, order: 12 },
  { key: "customerType", isFixed: false, isChecked: false, order: 13 },
  { key: "assetCategory", isFixed: false, isChecked: false, order: 14 },
];

const COLUMN_DISPLAY_ORDER = DEFAULT_COLUMN_CONFIGURATION.map((col) => col.key);

export function getVisibleColumns(config: ApprovalColumnConfiguration[]): ApprovalColumnKey[] {
  const visibleKeys = new Set(config.filter((col) => col.isChecked).map((col) => col.key));

  return COLUMN_DISPLAY_ORDER.filter((key) => visibleKeys.has(key));
}

export function getSelectedCustomColumnsCount(config: ApprovalColumnConfiguration[]): number {
  return config.filter((col) => col.isChecked && !col.isFixed).length;
}

export function isColumnDisabled(
  columnKey: ApprovalColumnKey,
  config: ApprovalColumnConfiguration[],
): boolean {
  const column = config.find((col) => col.key === columnKey);
  if (!column) return false;

  if (column.isFixed) {
    return true;
  }

  if (column.isChecked) {
    return false;
  }

  const selectedCustomCount = getSelectedCustomColumnsCount(config);
  return selectedCustomCount >= MAX_CUSTOM_COLUMNS;
}

export function getDefaultFixedColumns(): ApprovalColumnConfiguration[] {
  return DEFAULT_COLUMN_CONFIGURATION.map((col) => ({
    ...col,
    isChecked: col.isFixed,
  }));
}

export function getInitialApprovalColumnConfig(
  savedConfig?: Array<{ key?: string; isChecked?: boolean }>,
): ApprovalColumnConfiguration[] {
  let savedColumnsByKey = new Map(savedConfig?.map((col) => [col.key, col]) ?? []);
  try {
    const storedKeys: unknown = JSON.parse(sessionStorage.getItem(COLUMN_STORAGE_KEY) ?? "null");
    if (Array.isArray(storedKeys) && storedKeys.every((key) => typeof key === "string")) {
      savedColumnsByKey = new Map(
        DEFAULT_COLUMN_CONFIGURATION.map((col) => [
          col.key,
          { key: col.key, isChecked: storedKeys.includes(col.key) },
        ]),
      );
    }
  } catch {
    sessionStorage.removeItem(COLUMN_STORAGE_KEY);
  }

  return DEFAULT_COLUMN_CONFIGURATION.map((defaultColumn) => {
    const savedColumn = savedColumnsByKey.get(defaultColumn.key);
    const isSavedChecked = savedColumn ? (savedColumn.isChecked ?? true) : defaultColumn.isChecked;

    return {
      ...defaultColumn,
      isChecked: defaultColumn.isFixed || isSavedChecked,
    };
  });
}

export async function saveVisibleColumns(config: ApprovalColumnConfiguration[]): Promise<void> {
  await saveApprovalListColumns(config);
  sessionStorage.setItem(
    COLUMN_STORAGE_KEY,
    JSON.stringify(config.filter((col) => col.isChecked).map((col) => col.key)),
  );
}

export function getApprovalListColumns(t: (key: string) => string): Column<Job>[] {
  const columnsConfig = getApprovalColumns(t);
  return COLUMN_DISPLAY_ORDER.map((key) => {
    const col = columnsConfig[key];
    return {
      key: col.key,
      label: col.label,
      render: col.getValue,
    };
  });
}
