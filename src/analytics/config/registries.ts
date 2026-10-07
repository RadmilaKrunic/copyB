import { AnalyticsEventName, ModuleName, PageName, VirtualUrl } from "../domain/enums";
import { AnalyticsParameterKey as P, type VirtualPageDefinition } from "../domain/types";

export interface EventDefinition {
  readonly name: AnalyticsEventName;
  readonly requiredParameters: readonly P[];
  readonly optionalParameters: readonly P[];
  readonly requiresPageDescriptor: boolean;
}

const COMMON_REQUIRED: readonly P[] = Object.freeze([
  P.ENVIRONMENT,
  P.LANGUAGE,
  P.VIRTUAL_URL,
  P.USER_ROLE,
  P.LOCAL_TIME_HOUR,
  P.LOCAL_DAY_OF_WEEK,
]);
const COMMON_OPTIONAL: readonly P[] = Object.freeze([P.COUNTRY_CODE, P.ASC_ID]);
const JOB_WORKFLOW_REQUIRED: readonly P[] = Object.freeze([
  ...COMMON_REQUIRED,
  P.JOB_STATUS,
  P.JOB_TYPE,
]);

const define = (
  name: AnalyticsEventName,
  requiredParameters: readonly P[],
  optionalParameters: readonly P[],
  requiresPageDescriptor = false,
): EventDefinition =>
  Object.freeze({ name, requiredParameters, optionalParameters, requiresPageDescriptor });

export const EVENT_REGISTRY: Readonly<Record<AnalyticsEventName, EventDefinition>> = Object.freeze({
  [AnalyticsEventName.VIRTUAL_PAGE_VIEW]: define(
    AnalyticsEventName.VIRTUAL_PAGE_VIEW,
    [...COMMON_REQUIRED, P.PAGE_NAME, P.MODULE_NAME],
    [...COMMON_OPTIONAL, P.JOB_STATUS, P.CLAIM_STATUS],
    true,
  ),
  [AnalyticsEventName.JOB_CREATED]: define(
    AnalyticsEventName.JOB_CREATED,
    [...COMMON_REQUIRED, P.JOB_STATUS],
    [...COMMON_OPTIONAL, P.JOB_TYPE, P.JOB_CREATION_DURATION_SECONDS],
  ),
  [AnalyticsEventName.JOB_SAVED_AS_DRAFT]: define(
    AnalyticsEventName.JOB_SAVED_AS_DRAFT,
    [...COMMON_REQUIRED, P.JOB_STATUS],
    [...COMMON_OPTIONAL, P.JOB_TYPE],
  ),
  [AnalyticsEventName.DIAGNOSTIC_VALIDATED]: define(
    AnalyticsEventName.DIAGNOSTIC_VALIDATED,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.JOB_SUBMITTED_FOR_REVIEW]: define(
    AnalyticsEventName.JOB_SUBMITTED_FOR_REVIEW,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.JOB_APPROVED_FOR_REPAIR]: define(
    AnalyticsEventName.JOB_APPROVED_FOR_REPAIR,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.REPAIR_STARTED]: define(
    AnalyticsEventName.REPAIR_STARTED,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.REPAIR_FINISHED]: define(
    AnalyticsEventName.REPAIR_FINISHED,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.JOB_COMPLETED]: define(
    AnalyticsEventName.JOB_COMPLETED,
    JOB_WORKFLOW_REQUIRED,
    [...COMMON_OPTIONAL, P.COMPLETION_TYPE],
  ),
  [AnalyticsEventName.CLAIM_REVIEWED]: define(
    AnalyticsEventName.CLAIM_REVIEWED,
    [...COMMON_REQUIRED, P.CLAIM_STATUS, P.CLAIM_ACTION],
    [...COMMON_OPTIONAL, P.JOB_TYPE, P.CLAIM_REVIEW_DURATION_SECONDS],
  ),
  [AnalyticsEventName.PRE_APPROVAL_REQUESTED]: define(
    AnalyticsEventName.PRE_APPROVAL_REQUESTED,
    JOB_WORKFLOW_REQUIRED,
    COMMON_OPTIONAL,
  ),
  [AnalyticsEventName.PRE_APPROVAL_REVIEWED]: define(
    AnalyticsEventName.PRE_APPROVAL_REVIEWED,
    [...COMMON_REQUIRED, P.JOB_STATUS, P.PRE_APPROVAL_ACTION],
    [...COMMON_OPTIONAL, P.JOB_TYPE, P.PRE_APPROVAL_REVIEW_DURATION_SECONDS],
  ),
  [AnalyticsEventName.NOTE_ADDED]: define(
    AnalyticsEventName.NOTE_ADDED,
    [...COMMON_REQUIRED, P.NOTE_CONTEXT],
    [...COMMON_OPTIONAL, P.JOB_STATUS, P.CLAIM_STATUS, P.JOB_TYPE],
  ),
  [AnalyticsEventName.HELP_CENTER_CLICKED]: define(
    AnalyticsEventName.HELP_CENTER_CLICKED,
    [...COMMON_REQUIRED, P.PAGE_NAME, P.MODULE_NAME],
    [...COMMON_OPTIONAL, P.JOB_STATUS, P.CLAIM_STATUS, P.JOB_TYPE],
    true,
  ),
  // Which list this happened on is the page descriptor: every list has its own virtual page.
  [AnalyticsEventName.LIST_INTERACTION]: define(
    AnalyticsEventName.LIST_INTERACTION,
    [...COMMON_REQUIRED, P.PAGE_NAME, P.MODULE_NAME, P.INTERACTION_TYPE],
    [...COMMON_OPTIONAL, P.FILTER_NAME, P.RESULT_COUNT, P.SELECTED_ROW_COUNT],
    true,
  ),
  [AnalyticsEventName.LIST_EXPORTED]: define(
    AnalyticsEventName.LIST_EXPORTED,
    [...COMMON_REQUIRED, P.PAGE_NAME, P.MODULE_NAME],
    [...COMMON_OPTIONAL, P.EXPORTED_ROW_COUNT],
    true,
  ),
  [AnalyticsEventName.ACTION_FAILED]: define(
    AnalyticsEventName.ACTION_FAILED,
    [...COMMON_REQUIRED, P.FAILED_ACTION, P.FAILURE_REASON],
    [...COMMON_OPTIONAL, P.JOB_TYPE, P.JOB_STATUS, P.CLAIM_STATUS],
  ),
});

export const getAllowedParameters = (name: AnalyticsEventName): readonly P[] => {
  const def = EVENT_REGISTRY[name];
  return [P.EVENT, ...def.requiredParameters, ...def.optionalParameters];
};

export const VIRTUAL_PAGE_REGISTRY: Readonly<Record<VirtualUrl, VirtualPageDefinition>> =
  Object.freeze({
    [VirtualUrl.DASHBOARD]: {
      reference: "VPV_001",
      virtualUrl: VirtualUrl.DASHBOARD,
      pageName: PageName.DASHBOARD,
      moduleName: ModuleName.DASHBOARD,
    },
    [VirtualUrl.JOB_LIST]: {
      reference: "VPV_002",
      virtualUrl: VirtualUrl.JOB_LIST,
      pageName: PageName.JOB_LIST,
      moduleName: ModuleName.JOB_MANAGEMENT,
    },
    [VirtualUrl.CREATE_JOB]: {
      reference: "VPV_003",
      virtualUrl: VirtualUrl.CREATE_JOB,
      pageName: PageName.CREATE_JOB,
      moduleName: ModuleName.JOB_MANAGEMENT_JOB_CREATION,
    },
    [VirtualUrl.EDIT_JOB]: {
      reference: "VPV_004",
      virtualUrl: VirtualUrl.EDIT_JOB,
      pageName: PageName.EDIT_JOB,
      moduleName: ModuleName.JOB_MANAGEMENT_DRAFT_JOB,
    },
    [VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA]: {
      reference: "VPV_005",
      virtualUrl: VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      pageName: PageName.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      moduleName: ModuleName.JOB_OVERVIEW,
    },
    [VirtualUrl.JOB_OVERVIEW_ASSET_DATA]: {
      reference: "VPV_006",
      virtualUrl: VirtualUrl.JOB_OVERVIEW_ASSET_DATA,
      pageName: PageName.JOB_OVERVIEW_ASSET_DATA,
      moduleName: ModuleName.JOB_OVERVIEW,
    },
    [VirtualUrl.JOB_OVERVIEW_DOCUMENTS]: {
      reference: "VPV_007",
      virtualUrl: VirtualUrl.JOB_OVERVIEW_DOCUMENTS,
      pageName: PageName.JOB_OVERVIEW_DOCUMENTS,
      moduleName: ModuleName.JOB_OVERVIEW,
    },
    [VirtualUrl.JOB_OVERVIEW_DIAGNOSTIC_DATA]: {
      reference: "VPV_008",
      virtualUrl: VirtualUrl.JOB_OVERVIEW_DIAGNOSTIC_DATA,
      pageName: PageName.JOB_OVERVIEW_DIAGNOSTIC_DATA,
      moduleName: ModuleName.JOB_OVERVIEW_DIAGNOSTIC,
    },
    [VirtualUrl.JOB_OVERVIEW_NOTES]: {
      reference: "VPV_009",
      virtualUrl: VirtualUrl.JOB_OVERVIEW_NOTES,
      pageName: PageName.JOB_OVERVIEW_NOTES,
      moduleName: ModuleName.JOB_OVERVIEW_NOTES,
    },
    [VirtualUrl.CLAIM_LIST]: {
      reference: "VPV_010",
      virtualUrl: VirtualUrl.CLAIM_LIST,
      pageName: PageName.CLAIM_LIST,
      moduleName: ModuleName.CLAIM_MANAGEMENT,
    },
    [VirtualUrl.CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA]: {
      reference: "VPV_011",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      pageName: PageName.CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      moduleName: ModuleName.CLAIM_OVERVIEW,
    },
    [VirtualUrl.CLAIM_OVERVIEW_ASSET_DATA]: {
      reference: "VPV_012",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_ASSET_DATA,
      pageName: PageName.CLAIM_OVERVIEW_ASSET_DATA,
      moduleName: ModuleName.CLAIM_OVERVIEW,
    },
    [VirtualUrl.CLAIM_OVERVIEW_DOCUMENTS]: {
      reference: "VPV_013",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_DOCUMENTS,
      pageName: PageName.CLAIM_OVERVIEW_DOCUMENTS,
      moduleName: ModuleName.CLAIM_OVERVIEW,
    },
    [VirtualUrl.CLAIM_OVERVIEW_DIAGNOSTIC_DATA]: {
      reference: "VPV_014",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_DIAGNOSTIC_DATA,
      pageName: PageName.CLAIM_OVERVIEW_DIAGNOSTIC_DATA,
      moduleName: ModuleName.CLAIM_OVERVIEW_DIAGNOSTIC,
    },
    [VirtualUrl.CLAIM_OVERVIEW_CLAIMS]: {
      reference: "VPV_015",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_CLAIMS,
      pageName: PageName.CLAIM_OVERVIEW_CLAIMS,
      moduleName: ModuleName.CLAIM_OVERVIEW_CLAIMS,
    },
    [VirtualUrl.CLAIM_OVERVIEW_NOTES]: {
      reference: "VPV_016",
      virtualUrl: VirtualUrl.CLAIM_OVERVIEW_NOTES,
      pageName: PageName.CLAIM_OVERVIEW_NOTES,
      moduleName: ModuleName.CLAIM_OVERVIEW_NOTES,
    },
    [VirtualUrl.PRE_APPROVAL_LIST]: {
      reference: "VPV_017",
      virtualUrl: VirtualUrl.PRE_APPROVAL_LIST,
      pageName: PageName.PRE_APPROVAL_LIST,
      moduleName: ModuleName.CLAIM_MANAGEMENT_PRE_APPROVAL,
    },
    [VirtualUrl.CLIENTS]: {
      reference: "VPV_018",
      virtualUrl: VirtualUrl.CLIENTS,
      pageName: PageName.CLIENTS,
      moduleName: ModuleName.CLIENTS,
    },
    [VirtualUrl.CLIENT_OVERVIEW_CLIENT_INFO]: {
      reference: "VPV_023",
      virtualUrl: VirtualUrl.CLIENT_OVERVIEW_CLIENT_INFO,
      pageName: PageName.CLIENT_OVERVIEW_CLIENT_INFO,
      moduleName: ModuleName.CLIENTS_CLIENT_OVERVIEW,
    },
    [VirtualUrl.CLIENT_OVERVIEW_ORDERS]: {
      reference: "VPV_040",
      virtualUrl: VirtualUrl.CLIENT_OVERVIEW_ORDERS,
      pageName: PageName.CLIENT_OVERVIEW_ORDERS,
      moduleName: ModuleName.CLIENTS_CLIENT_OVERVIEW,
    },
    [VirtualUrl.CLIENT_OVERVIEW_JOBS]: {
      reference: "VPV_041",
      virtualUrl: VirtualUrl.CLIENT_OVERVIEW_JOBS,
      pageName: PageName.CLIENT_OVERVIEW_JOBS,
      moduleName: ModuleName.CLIENTS_CLIENT_OVERVIEW,
    },
    [VirtualUrl.CLIENT_OVERVIEW_ASSETS]: {
      reference: "VPV_042",
      virtualUrl: VirtualUrl.CLIENT_OVERVIEW_ASSETS,
      pageName: PageName.CLIENT_OVERVIEW_ASSETS,
      moduleName: ModuleName.CLIENTS_CLIENT_OVERVIEW,
    },
    [VirtualUrl.REPORTS]: {
      reference: "VPV_019",
      virtualUrl: VirtualUrl.REPORTS,
      pageName: PageName.REPORTS,
      moduleName: ModuleName.REPORTS,
    },
    [VirtualUrl.BIQIC_REPORT]: {
      reference: "VPV_020",
      virtualUrl: VirtualUrl.BIQIC_REPORT,
      pageName: PageName.BIQIC_REPORT,
      moduleName: ModuleName.REPORTS_BIQIC,
    },
    [VirtualUrl.REIMBURSEMENT_ASC_LIST]: {
      reference: "VPV_024",
      virtualUrl: VirtualUrl.REIMBURSEMENT_ASC_LIST,
      pageName: PageName.REIMBURSEMENT_ASC_LIST,
      moduleName: ModuleName.REIMBURSEMENT,
    },
    [VirtualUrl.REIMBURSEMENT_LIST]: {
      reference: "VPV_025",
      virtualUrl: VirtualUrl.REIMBURSEMENT_LIST,
      pageName: PageName.REIMBURSEMENT_LIST,
      moduleName: ModuleName.REIMBURSEMENT,
    },
    [VirtualUrl.ASC_REIMBURSEMENTS]: {
      reference: "VPV_026",
      virtualUrl: VirtualUrl.ASC_REIMBURSEMENTS,
      pageName: PageName.ASC_REIMBURSEMENTS,
      moduleName: ModuleName.REIMBURSEMENT,
    },
    [VirtualUrl.MY_REIMBURSEMENTS]: {
      reference: "VPV_027",
      virtualUrl: VirtualUrl.MY_REIMBURSEMENTS,
      pageName: PageName.MY_REIMBURSEMENTS,
      moduleName: ModuleName.REIMBURSEMENT,
    },
    [VirtualUrl.CREATE_REIMBURSEMENT]: {
      reference: "VPV_028",
      virtualUrl: VirtualUrl.CREATE_REIMBURSEMENT,
      pageName: PageName.CREATE_REIMBURSEMENT,
      moduleName: ModuleName.REIMBURSEMENT_CREATION,
    },
    [VirtualUrl.REIMBURSEMENT_CLAIMS]: {
      reference: "VPV_029",
      virtualUrl: VirtualUrl.REIMBURSEMENT_CLAIMS,
      pageName: PageName.REIMBURSEMENT_CLAIMS,
      moduleName: ModuleName.REIMBURSEMENT_CLAIMS,
    },
    [VirtualUrl.EMPLOYEES]: {
      reference: "VPV_030",
      virtualUrl: VirtualUrl.EMPLOYEES,
      pageName: PageName.EMPLOYEES,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_EMPLOYEES,
    },
    [VirtualUrl.ADD_EMPLOYEE]: {
      reference: "VPV_031",
      virtualUrl: VirtualUrl.ADD_EMPLOYEE,
      pageName: PageName.ADD_EMPLOYEE,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_EMPLOYEES,
    },
    [VirtualUrl.EMPLOYEE_OVERVIEW]: {
      reference: "VPV_032",
      virtualUrl: VirtualUrl.EMPLOYEE_OVERVIEW,
      pageName: PageName.EMPLOYEE_OVERVIEW,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_EMPLOYEES,
    },
    [VirtualUrl.ASC_PROFILES]: {
      reference: "VPV_033",
      virtualUrl: VirtualUrl.ASC_PROFILES,
      pageName: PageName.ASC_PROFILES,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ADD_ASC]: {
      reference: "VPV_034",
      virtualUrl: VirtualUrl.ADD_ASC,
      pageName: PageName.ADD_ASC,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.EDIT_ASC]: {
      reference: "VPV_035",
      virtualUrl: VirtualUrl.EDIT_ASC,
      pageName: PageName.EDIT_ASC,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_OVERVIEW_GENERAL_INFO]: {
      reference: "VPV_036",
      virtualUrl: VirtualUrl.ASC_OVERVIEW_GENERAL_INFO,
      pageName: PageName.ASC_OVERVIEW_GENERAL_INFO,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_OVERVIEW_BANKING]: {
      reference: "VPV_043",
      virtualUrl: VirtualUrl.ASC_OVERVIEW_BANKING,
      pageName: PageName.ASC_OVERVIEW_BANKING,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_OVERVIEW_NOTIFICATIONS]: {
      reference: "VPV_044",
      virtualUrl: VirtualUrl.ASC_OVERVIEW_NOTIFICATIONS,
      pageName: PageName.ASC_OVERVIEW_NOTIFICATIONS,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_OVERVIEW_PRICING]: {
      reference: "VPV_045",
      virtualUrl: VirtualUrl.ASC_OVERVIEW_PRICING,
      pageName: PageName.ASC_OVERVIEW_PRICING,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_OVERVIEW_BOSCH_INTERNAL_CONFIGURATION]: {
      reference: "VPV_046",
      virtualUrl: VirtualUrl.ASC_OVERVIEW_BOSCH_INTERNAL_CONFIGURATION,
      pageName: PageName.ASC_OVERVIEW_BOSCH_INTERNAL_CONFIGURATION,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_OVERVIEW_REIMBURSEMENT]: {
      reference: "VPV_047",
      virtualUrl: VirtualUrl.ASC_OVERVIEW_REIMBURSEMENT,
      pageName: PageName.ASC_OVERVIEW_REIMBURSEMENT,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_PROFILE_GENERAL_INFO]: {
      reference: "VPV_037",
      virtualUrl: VirtualUrl.ASC_PROFILE_GENERAL_INFO,
      pageName: PageName.ASC_PROFILE_GENERAL_INFO,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_PROFILE_BANKING]: {
      reference: "VPV_048",
      virtualUrl: VirtualUrl.ASC_PROFILE_BANKING,
      pageName: PageName.ASC_PROFILE_BANKING,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_PROFILE_NOTIFICATIONS]: {
      reference: "VPV_049",
      virtualUrl: VirtualUrl.ASC_PROFILE_NOTIFICATIONS,
      pageName: PageName.ASC_PROFILE_NOTIFICATIONS,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_PROFILE_PRICING]: {
      reference: "VPV_050",
      virtualUrl: VirtualUrl.ASC_PROFILE_PRICING,
      pageName: PageName.ASC_PROFILE_PRICING,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_PROFILE_BOSCH_INTERNAL_CONFIGURATION]: {
      reference: "VPV_051",
      virtualUrl: VirtualUrl.ASC_PROFILE_BOSCH_INTERNAL_CONFIGURATION,
      pageName: PageName.ASC_PROFILE_BOSCH_INTERNAL_CONFIGURATION,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.ASC_PROFILE_REIMBURSEMENT]: {
      reference: "VPV_052",
      virtualUrl: VirtualUrl.ASC_PROFILE_REIMBURSEMENT,
      pageName: PageName.ASC_PROFILE_REIMBURSEMENT,
      moduleName: ModuleName.ACCOUNT_MANAGEMENT_ASC,
    },
    [VirtualUrl.SYSTEM_CONFIGURATION]: {
      reference: "VPV_038",
      virtualUrl: VirtualUrl.SYSTEM_CONFIGURATION,
      pageName: PageName.SYSTEM_CONFIGURATION,
      moduleName: ModuleName.SYSTEM_CONFIGURATION,
    },
    [VirtualUrl.USER_MANAGEMENT]: {
      reference: "VPV_022",
      virtualUrl: VirtualUrl.USER_MANAGEMENT,
      pageName: PageName.USER_MANAGEMENT,
      moduleName: ModuleName.USER_MANAGEMENT,
    },
    [VirtualUrl.PAGE_NOT_FOUND]: {
      reference: "VPV_039",
      virtualUrl: VirtualUrl.PAGE_NOT_FOUND,
      pageName: PageName.PAGE_NOT_FOUND,
      moduleName: ModuleName.ERROR,
    },
  });

// ── Route mapping: router path (+ tab #hash) → VirtualUrl ──────────────────────

interface StaticRouteRule {
  readonly pattern: string;
  readonly virtualUrl: VirtualUrl;
}

interface TabbedRouteRule {
  readonly pattern: string;
  /** Tab hash (without `#`) → virtual page. */
  readonly tabHashToVirtualUrl: Readonly<Record<string, VirtualUrl>>;
  /** Used when the hash is absent/unknown. */
  readonly defaultVirtualUrl: VirtualUrl;
}

/** Every route in `Routes.tsx` is registered; an unmatched path is a real 404. */
export const STATIC_ROUTE_RULES: readonly StaticRouteRule[] = Object.freeze([
  { pattern: "/", virtualUrl: VirtualUrl.DASHBOARD },
  { pattern: "/dashboard", virtualUrl: VirtualUrl.DASHBOARD },
  { pattern: "/job-list", virtualUrl: VirtualUrl.JOB_LIST },
  { pattern: "/create-job", virtualUrl: VirtualUrl.CREATE_JOB },
  { pattern: "/edit-order/:orderId", virtualUrl: VirtualUrl.EDIT_JOB },
  { pattern: "/claim-list", virtualUrl: VirtualUrl.CLAIM_LIST },
  { pattern: "/approval-list", virtualUrl: VirtualUrl.PRE_APPROVAL_LIST },
  { pattern: "/clients", virtualUrl: VirtualUrl.CLIENTS },
  { pattern: "/reports", virtualUrl: VirtualUrl.REPORTS },
  { pattern: "/biqic-report", virtualUrl: VirtualUrl.BIQIC_REPORT },
  { pattern: "/reimbursement-detail/:ascId", virtualUrl: VirtualUrl.ASC_REIMBURSEMENTS },
  { pattern: "/reimbursements", virtualUrl: VirtualUrl.MY_REIMBURSEMENTS },
  { pattern: "/create-reimbursement", virtualUrl: VirtualUrl.CREATE_REIMBURSEMENT },
  {
    pattern: "/reimbursement-claims/:reimbursementId",
    virtualUrl: VirtualUrl.REIMBURSEMENT_CLAIMS,
  },
  { pattern: "/employee-list", virtualUrl: VirtualUrl.EMPLOYEES },
  { pattern: "/add-employee", virtualUrl: VirtualUrl.ADD_EMPLOYEE },
  { pattern: "/employee-overview/:employeeId", virtualUrl: VirtualUrl.EMPLOYEE_OVERVIEW },
  { pattern: "/asc-profiles", virtualUrl: VirtualUrl.ASC_PROFILES },
  { pattern: "/add-asc", virtualUrl: VirtualUrl.ADD_ASC },
  { pattern: "/edit-asc/:ascId", virtualUrl: VirtualUrl.EDIT_ASC },
  { pattern: "/system-configuration", virtualUrl: VirtualUrl.SYSTEM_CONFIGURATION },
  { pattern: "/user-management", virtualUrl: VirtualUrl.USER_MANAGEMENT },
]);

export const TABBED_ROUTE_RULES: readonly TabbedRouteRule[] = Object.freeze([
  {
    pattern: "/job-overview/:jobId",
    defaultVirtualUrl: VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
    tabHashToVirtualUrl: {
      customerAndPaymentData: VirtualUrl.JOB_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      assetData: VirtualUrl.JOB_OVERVIEW_ASSET_DATA,
      documents: VirtualUrl.JOB_OVERVIEW_DOCUMENTS,
      diagnosticData: VirtualUrl.JOB_OVERVIEW_DIAGNOSTIC_DATA,
      notes: VirtualUrl.JOB_OVERVIEW_NOTES,
    },
  },
  {
    pattern: "/claim-overview/:claimId",
    defaultVirtualUrl: VirtualUrl.CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA,
    tabHashToVirtualUrl: {
      customerAndPaymentData: VirtualUrl.CLAIM_OVERVIEW_CUSTOMER_PAYMENT_DATA,
      assetData: VirtualUrl.CLAIM_OVERVIEW_ASSET_DATA,
      documents: VirtualUrl.CLAIM_OVERVIEW_DOCUMENTS,
      diagnosticData: VirtualUrl.CLAIM_OVERVIEW_DIAGNOSTIC_DATA,
      claims: VirtualUrl.CLAIM_OVERVIEW_CLAIMS,
      notes: VirtualUrl.CLAIM_OVERVIEW_NOTES,
    },
  },
  {
    pattern: "/reimbursement",
    defaultVirtualUrl: VirtualUrl.REIMBURSEMENT_ASC_LIST,
    tabHashToVirtualUrl: {
      "asc-list": VirtualUrl.REIMBURSEMENT_ASC_LIST,
      "reimbursement-list": VirtualUrl.REIMBURSEMENT_LIST,
    },
  },
  {
    pattern: "/client-overview/:clientId",
    defaultVirtualUrl: VirtualUrl.CLIENT_OVERVIEW_CLIENT_INFO,
    tabHashToVirtualUrl: {
      clientInfo: VirtualUrl.CLIENT_OVERVIEW_CLIENT_INFO,
      Orders: VirtualUrl.CLIENT_OVERVIEW_ORDERS,
      Jobs: VirtualUrl.CLIENT_OVERVIEW_JOBS,
      Assets: VirtualUrl.CLIENT_OVERVIEW_ASSETS,
    },
  },
  {
    pattern: "/asc-overview/:ascId",
    defaultVirtualUrl: VirtualUrl.ASC_OVERVIEW_GENERAL_INFO,
    tabHashToVirtualUrl: {
      generalInfo: VirtualUrl.ASC_OVERVIEW_GENERAL_INFO,
      banking: VirtualUrl.ASC_OVERVIEW_BANKING,
      notifications: VirtualUrl.ASC_OVERVIEW_NOTIFICATIONS,
      pricing: VirtualUrl.ASC_OVERVIEW_PRICING,
      boschInternalConfiguration: VirtualUrl.ASC_OVERVIEW_BOSCH_INTERNAL_CONFIGURATION,
      reimbursement: VirtualUrl.ASC_OVERVIEW_REIMBURSEMENT,
    },
  },
  {
    pattern: "/asc-profile",
    defaultVirtualUrl: VirtualUrl.ASC_PROFILE_GENERAL_INFO,
    tabHashToVirtualUrl: {
      generalInfo: VirtualUrl.ASC_PROFILE_GENERAL_INFO,
      banking: VirtualUrl.ASC_PROFILE_BANKING,
      notifications: VirtualUrl.ASC_PROFILE_NOTIFICATIONS,
      pricing: VirtualUrl.ASC_PROFILE_PRICING,
      boschInternalConfiguration: VirtualUrl.ASC_PROFILE_BOSCH_INTERNAL_CONFIGURATION,
      reimbursement: VirtualUrl.ASC_PROFILE_REIMBURSEMENT,
    },
  },
]);
