/** `environment` parameter. */
export enum AnalyticsEnvironment {
  LOCAL = "LOCAL",
  DEV = "DEV",
  QA = "QA",
  STAGE = "STAGE",
  PROD = "PROD",
}
export const ANALYTICS_ENVIRONMENTS: readonly AnalyticsEnvironment[] = Object.freeze(
  Object.values(AnalyticsEnvironment),
);

/** `event` name pushed to the dataLayer. One per business event + the SPA pageview. */
export enum AnalyticsEventName {
  VIRTUAL_PAGE_VIEW = "virtual_page_view",
  JOB_CREATED = "job_created",
  JOB_SAVED_AS_DRAFT = "job_saved_as_draft",
  DIAGNOSTIC_VALIDATED = "diagnostic_validated",
  JOB_SUBMITTED_FOR_REVIEW = "job_submitted_for_review",
  JOB_APPROVED_FOR_REPAIR = "job_approved_for_repair",
  REPAIR_STARTED = "repair_started",
  REPAIR_FINISHED = "repair_finished",
  JOB_COMPLETED = "job_completed",
  CLAIM_REVIEWED = "claim_reviewed",
  PRE_APPROVAL_REQUESTED = "pre_approval_requested",
  PRE_APPROVAL_REVIEWED = "pre_approval_reviewed",
  NOTE_ADDED = "note_added",
  HELP_CENTER_CLICKED = "help_center_clicked",
  LIST_INTERACTION = "list_interaction",
  LIST_EXPORTED = "list_exported",
  ACTION_FAILED = "action_failed",
}

export const FAILED_ACTIONS = Object.freeze([
  AnalyticsEventName.JOB_CREATED,
  AnalyticsEventName.JOB_SAVED_AS_DRAFT,
  AnalyticsEventName.DIAGNOSTIC_VALIDATED,
  AnalyticsEventName.JOB_SUBMITTED_FOR_REVIEW,
  AnalyticsEventName.JOB_APPROVED_FOR_REPAIR,
  AnalyticsEventName.PRE_APPROVAL_REQUESTED,
  AnalyticsEventName.REPAIR_STARTED,
  AnalyticsEventName.REPAIR_FINISHED,
  AnalyticsEventName.JOB_COMPLETED,
  AnalyticsEventName.NOTE_ADDED,
  AnalyticsEventName.CLAIM_REVIEWED,
  AnalyticsEventName.PRE_APPROVAL_REVIEWED,
  AnalyticsEventName.LIST_EXPORTED,
] as const);
export type FailedAction = (typeof FAILED_ACTIONS)[number];

export enum FailureReason {
  WRONG_ENTRY = "wrong_entry",
  NO_PERMISSION = "no_permission",
  SYSTEM_PROBLEM = "system_problem",
}
export const FAILURE_REASONS: readonly FailureReason[] = Object.freeze(
  Object.values(FailureReason),
);

export enum ListInteractionType {
  SEARCH = "search",
  FILTER_APPLIED = "filter_applied",
  FILTER_CLEARED = "filter_cleared",
  PAGE_CHANGED = "page_changed",
  PAGE_SIZE_CHANGED = "page_size_changed",
  COLUMNS_CHANGED = "columns_changed",
  ROWS_SELECTED = "rows_selected",
  ROW_OPENED = "row_opened",
}
export const LIST_INTERACTION_TYPES: readonly ListInteractionType[] = Object.freeze(
  Object.values(ListInteractionType),
);

/** `user_role` parameter (mapped from the app's role strings). */
export enum UserRole {
  ASC_TECHNICIAN = "asc_technician",
  ASC_RECEPTIONIST = "asc_receptionist",
  ASC_MANAGER = "asc_manager",
  COUNTRY_MANAGER = "country_manager",
  UNKNOWN = "unknown",
}
export const USER_ROLES: readonly UserRole[] = Object.freeze(Object.values(UserRole));

/** `job_type` parameter. */
export enum JobType {
  WARRANTY = "warranty",
  CHARGEABLE = "chargeable",
  COMMERCIAL_GOODWILL = "commercial_goodwill",
}
export const JOB_TYPES: readonly JobType[] = Object.freeze(Object.values(JobType));

/** `job_status` parameter — aligned 1:1 (lowercased) with the app's order statuses. */
export enum JobStatus {
  DRAFT = "draft",
  WAITING_FOR_TOOL = "waiting_for_tool",
  READY_FOR_DIAGNOSTIC = "ready_for_diagnostic",
  IN_DIAGNOSTICS = "in_diagnostics",
  WAITING_FOR_APPROVAL = "waiting_for_approval",
  BOSCH_APPROVAL_PENDING = "bosch_approval_pending",
  CUSTOMER_APPROVAL_PENDING = "customer_approval_pending",
  MULTIPLE_APPROVAL_PENDING = "multiple_approval_pending",
  READY_FOR_REPAIR = "ready_for_repair",
  IN_REPAIR = "in_repair",
  REPAIR_DONE = "repair_done",
  DELIVERED = "delivered",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  ON_HOLD = "on_hold",
}
export const JOB_STATUSES: readonly JobStatus[] = Object.freeze(Object.values(JobStatus));

/** `claim_status` parameter. */
export enum ClaimStatus {
  CREATED = "created",
  SUBMITTED = "submitted",
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  REVISED = "revised",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}
export const CLAIM_STATUSES: readonly ClaimStatus[] = Object.freeze(Object.values(ClaimStatus));

/** `claim_action` parameter — only on `claim_reviewed`. */
export enum ClaimAction {
  APPROVED = "approved",
  REJECTED = "rejected",
  REVISED = "revised",
}
export const CLAIM_ACTIONS: readonly ClaimAction[] = Object.freeze(Object.values(ClaimAction));

/** `pre_approval_action` parameter — only on `pre_approval_reviewed`. */
export enum PreApprovalAction {
  APPROVED = "approved",
  REJECTED = "rejected",
  REVISED = "revised",
}
export const PRE_APPROVAL_ACTIONS: readonly PreApprovalAction[] = Object.freeze(
  Object.values(PreApprovalAction),
);

/** `completion_type` parameter — only on `job_completed`. */
export enum CompletionType {
  DELIVERED = "delivered",
  NO_REPAIR_RETURN_WITH_ASSEMBLY = "no_repair_return_with_assembly",
  NO_REPAIR_RETURN_WITHOUT_ASSEMBLY = "no_repair_return_without_assembly",
  SCRAP_DISPOSAL = "scrap_disposal",
  EXCHANGE = "exchange",
}
export const COMPLETION_TYPES: readonly CompletionType[] = Object.freeze(
  Object.values(CompletionType),
);

/** `note_context` parameter — selects whether job_status or claim_status applies. */
export enum NoteContext {
  JOB = "job",
  CLAIM = "claim",
}
export const NOTE_CONTEXTS: readonly NoteContext[] = Object.freeze(Object.values(NoteContext));

/** `virtual_url` values — functional screen paths (never technical routes or ids). */
export enum VirtualUrl {
  DASHBOARD = "/dashboard",
  JOB_LIST = "/job-list",
  CREATE_JOB = "/create-job",
  EDIT_JOB = "/edit-job",
  JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA = "/job-overview/customer-payment-data",
  JOB_OVERVIEW_ASSET_DATA = "/job-overview/asset-data",
  JOB_OVERVIEW_DOCUMENTS = "/job-overview/documents",
  JOB_OVERVIEW_DIAGNOSTIC_DATA = "/job-overview/diagnostic-data",
  JOB_OVERVIEW_NOTES = "/job-overview/notes",
  CLAIM_LIST = "/claim-list",
  CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA = "/claim-overview/customer-payment-data",
  CLAIM_OVERVIEW_ASSET_DATA = "/claim-overview/asset-data",
  CLAIM_OVERVIEW_DOCUMENTS = "/claim-overview/documents",
  CLAIM_OVERVIEW_DIAGNOSTIC_DATA = "/claim-overview/diagnostic-data",
  CLAIM_OVERVIEW_CLAIMS = "/claim-overview/claims",
  CLAIM_OVERVIEW_NOTES = "/claim-overview/notes",
  PRE_APPROVAL_LIST = "/pre-approval-list",
  CLIENTS = "/clients",
  CLIENT_OVERVIEW_CLIENT_INFO = "/client-overview/client-info",
  CLIENT_OVERVIEW_ORDERS = "/client-overview/orders",
  CLIENT_OVERVIEW_JOBS = "/client-overview/jobs",
  CLIENT_OVERVIEW_ASSETS = "/client-overview/assets",
  REPORTS = "/reports",
  BIQIC_REPORT = "/biqic-report",
  REIMBURSEMENT_ASC_LIST = "/reimbursement/asc-list",
  REIMBURSEMENT_LIST = "/reimbursement/reimbursement-list",
  ASC_REIMBURSEMENTS = "/reimbursement/asc-reimbursements",
  MY_REIMBURSEMENTS = "/reimbursement/my-reimbursements",
  CREATE_REIMBURSEMENT = "/reimbursement/create",
  REIMBURSEMENT_CLAIMS = "/reimbursement/claims",
  EMPLOYEES = "/employees",
  ADD_EMPLOYEE = "/employees/add",
  EMPLOYEE_OVERVIEW = "/employees/overview",
  ASC_PROFILES = "/asc-profiles",
  ADD_ASC = "/asc-profiles/add",
  EDIT_ASC = "/asc-profiles/edit",
  ASC_OVERVIEW_GENERAL_INFO = "/asc-profiles/overview/general-info",
  ASC_OVERVIEW_BANKING = "/asc-profiles/overview/banking",
  ASC_OVERVIEW_NOTIFICATIONS = "/asc-profiles/overview/notifications",
  ASC_OVERVIEW_PRICING = "/asc-profiles/overview/pricing",
  ASC_OVERVIEW_BOSCH_INTERNAL_CONFIGURATION = "/asc-profiles/overview/bosch-internal-configuration",
  ASC_OVERVIEW_REIMBURSEMENT = "/asc-profiles/overview/reimbursement",
  ASC_PROFILE_GENERAL_INFO = "/asc-profile/general-info",
  ASC_PROFILE_BANKING = "/asc-profile/banking",
  ASC_PROFILE_NOTIFICATIONS = "/asc-profile/notifications",
  ASC_PROFILE_PRICING = "/asc-profile/pricing",
  ASC_PROFILE_BOSCH_INTERNAL_CONFIGURATION = "/asc-profile/bosch-internal-configuration",
  ASC_PROFILE_REIMBURSEMENT = "/asc-profile/reimbursement",
  SYSTEM_CONFIGURATION = "/system-configuration",
  USER_MANAGEMENT = "/user-management",
  PAGE_NOT_FOUND = "/page-not-found",
}

/** `page_name` parameter for pageviews + help events. */
export enum PageName {
  DASHBOARD = "Dashboard",
  JOB_LIST = "Job List",
  CREATE_JOB = "Create Job",
  EDIT_JOB = "Edit Draft Job",
  JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA = "Job Overview - Customer & Payment Data",
  JOB_OVERVIEW_ASSET_DATA = "Job Overview - Asset Data",
  JOB_OVERVIEW_DOCUMENTS = "Job Overview - Documents",
  JOB_OVERVIEW_DIAGNOSTIC_DATA = "Job Overview - Diagnostic Data",
  JOB_OVERVIEW_NOTES = "Job Overview - Notes",
  CLAIM_LIST = "Claim List",
  CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA = "Claim Overview - Customer & Payment Data",
  CLAIM_OVERVIEW_ASSET_DATA = "Claim Overview - Asset Data",
  CLAIM_OVERVIEW_DOCUMENTS = "Claim Overview - Documents",
  CLAIM_OVERVIEW_DIAGNOSTIC_DATA = "Claim Overview - Diagnostic Data",
  CLAIM_OVERVIEW_CLAIMS = "Claim Overview - Claims",
  CLAIM_OVERVIEW_NOTES = "Claim Overview - Notes",
  PRE_APPROVAL_LIST = "Pre-approval List",
  CLIENTS = "Clients",
  CLIENT_OVERVIEW_CLIENT_INFO = "Client Overview - Client Info",
  CLIENT_OVERVIEW_ORDERS = "Client Overview - Orders",
  CLIENT_OVERVIEW_JOBS = "Client Overview - Jobs",
  CLIENT_OVERVIEW_ASSETS = "Client Overview - Assets",
  REPORTS = "Reports",
  BIQIC_REPORT = "BIQIC Report",
  REIMBURSEMENT_ASC_LIST = "Reimbursement - ASC List",
  REIMBURSEMENT_LIST = "Reimbursement - Reimbursement List",
  ASC_REIMBURSEMENTS = "ASC Reimbursements",
  MY_REIMBURSEMENTS = "My Reimbursements",
  CREATE_REIMBURSEMENT = "Create Reimbursement",
  REIMBURSEMENT_CLAIMS = "Reimbursement Claims",
  EMPLOYEES = "Employees",
  ADD_EMPLOYEE = "Add Employee",
  EMPLOYEE_OVERVIEW = "Employee Overview",
  ASC_PROFILES = "ASC Profiles",
  ADD_ASC = "Add ASC",
  EDIT_ASC = "Edit ASC",
  ASC_OVERVIEW_GENERAL_INFO = "ASC Overview - General Info",
  ASC_OVERVIEW_BANKING = "ASC Overview - Banking",
  ASC_OVERVIEW_NOTIFICATIONS = "ASC Overview - Notifications",
  ASC_OVERVIEW_PRICING = "ASC Overview - Pricing",
  ASC_OVERVIEW_BOSCH_INTERNAL_CONFIGURATION = "ASC Overview - Bosch Internal Configuration",
  ASC_OVERVIEW_REIMBURSEMENT = "ASC Overview - Reimbursement",
  ASC_PROFILE_GENERAL_INFO = "ASC Profile - General Info",
  ASC_PROFILE_BANKING = "ASC Profile - Banking",
  ASC_PROFILE_NOTIFICATIONS = "ASC Profile - Notifications",
  ASC_PROFILE_PRICING = "ASC Profile - Pricing",
  ASC_PROFILE_BOSCH_INTERNAL_CONFIGURATION = "ASC Profile - Bosch Internal Configuration",
  ASC_PROFILE_REIMBURSEMENT = "ASC Profile - Reimbursement",
  SYSTEM_CONFIGURATION = "System Configuration",
  USER_MANAGEMENT = "User Management",
  PAGE_NOT_FOUND = "Page Not Found",
}

/** `module_name` parameter for pageviews + help events. */
export enum ModuleName {
  DASHBOARD = "Dashboard",
  JOB_MANAGEMENT = "Job Management",
  JOB_MANAGEMENT_JOB_CREATION = "Job Management / Job Creation",
  JOB_MANAGEMENT_DRAFT_JOB = "Job Management / Draft Job",
  JOB_OVERVIEW = "Job Overview",
  JOB_OVERVIEW_DIAGNOSTIC = "Job Overview / Diagnostic",
  JOB_OVERVIEW_NOTES = "Job Overview / Notes",
  CLAIM_MANAGEMENT = "Claim Management",
  CLAIM_MANAGEMENT_PRE_APPROVAL = "Claim Management / Pre-approval",
  CLAIM_OVERVIEW = "Claim Overview",
  CLAIM_OVERVIEW_DIAGNOSTIC = "Claim Overview / Diagnostic",
  CLAIM_OVERVIEW_CLAIMS = "Claim Overview / Claims",
  CLAIM_OVERVIEW_NOTES = "Claim Overview / Notes",
  CLIENTS = "Clients",
  CLIENTS_CLIENT_OVERVIEW = "Clients / Client Overview",
  REPORTS = "Reports",
  REPORTS_BIQIC = "Reports / BIQIC",
  REIMBURSEMENT = "Reimbursement",
  REIMBURSEMENT_CREATION = "Reimbursement / Reimbursement Creation",
  REIMBURSEMENT_CLAIMS = "Reimbursement / Claims",
  ACCOUNT_MANAGEMENT_EMPLOYEES = "Account Management / Employees",
  ACCOUNT_MANAGEMENT_ASC = "Account Management / ASC",
  SYSTEM_CONFIGURATION = "System Configuration",
  USER_MANAGEMENT = "User Management",
  ERROR = "Error",
}
