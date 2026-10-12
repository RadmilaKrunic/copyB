import type {
  AnalyticsEnvironment,
  AscSection,
  DashboardLink,
  DocumentAction,
  DocumentType,
  EmployeeAction,
  LogoutSource,
  ReportType,
  SaveType,
  ClaimAction,
  ClaimStatus,
  CompletionType,
  CustomerAnswer,
  CustomerSelection,
  FailedAction,
  FailureReason,
  HoldAction,
  JobSection,
  JobStatus,
  JobType,
  ListInteractionType,
  MaterialSource,
  MaterialType,
  ModuleName,
  NoteContext,
  PageName,
  PreApprovalAction,
  UserRole,
  VirtualUrl,
  WarrantyResult,
} from "./enums";
import { AnalyticsEventName } from "./enums";

export enum AnalyticsParameterKey {
  EVENT = "event",
  ENVIRONMENT = "environment",
  LANGUAGE = "language",
  VIRTUAL_URL = "virtual_url",
  PAGE_NAME = "page_name",
  MODULE_NAME = "module_name",
  LOCAL_TIME_HOUR = "local_time_hour",
  LOCAL_DAY_OF_WEEK = "local_day_of_week",
  USER_ROLE = "user_role",
  COUNTRY_CODE = "country_code",
  ASC_ID = "asc_id",
  JOB_STATUS = "job_status",
  CLAIM_STATUS = "claim_status",
  JOB_TYPE = "job_type",
  CLAIM_ACTION = "claim_action",
  PRE_APPROVAL_ACTION = "pre_approval_action",
  COMPLETION_TYPE = "completion_type",
  NOTE_CONTEXT = "note_context",
  JOB_CREATION_DURATION_SECONDS = "job_creation_duration_seconds",
  CLAIM_REVIEW_DURATION_SECONDS = "claim_review_duration_seconds",
  PRE_APPROVAL_REVIEW_DURATION_SECONDS = "pre_approval_review_duration_seconds",
  INTERACTION_TYPE = "interaction_type",
  FILTER_NAME = "filter_name",
  RESULT_COUNT = "result_count",
  SELECTED_ROW_COUNT = "selected_row_count",
  EXPORTED_ROW_COUNT = "exported_row_count",
  FAILED_ACTION = "failed_action",
  FAILURE_REASON = "failure_reason",
  HOLD_ACTION = "hold_action",
  CUSTOMER_ANSWER = "customer_answer",
  JOB_SECTION = "job_section",
  MATERIAL_TYPE = "material_type",
  MATERIAL_SOURCE = "material_source",
  WARRANTY_RESULT = "warranty_result",
  CUSTOMER_SELECTION = "customer_selection",
  DOCUMENT_ACTION = "document_action",
  DOCUMENT_TYPE = "document_type",
  REPORT_TYPE = "report_type",
  SAVE_TYPE = "save_type",
  EMPLOYEE_ACTION = "employee_action",
  ASC_SECTION = "asc_section",
  LOGOUT_SOURCE = "logout_source",
  DASHBOARD_LINK = "dashboard_link",
}

/** Primitive value types allowed in a push. `undefined` is stripped before pushing. */
export type DataLayerValue = string | number | boolean | null;

/** A partial, immutable bag of parameters. Merged into a {@link DataLayerEvent}. */
export type AnalyticsParameterBag = Readonly<
  Partial<Record<AnalyticsParameterKey, DataLayerValue>>
>;

/** A fully-assembled object ready to push; always carries a discriminating `event`. */
export type DataLayerEvent = AnalyticsParameterBag & { readonly event: AnalyticsEventName };

/** One entry in `window.dataLayer` — our pushes or GTM's own bookkeeping records. */
export type DataLayerEntry = DataLayerEvent | Readonly<Record<string, unknown>>;

export interface AnalyticsContextSnapshot {
  readonly environment: AnalyticsEnvironment;
  readonly language: string;
  readonly userRole: UserRole;
  readonly countryCode?: string;
  readonly ascId?: string;
  readonly virtualUrl?: VirtualUrl | string;
  readonly pageName?: PageName | string;
  readonly moduleName?: ModuleName | string;
}

export interface VirtualPageDefinition {
  readonly reference: string;
  readonly virtualUrl: VirtualUrl;
  readonly pageName: PageName;
  readonly moduleName: ModuleName;
}

export interface JobEventPayload {
  readonly jobType: JobType;
  readonly jobStatus: JobStatus;
}

export interface JobCreatedPayload {
  readonly jobStatus: JobStatus;
  readonly jobType?: JobType;
  readonly jobCreationDurationSeconds?: number;
}

export interface JobSavedAsDraftPayload {
  readonly jobStatus: JobStatus;
  readonly jobType?: JobType;
}

export type DiagnosticValidatedPayload = JobEventPayload;
export type JobSubmittedForReviewPayload = JobEventPayload;
export type JobApprovedForRepairPayload = JobEventPayload;
export type RepairStartedPayload = JobEventPayload;
export type RepairFinishedPayload = JobEventPayload;

export interface JobCompletedPayload extends JobEventPayload {
  readonly completionType?: CompletionType;
}

export interface ClaimReviewedPayload {
  readonly claimStatus: ClaimStatus;
  readonly claimAction: ClaimAction;
  readonly jobType?: JobType;
  readonly claimReviewDurationSeconds?: number;
}

export type PreApprovalRequestedPayload = JobEventPayload;

export interface PreApprovalReviewedPayload {
  readonly jobStatus: JobStatus;
  readonly preApprovalAction: PreApprovalAction;
  readonly jobType?: JobType;
  readonly preApprovalReviewDurationSeconds?: number;
}

interface JobNoteAddedPayload {
  readonly noteContext: NoteContext.JOB;
  readonly jobStatus?: JobStatus;
  readonly jobType?: JobType;
}

interface ClaimNoteAddedPayload {
  readonly noteContext: NoteContext.CLAIM;
  readonly claimStatus?: ClaimStatus;
}

export type NoteAddedPayload = JobNoteAddedPayload | ClaimNoteAddedPayload;

export interface HelpCenterClickedPayload {
  readonly jobStatus?: JobStatus;
  readonly claimStatus?: ClaimStatus;
  readonly jobType?: JobType;
}

export interface VirtualPageViewPayload {
  readonly jobStatus?: JobStatus;
  readonly claimStatus?: ClaimStatus;
}

export interface ListInteractionPayload {
  readonly interactionType: ListInteractionType;
  /** Filter key only. Filter values can hold a customer name or serial number. */
  readonly filterName?: string;
  readonly resultCount?: number;
  readonly selectedRowCount?: number;
}

export interface ListExportedPayload {
  readonly exportedRowCount?: number;
}

export interface JobContextPayload {
  readonly jobType?: JobType;
  readonly jobStatus?: JobStatus;
}

export interface JobHoldChangedPayload extends JobContextPayload {
  readonly holdAction: HoldAction;
}

export interface CustomerAnswerRecordedPayload extends JobContextPayload {
  readonly customerAnswer: CustomerAnswer;
}

export interface JobSectionSavedPayload extends JobContextPayload {
  readonly jobSection: JobSection;
}

export interface MaterialAddedPayload extends JobContextPayload {
  readonly materialType: MaterialType;
  readonly materialSource: MaterialSource;
}

export interface WarrantyCheckPerformedPayload {
  readonly warrantyResult: WarrantyResult;
}

export interface CustomerSelectedPayload {
  readonly customerSelection: CustomerSelection;
}

export interface ClaimContextPayload {
  readonly claimStatus?: ClaimStatus;
  readonly jobType?: JobType;
}

export type NoPayload = Readonly<Record<never, never>>;

export interface DocumentActionPayload {
  readonly documentAction: DocumentAction;
  readonly documentType: DocumentType;
}

export interface ReportGeneratedPayload {
  readonly reportType: ReportType;
}

export interface EmployeeSavedPayload {
  readonly saveType: SaveType;
}

export interface EmployeeStatusChangedPayload {
  readonly employeeAction: EmployeeAction;
}

export interface AscSavedPayload {
  readonly saveType: SaveType;
  readonly ascSection?: AscSection;
}

export interface UserLoggedOutPayload {
  readonly logoutSource: LogoutSource;
}

export interface DashboardLinkClickedPayload {
  readonly dashboardLink: DashboardLink;
}

export interface ActionFailedPayload {
  readonly failedAction: FailedAction;
  readonly failureReason: FailureReason;
  readonly jobType?: JobType;
  readonly jobStatus?: JobStatus;
  readonly claimStatus?: ClaimStatus;
  readonly holdAction?: HoldAction;
  readonly customerAnswer?: CustomerAnswer;
  readonly jobSection?: JobSection;
  readonly documentAction?: DocumentAction;
  readonly documentType?: DocumentType;
  readonly saveType?: SaveType;
  readonly employeeAction?: EmployeeAction;
  readonly ascSection?: AscSection;
}

export type AnalyticsEvent =
  | { readonly name: AnalyticsEventName.JOB_CREATED; readonly payload: JobCreatedPayload }
  | {
      readonly name: AnalyticsEventName.JOB_SAVED_AS_DRAFT;
      readonly payload: JobSavedAsDraftPayload;
    }
  | {
      readonly name: AnalyticsEventName.DIAGNOSTIC_VALIDATED;
      readonly payload: DiagnosticValidatedPayload;
    }
  | {
      readonly name: AnalyticsEventName.JOB_SUBMITTED_FOR_REVIEW;
      readonly payload: JobSubmittedForReviewPayload;
    }
  | {
      readonly name: AnalyticsEventName.JOB_APPROVED_FOR_REPAIR;
      readonly payload: JobApprovedForRepairPayload;
    }
  | { readonly name: AnalyticsEventName.REPAIR_STARTED; readonly payload: RepairStartedPayload }
  | { readonly name: AnalyticsEventName.REPAIR_FINISHED; readonly payload: RepairFinishedPayload }
  | { readonly name: AnalyticsEventName.JOB_COMPLETED; readonly payload: JobCompletedPayload }
  | { readonly name: AnalyticsEventName.CLAIM_REVIEWED; readonly payload: ClaimReviewedPayload }
  | {
      readonly name: AnalyticsEventName.PRE_APPROVAL_REQUESTED;
      readonly payload: PreApprovalRequestedPayload;
    }
  | {
      readonly name: AnalyticsEventName.PRE_APPROVAL_REVIEWED;
      readonly payload: PreApprovalReviewedPayload;
    }
  | { readonly name: AnalyticsEventName.NOTE_ADDED; readonly payload: NoteAddedPayload }
  | {
      readonly name: AnalyticsEventName.HELP_CENTER_CLICKED;
      readonly payload: HelpCenterClickedPayload;
    }
  | {
      readonly name: AnalyticsEventName.VIRTUAL_PAGE_VIEW;
      readonly payload: VirtualPageViewPayload;
    }
  | { readonly name: AnalyticsEventName.LIST_INTERACTION; readonly payload: ListInteractionPayload }
  | { readonly name: AnalyticsEventName.LIST_EXPORTED; readonly payload: ListExportedPayload }
  | { readonly name: AnalyticsEventName.ACTION_FAILED; readonly payload: ActionFailedPayload }
  | { readonly name: AnalyticsEventName.DIAGNOSTIC_STARTED; readonly payload: JobContextPayload }
  | { readonly name: AnalyticsEventName.JOB_HOLD_CHANGED; readonly payload: JobHoldChangedPayload }
  | { readonly name: AnalyticsEventName.COST_ESTIMATE_CREATED; readonly payload: JobContextPayload }
  | {
      readonly name: AnalyticsEventName.CUSTOMER_ANSWER_RECORDED;
      readonly payload: CustomerAnswerRecordedPayload;
    }
  | {
      readonly name: AnalyticsEventName.JOB_SECTION_SAVED;
      readonly payload: JobSectionSavedPayload;
    }
  | { readonly name: AnalyticsEventName.TECHNICIAN_ASSIGNED; readonly payload: JobContextPayload }
  | { readonly name: AnalyticsEventName.MATERIAL_ADDED; readonly payload: MaterialAddedPayload }
  | { readonly name: AnalyticsEventName.PRICES_RECALCULATED; readonly payload: JobContextPayload }
  | {
      readonly name: AnalyticsEventName.WARRANTY_CHECK_PERFORMED;
      readonly payload: WarrantyCheckPerformedPayload;
    }
  | {
      readonly name: AnalyticsEventName.CUSTOMER_SELECTED;
      readonly payload: CustomerSelectedPayload;
    }
  | {
      readonly name: AnalyticsEventName.CLAIM_PRICES_UPDATED;
      readonly payload: ClaimContextPayload;
    }
  | {
      readonly name: AnalyticsEventName.CLAIM_APPROVAL_REQUESTED;
      readonly payload: ClaimContextPayload;
    }
  | { readonly name: AnalyticsEventName.DOCUMENT_ACTION; readonly payload: DocumentActionPayload }
  | { readonly name: AnalyticsEventName.REPORT_GENERATED; readonly payload: ReportGeneratedPayload }
  | { readonly name: AnalyticsEventName.REIMBURSEMENT_CREATED; readonly payload: NoPayload }
  | { readonly name: AnalyticsEventName.EMPLOYEE_SAVED; readonly payload: EmployeeSavedPayload }
  | {
      readonly name: AnalyticsEventName.EMPLOYEE_STATUS_CHANGED;
      readonly payload: EmployeeStatusChangedPayload;
    }
  | { readonly name: AnalyticsEventName.ASC_SAVED; readonly payload: AscSavedPayload }
  | { readonly name: AnalyticsEventName.ASC_DEACTIVATED; readonly payload: NoPayload }
  | { readonly name: AnalyticsEventName.CLIENT_ARCHIVED; readonly payload: NoPayload }
  | { readonly name: AnalyticsEventName.SESSION_STARTED; readonly payload: NoPayload }
  | { readonly name: AnalyticsEventName.LANGUAGE_CHANGED; readonly payload: NoPayload }
  | { readonly name: AnalyticsEventName.USER_LOGGED_OUT; readonly payload: UserLoggedOutPayload }
  | { readonly name: AnalyticsEventName.CONSENT_ACCEPTED; readonly payload: NoPayload }
  | {
      readonly name: AnalyticsEventName.DASHBOARD_LINK_CLICKED;
      readonly payload: DashboardLinkClickedPayload;
    };
