import {
  ANALYTICS_ENVIRONMENTS,
  ASC_SECTIONS,
  DASHBOARD_LINKS,
  DOCUMENT_ACTIONS,
  DOCUMENT_TYPES,
  EMPLOYEE_ACTIONS,
  LOGOUT_SOURCES,
  REPORT_TYPES,
  SAVE_TYPES,
  AnalyticsEventName,
  CLAIM_ACTIONS,
  CLAIM_STATUSES,
  COMPLETION_TYPES,
  CUSTOMER_ANSWERS,
  CUSTOMER_SELECTIONS,
  FAILED_ACTIONS,
  FAILURE_REASONS,
  HOLD_ACTIONS,
  JOB_SECTIONS,
  JOB_STATUSES,
  JOB_TYPES,
  LIST_INTERACTION_TYPES,
  MATERIAL_SOURCES,
  MATERIAL_TYPES,
  NOTE_CONTEXTS,
  PRE_APPROVAL_ACTIONS,
  USER_ROLES,
  WARRANTY_RESULTS,
} from "../domain/enums";
import { AnalyticsParameterKey, type DataLayerEvent, type DataLayerValue } from "../domain/types";
import { EVENT_REGISTRY } from "../config/registries";

export interface ValidationResult {
  /** `true` when the event satisfies its registry contract. */
  readonly valid: boolean;
  /** Human-readable problems; empty when valid. */
  readonly issues: readonly string[];
}

type ParameterConstraint =
  | { readonly kind: "enum"; readonly values: readonly string[] }
  | { readonly kind: "number" }
  | { readonly kind: "string" };

/** Per-parameter value constraints; unlisted parameters default to non-empty string. */
const PARAMETER_CONSTRAINTS: Readonly<Partial<Record<AnalyticsParameterKey, ParameterConstraint>>> =
  Object.freeze({
    [AnalyticsParameterKey.ENVIRONMENT]: { kind: "enum", values: ANALYTICS_ENVIRONMENTS },
    [AnalyticsParameterKey.USER_ROLE]: { kind: "enum", values: USER_ROLES },
    [AnalyticsParameterKey.JOB_STATUS]: { kind: "enum", values: JOB_STATUSES },
    [AnalyticsParameterKey.CLAIM_STATUS]: { kind: "enum", values: CLAIM_STATUSES },
    [AnalyticsParameterKey.JOB_TYPE]: { kind: "enum", values: JOB_TYPES },
    [AnalyticsParameterKey.CLAIM_ACTION]: { kind: "enum", values: CLAIM_ACTIONS },
    [AnalyticsParameterKey.PRE_APPROVAL_ACTION]: { kind: "enum", values: PRE_APPROVAL_ACTIONS },
    [AnalyticsParameterKey.COMPLETION_TYPE]: { kind: "enum", values: COMPLETION_TYPES },
    [AnalyticsParameterKey.NOTE_CONTEXT]: { kind: "enum", values: NOTE_CONTEXTS },
    [AnalyticsParameterKey.INTERACTION_TYPE]: {
      kind: "enum",
      values: LIST_INTERACTION_TYPES,
    },
    [AnalyticsParameterKey.FAILED_ACTION]: { kind: "enum", values: FAILED_ACTIONS },
    [AnalyticsParameterKey.FAILURE_REASON]: { kind: "enum", values: FAILURE_REASONS },
    [AnalyticsParameterKey.HOLD_ACTION]: { kind: "enum", values: HOLD_ACTIONS },
    [AnalyticsParameterKey.CUSTOMER_ANSWER]: { kind: "enum", values: CUSTOMER_ANSWERS },
    [AnalyticsParameterKey.JOB_SECTION]: { kind: "enum", values: JOB_SECTIONS },
    [AnalyticsParameterKey.MATERIAL_TYPE]: { kind: "enum", values: MATERIAL_TYPES },
    [AnalyticsParameterKey.MATERIAL_SOURCE]: { kind: "enum", values: MATERIAL_SOURCES },
    [AnalyticsParameterKey.WARRANTY_RESULT]: { kind: "enum", values: WARRANTY_RESULTS },
    [AnalyticsParameterKey.CUSTOMER_SELECTION]: { kind: "enum", values: CUSTOMER_SELECTIONS },
    [AnalyticsParameterKey.DOCUMENT_ACTION]: { kind: "enum", values: DOCUMENT_ACTIONS },
    [AnalyticsParameterKey.DOCUMENT_TYPE]: { kind: "enum", values: DOCUMENT_TYPES },
    [AnalyticsParameterKey.REPORT_TYPE]: { kind: "enum", values: REPORT_TYPES },
    [AnalyticsParameterKey.SAVE_TYPE]: { kind: "enum", values: SAVE_TYPES },
    [AnalyticsParameterKey.EMPLOYEE_ACTION]: { kind: "enum", values: EMPLOYEE_ACTIONS },
    [AnalyticsParameterKey.ASC_SECTION]: { kind: "enum", values: ASC_SECTIONS },
    [AnalyticsParameterKey.LOGOUT_SOURCE]: { kind: "enum", values: LOGOUT_SOURCES },
    [AnalyticsParameterKey.DASHBOARD_LINK]: { kind: "enum", values: DASHBOARD_LINKS },
    [AnalyticsParameterKey.RESULT_COUNT]: { kind: "number" },
    [AnalyticsParameterKey.SELECTED_ROW_COUNT]: { kind: "number" },
    [AnalyticsParameterKey.EXPORTED_ROW_COUNT]: { kind: "number" },
    [AnalyticsParameterKey.JOB_CREATION_DURATION_SECONDS]: { kind: "number" },
    [AnalyticsParameterKey.CLAIM_REVIEW_DURATION_SECONDS]: { kind: "number" },
    [AnalyticsParameterKey.PRE_APPROVAL_REVIEW_DURATION_SECONDS]: { kind: "number" },
  });

const KNOWN_EVENT_NAMES: ReadonlySet<string> = new Set(Object.values(AnalyticsEventName));
const EVENT_KEY: string = AnalyticsParameterKey.EVENT;

/**
 * Dev/QA contract guard: checks a {@link DataLayerEvent} against the registry's required
 * parameters and per-parameter value constraints. Pure and never throws; skipped entirely
 * in PROD (see {@link AnalyticsTracker}).
 */
export class AnalyticsEventValidator {
  validate(event: DataLayerEvent): ValidationResult {
    const eventName = event.event;
    if (!KNOWN_EVENT_NAMES.has(eventName)) {
      return { valid: false, issues: [`Unknown event name "${String(eventName)}".`] };
    }

    const issues: string[] = [];
    const missing = new Set<string>();
    for (const key of EVENT_REGISTRY[eventName].requiredParameters) {
      if (!isPresent(event[key])) {
        missing.add(key);
        issues.push(`Missing required parameter "${key}".`);
      }
    }

    for (const [key, value] of Object.entries(event)) {
      if (key === EVENT_KEY || value === undefined || value === null) continue;
      if (missing.has(key)) continue; // already reported above
      collectValueIssue(key as AnalyticsParameterKey, value, issues);
    }

    return { valid: issues.length === 0, issues };
  }
}

const isPresent = (value: DataLayerValue | undefined): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

const collectValueIssue = (
  key: AnalyticsParameterKey,
  value: DataLayerValue,
  issues: string[],
): void => {
  const constraint = PARAMETER_CONSTRAINTS[key];

  if (constraint?.kind === "number") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      issues.push(`Parameter "${key}" must be a finite number.`);
    }
    return;
  }
  if (constraint?.kind === "enum") {
    if (typeof value !== "string" || !constraint.values.includes(value)) {
      issues.push(
        `Parameter "${key}" has invalid value "${String(value)}". Allowed: ${constraint.values.join(", ")}.`,
      );
    }
    return;
  }
  if (typeof value !== "string") {
    issues.push(`Parameter "${key}" must be a string.`);
  } else if (value.trim().length === 0) {
    issues.push(`Parameter "${key}" must not be empty.`);
  }
};
