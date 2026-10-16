import Field from "components/generics/Field/GenericField.types";

const ACTIVE_ROW_PREFIX_PATTERN = /^claims_claimSpareParts#(\d+)_/;

const parseRowNameIndex = (name: string): number | null => {
  const match = ACTIVE_ROW_PREFIX_PATTERN.exec(name);
  return match ? Number.parseInt(match[1], 10) : null;
};

/**
 * Position of a claim spare-parts row in `materials[]`.
 *
 * The `#N` in a row's field names is not its position: deleting a row keeps the
 * remaining names, and a new row gets the next free index. So after deleting
 * row #1 of #0..#2 and adding one, the rows are #0, #2, #3 while materials has
 * 3 items. The position is the rank of `#N` among the active rows; the name
 * index is used only when the row is not in `allFields` yet.
 */
export const getClaimRowMaterialIndex = (areaNamePrefix: string, allFields: Field[]): number => {
  const nameIndex = parseRowNameIndex(areaNamePrefix);
  if (nameIndex === null) return 0;

  const activeIndices = new Set<number>();
  allFields.forEach((f) => {
    const index = parseRowNameIndex(f.name);
    if (index !== null) activeIndices.add(index);
  });
  if (!activeIndices.has(nameIndex)) return nameIndex;

  return [...activeIndices].sort((a, b) => a - b).indexOf(nameIndex);
};
