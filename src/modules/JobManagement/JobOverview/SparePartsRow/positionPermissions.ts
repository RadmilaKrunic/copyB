import { PERMISSIONS } from "utils/Permissions";

/**
 * Per-position permissions for spare-part rows. Shared by job diagnostics and claim rows
 * so both apply the same editability rules.
 */
export const POSITION_PERMISSIONS = {
  LA: {
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_LABOUR_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_LABOUR_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_LABOUR_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_LABOUR_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_LABOUR,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_LABOUR,
  },
  FR: {
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_FREIGHT_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FREIGHT_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_FREIGHT_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_FREIGHT_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_FREIGHT,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_FREIGHT,
  },
  PN: {
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_FULL_TOOLS_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_FULL_TOOLS_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_FULL_TOOLS_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_FULL_TOOLS_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_FULL_TOOLS,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_FULL_TOOLS,
  },
  SP: {
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_SPARE_PARTS_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_SPARE_PARTS_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_SPARE_PARTS_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_SPARE_PARTS,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_SPARE_PARTS,
  },
  PC: {
    canView: PERMISSIONS.DIAGNOSTICS.CAN_VIEW_SPARE_PARTS_ITEMS,
    canDelete: PERMISSIONS.DIAGNOSTICS.CAN_INSERT_AND_DELETE_SPARE_PARTS_ITEMS,
    canEditUnits: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_SPARE_PARTS_UNITS,
    canEditUnitPrice: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_SPARE_PARTS_UNIT_PRICE,
    canEditDiscount: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_DISCOUNT_ON_SPARE_PARTS,
    canEditTotal: PERMISSIONS.DIAGNOSTICS.CAN_EDIT_TOTAL_ON_SPARE_PARTS,
  },
} as const;

/** Permission needed to edit a row's quantity; null = no position-specific rule (editable). */
export const getQuantityEditPermission = (position: string): string | null =>
  POSITION_PERMISSIONS[position as keyof typeof POSITION_PERMISSIONS]?.canEditUnits ?? null;

/**
 * Rows the country config adds automatically (matched rule's `automaticRows`) get their
 * quantity from the backend / config, so the user cannot edit it.
 */
export const isAutomaticRowPosition = (
  position: string,
  automaticRows: readonly string[] | undefined,
): boolean => {
  const normalized = (position ?? "").toUpperCase();
  if (!normalized) return false;
  return (automaticRows ?? []).some((row) => row.toUpperCase() === normalized);
};
