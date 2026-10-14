export const API_TIMEOUTS = {
  DEFAULT: 30_000,
  /** Uploads, exports and reports. */
  LONG: 120_000,
  /** Long-running server jobs, e.g. reimbursement generation. */
  EXTENDED: 300_000,
} as const;
