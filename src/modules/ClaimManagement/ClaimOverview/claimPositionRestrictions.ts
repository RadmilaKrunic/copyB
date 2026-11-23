/**
 * TEMPORARY business restriction (PTBASS-0000): positions an ASC may not add as a new
 * claim spare-part row while the claim has a given status.
 *
 * REVISED claims must not get new freight (FR) or packaging (PC) cost positions until
 * the business confirms whether that use case exists. To lift the restriction, delete
 * the REVISED entry (or this whole map); nothing else depends on its contents.
 *
 * Blocked positions stay in the position dropdown but are disabled. Existing rows on
 * such positions (e.g. an FR row coming from the job) stay visible and keep their value,
 * but their quantity can't be edited.
 */
const POSITIONS_NOT_ADDABLE_BY_CLAIM_STATUS: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ["REVISED", new Set(["FR", "PC"])],
]);

const NO_BLOCKED_POSITIONS: ReadonlySet<string> = new Set();

/** Positions that cannot be chosen for a new claim row in the given claim status. */
export const getBlockedClaimPositions = (claimStatus: string | undefined): ReadonlySet<string> => {
  const blocked = POSITIONS_NOT_ADDABLE_BY_CLAIM_STATUS.get(claimStatus ?? "");
  return blocked ?? NO_BLOCKED_POSITIONS;
};
