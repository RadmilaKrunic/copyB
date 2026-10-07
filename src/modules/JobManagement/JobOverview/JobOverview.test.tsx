import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useContext, useEffect, useRef } from "react";
import { useFormikContext } from "formik";
import JobOverview from "./JobOverview";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { MessagesContext } from "contexts/messagescontext";
import type Field from "components/generics/Field/GenericField.types";
import type { discountBase } from "api/services/countryConfiguration/countryConfiguration";
import { mapValuesToAPI, convertAPIDataToFormValues } from "components/generics/utils";
import { DiagnosticsContext } from "./DiagnosticsContext";
import { getUploadFieldErrors } from "components/generics/Form/formValidation";
import { getCostEstimationPdf } from "api/services/jobs/action";

const locationStateMock = vi.hoisted(() => ({ value: null as { from?: string } | null }));
const tabsDataMock = vi.hoisted(() => ({ value: [] as unknown[] }));
const editingSectionsMock = vi.hoisted(() => ({ value: new Set<string>() }));
const allFieldsMock = vi.hoisted(() => ({ value: [] as Field[] }));
const initialFormValuesMock = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const discountBaseMock = vi.hoisted(() => ({ value: "NET_PRICE" as discountBase }));
const triggerValueMock = vi.hoisted(() => ({ value: 0 as unknown }));
const hasExistingDiagnosticMock = vi.hoisted(() => ({ value: false }));

type CapturedMutationOptions = {
  onSuccess?: (data?: unknown, ...rest: unknown[]) => unknown;
  onError?: (error?: unknown, ...rest: unknown[]) => unknown;
};
/** Latest options object each mutation hook received on the most recent render. */
const hookOptions = vi.hoisted(() => ({}) as Record<string, CapturedMutationOptions | undefined>);
/** Per-test React Query cache, keyed by the first element of the query key. */
const queryCacheMock = vi.hoisted(() => ({ value: {} as Record<string, unknown> }));
const navigateMock = vi.hoisted(() => vi.fn());
const setTabsMock = vi.hoisted(() => vi.fn());
const resyncMaterialsFromAPIMock = vi.hoisted(() => vi.fn());
const markAllValidatedMock = vi.hoisted(() => vi.fn());
const silentDiagnosticMutateAsyncMock = vi.hoisted(() => vi.fn());
const scrollToTopMock = vi.hoisted(() => vi.fn());
// Captured props/contexts are intentionally loosely typed: tests poke at internals.
type AnyRecord = Record<string, any>;
const jobIdMock = vi.hoisted(() => ({ value: "J-1" as string | undefined }));
const permissionMock = vi.hoisted(() => ({ value: true }));
const uiConfigEnabledMock = vi.hoisted(() => ({ value: true }));
const postMessageMutateMock = vi.hoisted(() => vi.fn());
const approvePreApprovalMutateMock = vi.hoisted(() => vi.fn());
const setInitialFormValuesMock = vi.hoisted(() => vi.fn());
const setAllFieldsMock = vi.hoisted(() => vi.fn());
const enableSectionEditingMock = vi.hoisted(() => vi.fn());
const setEditingSectionsMock = vi.hoisted(() => vi.fn());
const actionWithValidationMock = vi.hoisted(() =>
  vi.fn(async (_a: string, _b: unknown, _c: unknown, onValid: () => void) => onValid()),
);
const onAddMaterialsMock = vi.hoisted(() => vi.fn());
const setMaterialsMock = vi.hoisted(() => vi.fn());
const managerEnableValidateMock = vi.hoisted(() => vi.fn(() => false));
const getExistingPartNumbersMock = vi.hoisted(() => vi.fn(() => new Set<string>(["PN-X"])));
const materialsMock = vi.hoisted(() => ({ value: [] as Array<Record<string, unknown>> }));
const allowedPositionsMock = vi.hoisted(() => ({
  value: [] as Array<{ position: string; maxCount: number }>,
}));
type PendingInfo = { pendingTypeFields: Array<{ name: string }> };
const pendingMock = vi.hoisted(() => ({
  chargeable: { pendingTypeFields: [], hasChargeablePending: false } as PendingInfo & {
    hasChargeablePending: boolean;
  },
  bosch: { pendingTypeFields: [], hasBoschInternalPending: false } as PendingInfo & {
    hasBoschInternalPending: boolean;
  },
}));
/** Live handles captured from mocked children, refreshed on every render. */
const captured = vi.hoisted(() => ({
  formCtx: undefined as AnyRecord | undefined,
  diagnosticsCtx: undefined as AnyRecord | undefined,
  formik: undefined as
    | { values: Record<string, unknown>; setFieldValue: (f: string, v: unknown) => unknown }
    | undefined,
  onActionClick: undefined as ((action: string | undefined) => void) | undefined,
  dependencyCtx: undefined as { actionCallbacks: Record<string, () => unknown> } | undefined,
  managerArgs: undefined as AnyRecord | undefined,
  sectionProps: undefined as { onEdit?: () => void } | undefined,
  answerModal: undefined as AnyRecord | undefined,
  approvalModal: undefined as AnyRecord | undefined,
  explosionModal: undefined as AnyRecord | undefined,
  specialModal: undefined as AnyRecord | undefined,
}));
const analyticsMock = vi.hoisted(() => ({
  trackNoteAdded: vi.fn(),
  trackRepairStarted: vi.fn(),
  trackRepairFinished: vi.fn(),
  trackJobCompleted: vi.fn(),
  trackJobSubmittedForReview: vi.fn(),
  trackJobApprovedForRepair: vi.fn(),
  trackPreApprovalRequested: vi.fn(),
  trackDiagnosticValidated: vi.fn(),
  trackPreApprovalReviewed: vi.fn(),
}));

vi.mock("@/analytics", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/analytics");
  return {
    ...actual,
    useAnalytics: () => analyticsMock,
    // Pass-through so tests control validity: empty/undefined -> undefined, anything else -> itself.
    toJobType: (value?: string | null) => value || undefined,
    toJobStatus: (value?: string | null) => value || undefined,
    toPreApprovalAction: (value?: string | null) => value || undefined,
  };
});

vi.mock("utils/scrollToError", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("utils/scrollToError");
  return { ...actual, scrollToTop: scrollToTopMock };
});

vi.mock("@bosch/react-frok", () => ({
  TabNavigation: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tab: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Notification: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ jobId: jobIdMock.value }),
    useNavigate: () => navigateMock,
    useLocation: () => ({ state: locationStateMock.value }),
  };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const queryClientMock = {
  getQueryData: vi.fn((key: unknown) => {
    if (Array.isArray(key) && key[0] === "user") {
      return { countryCode: "ZA", permissions: [] };
    }
    if (Array.isArray(key) && key[0] === "UIConfiguration") {
      if (!uiConfigEnabledMock.value) return undefined;
      return {
        forms: [
          {
            name: "JobOverview",
            actions: [
              { name: "Add Spare Part", onAction: "onAddSparePart" },
              { name: "Hold", onAction: "onHold" },
              { name: "Next Step", onAction: "onGoToNextStep" },
              { name: "Customer Answer", onAction: "onCustomerAnswer" },
              { name: "Approve Repair", onAction: "onApproveForRepair" },
              { name: "Request Internal", onAction: "onRequestInternalApproval" },
              { name: "Submit Review", onAction: "onSubmitForReview" },
              { name: "Start Repair", onAction: "onStartRepair" },
              { name: "Finish Repair", onAction: "onFinishRepair" },
              { name: "Tool Delivered", onAction: "onToolDelivered" },
              { name: "Create Cost", onAction: "onCreateCostEstimate" },
              { name: "Save Customer", onAction: "onSaveCustomer" },
              { name: "Cancel Save Customer", onAction: "onCancelSaveCustomer" },
              { name: "Save Asset", onAction: "onSaveAsset" },
              { name: "Cancel Asset", onAction: "onCancelEditAsset" },
              { name: "Add Special", onAction: "onAddSpecialMaterials" },
              { name: "Product Details", onAction: "onProductDetails" },
              { name: "Validate", onAction: "onValidate" },
              { name: "Approve Pre", onAction: "onApprovePreApproval" },
              { name: "Reject Pre", onAction: "onRejectPreApproval" },
              { name: "Revise Pre", onAction: "onRevisePreApproval" },
            ],
            sections: [],
          },
        ],
      };
    }
    if (Array.isArray(key) && typeof key[0] === "string") {
      return queryCacheMock.value[key[0]];
    }
    return undefined;
  }),
  invalidateQueries: vi.fn(),
  refetchQueries: vi.fn(() => Promise.resolve()),
  setQueryData: vi.fn(),
};

const onAddRowMock = vi.hoisted(() => vi.fn());
const toggleHoldMutateMock = vi.hoisted(() => vi.fn());
const startDiagnosticMutateMock = vi.hoisted(() => vi.fn());
const customerAnswerMutateMock = vi.hoisted(() => vi.fn());
const postCustomerMutateMock = vi.hoisted(() => vi.fn());
const patchJobMutateMock = vi.hoisted(() => vi.fn());
const validateAndSaveMutateMock = vi.hoisted(() => vi.fn());
const recalculatePricesMutateMock = vi.hoisted(() => vi.fn());

const disableSectionEditingMock = vi.hoisted(() => vi.fn());
const repairApprovalMutateMock = vi.hoisted(() => vi.fn());
const internalApprovalMutateMock = vi.hoisted(() => vi.fn());
const startReviewMutateMock = vi.hoisted(() => vi.fn());
const startRepairMutateMock = vi.hoisted(() => vi.fn());
const finishRepairMutateMock = vi.hoisted(() => vi.fn());
const toolDeliveredMutateMock = vi.hoisted(() => vi.fn());
const createCostEstimateMutateMock = vi.hoisted(() => vi.fn());
const warrantyMutateMock = vi.hoisted(() => vi.fn());
const addSpecialMaterialsAllowedMock = vi.hoisted(() => ({ value: false }));
const warrantyCheckDataMock = vi.hoisted(() => ({ value: null as unknown }));
const diagnosticDataMock = vi.hoisted(() => ({
  value: undefined as { customerAnswer?: string } | undefined,
}));

const areaChangeTrigger = vi.hoisted(() => ({
  enabled: false,
  values: {},
}));
const warrantyMutateAsyncMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => queryClientMock,
  // Only JobOverview's postMessageMutation uses useMutation directly.
  useMutation: (options: CapturedMutationOptions) => {
    hookOptions.postMessage = options;
    return { mutate: postMessageMutateMock, mutateAsync: vi.fn(), isPending: false };
  },
}));

vi.mock("hooks/useHasPermission", () => ({ useHasPermission: () => permissionMock.value }));
vi.mock("hooks/useBreadcrumbs", () => ({ useBreadcrumbs: vi.fn() }));
vi.mock("hooks/useAccessoriesManager", () => ({
  useAccessoriesManager: () => ({ assetsAccessories: [], setAssetsAccessories: vi.fn() }),
}));
vi.mock("hooks/useDiagnosticData", () => ({
  useDiagnosticData: () => ({
    diagnosticData: diagnosticDataMock.value,
    diagnosticLoading: false,
    shouldFetchDiagnostic: false,
  }),
}));
vi.mock("hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    initialFormValues: initialFormValuesMock.value,
    setInitialFormValues: setInitialFormValuesMock,
    allFields: allFieldsMock.value,
    setAllFields: setAllFieldsMock,
    mandatoryFields: null,
    tabs: tabsDataMock.value,
    setTabs: setTabsMock,
  }),
}));
vi.mock("hooks/useUIConfiguration", () => ({
  useResourceUIConfiguration: () => {
    if (!uiConfigEnabledMock.value) {
      return { uiConfiguration: undefined, countryCode: "ZA", isLoading: false, isError: false };
    }
    return {
      uiConfiguration: {
        forms: [
          {
            name: "JobOverview",
            actions: [
              { name: "Add Spare Part", onAction: "onAddSparePart" },
              { name: "Hold", onAction: "onHold" },
              { name: "Next Step", onAction: "onGoToNextStep" },
              { name: "Customer Answer", onAction: "onCustomerAnswer" },
              { name: "Approve Repair", onAction: "onApproveForRepair" },
              { name: "Request Internal", onAction: "onRequestInternalApproval" },
              { name: "Submit Review", onAction: "onSubmitForReview" },
              { name: "Start Repair", onAction: "onStartRepair" },
              { name: "Finish Repair", onAction: "onFinishRepair" },
              { name: "Tool Delivered", onAction: "onToolDelivered" },
              { name: "Create Cost", onAction: "onCreateCostEstimate" },
              { name: "Save Customer", onAction: "onSaveCustomer" },
              { name: "Cancel Save Customer", onAction: "onCancelSaveCustomer" },
              { name: "Save Asset", onAction: "onSaveAsset" },
              { name: "Cancel Asset", onAction: "onCancelEditAsset" },
              { name: "Add Special", onAction: "onAddSpecialMaterials" },
              { name: "Product Details", onAction: "onProductDetails" },
              { name: "Validate", onAction: "onValidate" },
              { name: "Approve Pre", onAction: "onApprovePreApproval" },
              { name: "Reject Pre", onAction: "onRejectPreApproval" },
              { name: "Revise Pre", onAction: "onRevisePreApproval" },
            ],
            sections: [],
          },
        ],
      },
      countryCode: "ZA",
      isLoading: false,
      isError: false,
    };
  },
}));
vi.mock("hooks/useActionWithValidation", () => ({
  useActionWithValidation: () => actionWithValidationMock,
}));
vi.mock("hooks/usePositionDropdownSync", () => ({ usePositionDropdownSync: vi.fn() }));
vi.mock("hooks/usePostRecalculatePrices", () => ({ usePostRecalculatePrices: vi.fn() }));

vi.mock("hooks/useSectionEditing", () => ({
  useSectionEditing: () => ({
    editingSections: editingSectionsMock.value,
    enableSectionEditing: enableSectionEditingMock,
    disableSectionEditing: disableSectionEditingMock,
    setEditingSections: setEditingSectionsMock,
  }),
}));
vi.mock("hooks/useDiagnosticsManager", () => ({
  useDiagnosticsManager: (args: AnyRecord) => {
    captured.managerArgs = args;
    return {
      materials: materialsMock.value,
      setMaterials: setMaterialsMock,
      positionDropdownOptions: [],
      allowedPositions: allowedPositionsMock.value,
      addSpecialMaterialsAllowed: addSpecialMaterialsAllowedMock.value,
      markAllValidated: markAllValidatedMock,
      markRowDirty: vi.fn(),
      discountBase: discountBaseMock.value,
      onAddRow: onAddRowMock,
      onDeleteRow: vi.fn(),
      onRestoreRow: vi.fn(),
      onAddMaterials: onAddMaterialsMock,
      getExistingPartNumbers: getExistingPartNumbersMock,
      enableValidate: managerEnableValidateMock,
      setRevisedRejectedRowPending: vi.fn(),
      apiMaterialsLoaded: false,
      apiMaterialsEmpty: true,
      hasExistingDiagnostic: hasExistingDiagnosticMock.value,
      canArchiveOnDelete: false,
      automaticRows: [],
      resyncMaterialsFromAPI: resyncMaterialsFromAPIMock,
    };
  },
  // Return a merged view so tests can control "chargeable" vs "bosch" pending
  // independently via the pendingMock object above.
  getPendingInfo: () => ({
    pendingTypeFields:
      (pendingMock.chargeable.pendingTypeFields?.length
        ? pendingMock.chargeable.pendingTypeFields
        : pendingMock.bosch.pendingTypeFields) ?? [],
    hasChargeablePending: Boolean(pendingMock.chargeable.hasChargeablePending),
    hasBoschInternalPending: Boolean(pendingMock.bosch.hasBoschInternalPending),
  }),
  hasWarrantyOrProServiceItems: (
    _fields: Array<{ subtype?: string; name: string }>,
    values: Record<string, unknown>,
  ) =>
    Object.entries(values).some(([key, value]) => {
      if (!key.endsWith("_type")) return false;
      return value === "WARRANTY" || value === "SERVICE_OFFERING";
    }),
}));

vi.mock("components/generics/Form/useFormValidation", () => ({
  useFormValidation: () => ({
    validate: vi.fn(),
    validateByAction: vi.fn(),
    startValidation: vi.fn(),
    stopValidation: vi.fn(),
    setCurrentAction: vi.fn(),
  }),
}));

vi.mock("components/generics/utils", () => ({
  syncMaterialsWithForm: <T,>(materials: T[]) => materials,
  convertAPIDataToFormValues: vi.fn(() => ({})),
  setSectionDisabledState: vi.fn((s: unknown) => s),
  mapValuesToAPI: vi.fn(() => ({
    order: { customer: { useBillingAddressForDelivery: false } },
    job: { asset: { hasAccessories: true } },
  })),
}));

vi.mock("components/generics/Action/actionDependency", async () => {
  const actual = await vi.importActual<Record<string, unknown>>(
    "components/generics/Action/actionDependency",
  );
  const realAreAllActionsDisabled = actual.areAllActionsDisabled as (
    actions: unknown,
    ctx: { actionCallbacks: Record<string, () => unknown> },
  ) => boolean;
  return {
    ...actual,
    areAllActionsDisabled: (
      actions: unknown,
      ctx: { actionCallbacks: Record<string, () => unknown> },
    ) => {
      captured.dependencyCtx = ctx;
      return realAreAllActionsDisabled(actions, ctx);
    },
  };
});

vi.mock("components/generics/Form/formValidation", () => ({
  getUploadFieldErrors: vi.fn(() => []),
}));

vi.mock("components/generics/Section/GenericSection", () => ({
  default: function MockGenericSection(props: {
    section?: { name?: string };
    onEdit?: () => void;
  }) {
    const { section } = props;
    captured.sectionProps = props;
    const { onAreaValueChange, actionCallbacks } = useContext(GenericFormContext);
    const { values } = useFormikContext<Record<string, unknown>>();
    const hasTriggeredRef = useRef(false);

    useEffect(() => {
      if (!areaChangeTrigger.enabled || hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      onAreaValueChange?.("asset", areaChangeTrigger.values);
    }, [onAreaValueChange]);

    // actionCallbacks is typed generically as Record<string, (values: Record<string,
    // unknown>) => unknown> on GenericFormContext, but the four summary handlers
    // below actually implement (value: unknown) => void at runtime. Cast through
    // their real signature so we can invoke them with a raw scalar test value.
    const callScalarHandler = (name: keyof typeof actionCallbacks) => {
      const handler = actionCallbacks[name] as unknown as ((value: unknown) => void) | undefined;
      handler?.(triggerValueMock.value);
    };

    return (
      <div>
        <div>generic-section</div>
        <div data-testid="active-section">{section?.name}</div>
        <button type="button" onClick={() => callScalarHandler("onSummaryDiscountChange")}>
          trigger-discount-change
        </button>
        <button type="button" onClick={() => callScalarHandler("onSummaryDiscountNetChange")}>
          trigger-discount-net-change
        </button>
        <button type="button" onClick={() => callScalarHandler("onSummaryTotalAmountChange")}>
          trigger-total-change
        </button>
        <button type="button" onClick={() => callScalarHandler("onSummaryNetAmountChange")}>
          trigger-net-change
        </button>
        <pre data-testid="form-values">{JSON.stringify(values)}</pre>
      </div>
    );
  },
}));
vi.mock("components/generics/Action/GenericAction", () => ({
  default: function MockGenericAction({
    actions,
    onActionClick,
  }: {
    actions: Array<{ name?: string; onAction?: string }>;
    onActionClick: (action: string | undefined) => void;
  }) {
    const formCtx = useContext(GenericFormContext);
    const { actionCallbacks } = formCtx;
    captured.formCtx = formCtx as unknown as AnyRecord;
    captured.diagnosticsCtx = useContext(DiagnosticsContext) as unknown as AnyRecord;
    captured.formik = useFormikContext<Record<string, unknown>>();
    captured.onActionClick = onActionClick;

    return (
      <div>
        <div>generic-action</div>
        {actions.map((action) => {
          if (action.onAction === "onCustomerAnswer" && !actionCallbacks.showCustomerAnswer?.()) {
            return null;
          }

          return (
            <button
              key={action.onAction}
              type="button"
              onClick={() => onActionClick(action.onAction)}
            >
              {action.name}
            </button>
          );
        })}
      </div>
    );
  },
}));
vi.mock("./JobOverviewHeader/JobOverviewHeader", () => ({
  default: () => <div>job-overview-header</div>,
}));
vi.mock("./AddSpecialMaterialModal/AddSpecialMaterialModal", () => ({
  default: (props: Record<string, unknown>) => {
    captured.specialModal = props;
    return <div>add-special-material-modal</div>;
  },
}));
vi.mock("./AnswerModal/AnswerModal", () => ({
  default: (props: { options?: Array<{ value: string; label: string }>; isOpen?: boolean }) => {
    captured.answerModal = props;
    return (
      <div>
        answer-modal
        <div data-testid="answer-modal-open">{String(Boolean(props.isOpen))}</div>
        <div data-testid="answer-modal-options">
          {props.options?.map((option) => option.value).join(",")}
        </div>
      </div>
    );
  },
}));
vi.mock("./ExplosionDiagram/ExplosionDrawingModal", () => ({
  default: (props: Record<string, unknown>) => {
    captured.explosionModal = props;
    return <div>explosion-drawing-modal</div>;
  },
}));
vi.mock(
  "../../ClaimManagement/ApprovalList/ApprovalListTable/ApprovalDecisionModal/ApprovalDecisionModal",
  () => ({
    default: (props: { decisionType?: string; title?: string }) => {
      captured.approvalModal = props;
      return (
        <div>
          approval-decision-modal{props.decisionType ? `:${props.decisionType}` : ""}
          <span data-testid="approval-modal-title">{props.title}</span>
        </div>
      );
    },
  }),
);
vi.mock("../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div>loading-indicator</div>,
}));

vi.mock("api/services/approvals/hooks", () => ({
  useUpdateApprovalStatus: (options: CapturedMutationOptions) => {
    hookOptions.approvePreApproval = options;
    return { mutate: approvePreApprovalMutateMock, mutateAsync: vi.fn(), isPending: false };
  },
}));

vi.mock("api/services/orders/hooks", () => ({
  usePostWarrantyCheck: () => ({
    mutate: warrantyMutateMock,
    mutateAsync: warrantyMutateAsyncMock,
    data: warrantyCheckDataMock.value,
  }),
}));

const useJobByIdMock = vi.hoisted(() => vi.fn());
/** Builds a mutation-hook mock that records the options it was called with under `key`. */
const mutationHookMock = vi.hoisted(
  () =>
    (key: string, mutate: unknown = vi.fn(), mutateAsync: unknown = vi.fn()) =>
    (options?: CapturedMutationOptions) => {
      hookOptions[key] = options;
      return { mutate, mutateAsync, isPending: false };
    },
);
vi.mock("api/services/jobs/hooks", () => ({
  useJobById: useJobByIdMock,
  usePatchJobById: mutationHookMock("patchJob", patchJobMutateMock),
  usePostCustomerData: mutationHookMock("postCustomer", postCustomerMutateMock),
  usePostJobStatusStartDiagnostic: mutationHookMock(
    "postJobStatus",
    startDiagnosticMutateMock,
    startDiagnosticMutateMock,
  ),
  usePostRecalculatePrices: mutationHookMock("recalculate", recalculatePricesMutateMock),
  useToggleJobHold: mutationHookMock("toggleJobHold", toggleHoldMutateMock, toggleHoldMutateMock),
  usePostValidateAndSave: mutationHookMock("validateAndSave", validateAndSaveMutateMock),
  usePostDiagnostic: mutationHookMock("silentDiagnostic", vi.fn(), silentDiagnosticMutateAsyncMock),
  usePostRepairApproval: mutationHookMock(
    "repairApproval",
    repairApprovalMutateMock,
    repairApprovalMutateMock,
  ),
  usePostInternalApprovalRequest: mutationHookMock(
    "internalApproval",
    internalApprovalMutateMock,
    internalApprovalMutateMock,
  ),
  usePostStartReview: mutationHookMock("startReview", startReviewMutateMock, startReviewMutateMock),
  usePostStartRepair: mutationHookMock("startRepair", startRepairMutateMock, startRepairMutateMock),
  usePostFinishRepair: mutationHookMock(
    "finishRepair",
    finishRepairMutateMock,
    finishRepairMutateMock,
  ),
  usePostToolDelivered: mutationHookMock(
    "toolDelivered",
    toolDeliveredMutateMock,
    toolDeliveredMutateMock,
  ),
  usePostCreateCostEstimate: mutationHookMock(
    "createCostEstimate",
    createCostEstimateMutateMock,
    createCostEstimateMutateMock,
  ),
  usePostCustomerAnswer: mutationHookMock(
    "customerAnswer",
    customerAnswerMutateMock,
    customerAnswerMutateMock,
  ),
}));

vi.mock("api/services/jobs/action", async () => {
  const actual = await vi.importActual<object>("api/services/jobs/action");
  return {
    ...actual,
    postMessage: vi.fn(),
    getCostEstimationPdf: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  locationStateMock.value = null;
  warrantyCheckDataMock.value = null;
  initialFormValuesMock.value = {};
  tabsDataMock.value = [];
  allFieldsMock.value = [];
  editingSectionsMock.value = new Set<string>();
  addSpecialMaterialsAllowedMock.value = false;
  areaChangeTrigger.enabled = false;
  areaChangeTrigger.values = {};
  allFieldsMock.value = [];
  initialFormValuesMock.value = {};
  discountBaseMock.value = "NET_PRICE";
  triggerValueMock.value = 0;
  hasExistingDiagnosticMock.value = false;
  queryCacheMock.value = {};
  for (const key of Object.keys(hookOptions)) delete hookOptions[key];
  jobIdMock.value = "J-1";
  managerEnableValidateMock.mockImplementation(() => false);
  permissionMock.value = true;
  uiConfigEnabledMock.value = true;
  materialsMock.value = [];
  allowedPositionsMock.value = [];
  pendingMock.chargeable = { pendingTypeFields: [], hasChargeablePending: false };
  pendingMock.bosch = { pendingTypeFields: [], hasBoschInternalPending: false };
  for (const key of Object.keys(captured) as Array<keyof typeof captured>) {
    captured[key] = undefined;
  }
});

describe("JobOverview", () => {
  it("renders loading state", () => {
    useJobByIdMock.mockReturnValue({ data: undefined, isLoading: true, error: null });

    render(<JobOverview />);

    expect(screen.getByText("loading-indicator")).toBeInTheDocument();
  });

  it("renders error state", () => {
    useJobByIdMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("boom"),
    });

    render(<JobOverview />);

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(/boom/i)).toBeInTheDocument();
  });

  it("renders no job found state", () => {
    useJobByIdMock.mockReturnValue({ data: undefined, isLoading: false, error: null });

    render(<JobOverview />);

    expect(screen.getByText("noJobFound")).toBeInTheDocument();
  });

  it("renders main layout when job data exists", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
    expect(screen.getByText("generic-action")).toBeInTheDocument();
  });

  it("triggers onAddSparePart action callback", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Add Spare Part" }));

    expect(onAddRowMock).toHaveBeenCalledTimes(1);
  });

  it("executes multiple mutation-backed actions", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Hold" }));
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve Repair" }));
    fireEvent.click(screen.getByRole("button", { name: "Request Internal" }));
    fireEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Repair" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish Repair" }));
    fireEvent.click(screen.getByRole("button", { name: "Tool Delivered" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Cost" }));

    const mutationCalls =
      toggleHoldMutateMock.mock.calls.length +
      startDiagnosticMutateMock.mock.calls.length +
      repairApprovalMutateMock.mock.calls.length +
      internalApprovalMutateMock.mock.calls.length +
      startReviewMutateMock.mock.calls.length +
      startRepairMutateMock.mock.calls.length +
      finishRepairMutateMock.mock.calls.length +
      toolDeliveredMutateMock.mock.calls.length +
      createCostEstimateMutateMock.mock.calls.length;

    expect(mutationCalls).toBeGreaterThan(0);
    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("executes save customer, save asset, and cancel actions", async () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { orderId: "O-1" },
        job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Save Customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Save Customer" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Asset" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel Asset" }));

    await waitFor(() => expect(postCustomerMutateMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(patchJobMutateMock).toHaveBeenCalledTimes(1));
    expect(postCustomerMutateMock).toHaveBeenCalledWith(
      {
        orderId: "O-1",
        payload: { useBillingAddressForDelivery: false },
      },
      expect.any(Object),
    );
    expect(patchJobMutateMock).toHaveBeenCalledWith(
      {
        jobId: "J-1",
        data: { asset: { hasAccessories: true } },
      },
      expect.any(Object),
    );
    expect(disableSectionEditingMock).toHaveBeenCalledWith("customerAndPaymentData", true);
    expect(disableSectionEditingMock).toHaveBeenCalledWith("assetData", true);
  });

  it("opens customer answer, special materials, product details, and pre-approval modals", () => {
    addSpecialMaterialsAllowedMock.value = true;
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "CUSTOMER_APPROVAL_PENDING", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Customer Answer" }));
    expect(screen.getByText("answer-modal")).toBeInTheDocument();
    expect(screen.getByTestId("answer-modal-options")).not.toHaveTextContent("REPAIR");

    fireEvent.click(screen.getByRole("button", { name: "Add Special" }));
    expect(screen.getByText("add-special-material-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Product Details" }));
    expect(screen.getByText("explosion-drawing-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Approve Pre" }));
    expect(screen.getByText("approval-decision-modal:approved")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Reject Pre" }));
    expect(screen.getByText("approval-decision-modal:rejected")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Revise Pre" }));
    expect(screen.getByText("approval-decision-modal:revised")).toBeInTheDocument();
  });

  it("keeps diagnostics row actions visible after repair answer returns to waiting approval", () => {
    diagnosticDataMock.value = { customerAnswer: "REPAIR" };
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "WAITING_FOR_APPROVAL", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByRole("button", { name: "Add Spare Part" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Product Details" })).toBeInTheDocument();
  });

  it("passes repair customer answer when action type is REPAIR", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "CUSTOMER_APPROVAL_PENDING", isOnHold: false } },
      isLoading: false,
      error: null,
    });
    initialFormValuesMock.value = { actionType: "REPAIR" };

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Customer Answer" }));

    expect(screen.getByTestId("answer-modal-options")).toHaveTextContent("REPAIR");
  });

  it("executes validate action", async () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));

    await waitFor(() => expect(validateAndSaveMutateMock).toHaveBeenCalledTimes(1));
    expect(validateAndSaveMutateMock).toHaveBeenCalledWith({
      jobId: "J-1",
      payload: expect.any(Object),
    });
  });

  describe("validateAndSave price preservation", () => {
    const materialWithCalculatedPrice = {
      id: "M-1",
      order: 1,
      partNumber: "PN-1",
      price: {
        unitPrice: 40,
        tax: 19,
        netAmount: 80,
        grossAmount: 95.2,
        totalAmount: 95.2,
        discount: 0,
      },
    };

    it("preserves material prices on a subsequent validateAndSave (diagnostic already exists, status still DRAFT)", async () => {
      hasExistingDiagnosticMock.value = true;
      vi.mocked(mapValuesToAPI).mockReturnValueOnce({
        diagnostic: {
          status: "DRAFT",
          materials: [materialWithCalculatedPrice],
        },
      } as unknown as ReturnType<typeof mapValuesToAPI>);
      useJobByIdMock.mockReturnValue({
        data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);
      fireEvent.click(screen.getByRole("button", { name: "Validate" }));

      await waitFor(() => expect(validateAndSaveMutateMock).toHaveBeenCalledTimes(1));
      const { payload } = validateAndSaveMutateMock.mock.calls[0][0] as {
        payload: { materials: Array<{ price: unknown }> };
      };
      expect(payload.materials[0].price).toEqual(materialWithCalculatedPrice.price);
    });
  });

  it("blocks finish repair when purchase date and warranty diagnostic item need invoice", async () => {
    allFieldsMock.value = [
      {
        name: "job_asset_upload",
        label: "upload",
        type: "upload",
        fieldMapping: { originalName: "upload" },
        requiredDocuments: [
          {
            documentTypes: ["INVOICE"],
            errorMessage: "InvoiceWarrantyValidation",
            requiredForFields: [{ fieldName: "customerWish", fieldValue: "WARRANTY" }],
          },
        ],
      },
      {
        name: "row0_type",
        label: "type",
        type: "dropdown",
        subtype: "diagnosticType",
      },
    ];
    areaChangeTrigger.enabled = true;
    areaChangeTrigger.values = {
      customerWish: "CHARGEABLE",
      purchaseDate: "2024-06-15",
      row0_type: "WARRANTY",
    };
    initialFormValuesMock.value = {
      customerWish: "CHARGEABLE",
      purchaseDate: "2024-06-15",
      row0_type: "WARRANTY",
    };

    const setMessagesMock = vi.fn();
    useJobByIdMock.mockReturnValue({
      data: {
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            attachments: [],
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(
      <MessagesContext.Provider value={{ messages: [], setMessages: setMessagesMock }}>
        <JobOverview />
      </MessagesContext.Provider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Finish Repair" }));

    expect(finishRepairMutateMock).not.toHaveBeenCalled();
    expect(setMessagesMock).toHaveBeenCalled();
    const messageUpdater = setMessagesMock.mock.calls[0]?.[0] as (prev: unknown[]) => unknown[];
    expect(messageUpdater([])).toEqual([
      { text: "InvoiceWarrantyValidation", type: "error", duration: 3000 },
    ]);
  });

  it("hides customer answer for approval-list multiple-pending jobs", () => {
    locationStateMock.value = { from: "approval-list" };
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "MULTIPLE_APPROVAL_PENDING", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.queryByRole("button", { name: "Customer Answer" })).not.toBeInTheDocument();
  });

  it("triggers warranty check when asset data is complete and has no warranty info", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: null,
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(warrantyMutateMock).toHaveBeenCalledWith({
      brand: "BOSCH",
      country: "ZA",
      bareToolNumber: "BT-100",
      serialNumber: "SN-100",
      purchaseDate: "2024-05-10",
    });
  });

  it("does not trigger warranty check when warranty information already exists", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: { warrantyType: "STANDARD_WARRANTY" },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(warrantyMutateMock).not.toHaveBeenCalled();
  });

  it("does not trigger warranty check when required asset fields are missing", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "",
            serialNumber: "SN-100",
            purchaseDate: "",
            warrantyInformation: null,
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(warrantyMutateMock).not.toHaveBeenCalled();
  });

  it("renders job in on-hold state without crashing", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: true } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("renders job in DELIVERED status without crashing", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "DELIVERED", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("renders job in WAITING_FOR_APPROVAL status", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "WAITING_FOR_APPROVAL", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("renders job in IN_REPAIR status", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_REPAIR", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("renders on-hold notification banner when job is on hold", () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: true } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("jobOnHoldBanner")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo - INELIGIBLE from warrantyInformation field", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: {
              warrantyType: null,
              evaluation: { status: "INELIGIBLE", ineligibleReason: "WARRANTY_EXPIRED" },
              validityExpirationDate: "2023-01-01",
              usedWarrantyRepairCount: 0,
              allowedWarrantyRepairCount: 0,
            },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo - ELIGIBLE from warrantyInformation field", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: {
              warrantyType: "STANDARD_WARRANTY",
              evaluation: { status: "ELIGIBLE" },
              validityExpirationDate: "2026-01-01",
              usedWarrantyRepairCount: 1,
              allowedWarrantyRepairCount: 3,
              proServiceType: "INDIVIDUAL_PRO",
            },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo - INELIGIBLE from warranty mutation checkResult", () => {
    warrantyCheckDataMock.value = {
      evaluationStatus: "INELIGIBLE",
      reasonKey: "ALLOWED_REPAIR_COUNT_EXCEEDED",
      supportedWarrantyType: "STANDARD_WARRANTY",
      usedWarrantyRepairCount: 3,
      allowedWarrantyRepairCount: 2,
      proServiceType: "INDIVIDUAL_PRO",
    };

    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: null,
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo - ELIGIBLE from warranty mutation checkResult", () => {
    warrantyCheckDataMock.value = {
      evaluationStatus: "ELIGIBLE",
      reasonKey: null,
      supportedWarrantyType: "STANDARD_WARRANTY",
      validityExpirationDate: "2027-06-15",
      usedWarrantyRepairCount: 0,
      allowedWarrantyRepairCount: 3,
      proServiceType: null,
    };

    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: { warrantyInformation: null, purchaseDate: "2024-05-10" },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo - SKIPPED status (warrantyType null + status SKIPPED)", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "IN_DIAGNOSTICS",
          isOnHold: false,
          asset: {
            brand: "BOSCH",
            bareToolNumber: "BT-100",
            serialNumber: "SN-100",
            purchaseDate: "2024-05-10",
            warrantyInformation: {
              warrantyType: null,
              evaluation: { status: "SKIPPED" },
            },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("renders with tabs and exercises renderTabContent", () => {
    tabsDataMock.value = [
      {
        name: "assetData",
        label: "assetData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [],
        position: 2,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
    expect(screen.getByText("generic-section")).toBeInTheDocument();
  });

  it("renders tab with READY_FOR_DIAGNOSTIC status and edit button shows", () => {
    tabsDataMock.value = [
      {
        name: "assetData",
        label: "assetData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [{ name: "save", onAction: "onSaveAsset", mode: "primary", mandatoryFields: [] }],
        position: 2,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("generic-section")).toBeInTheDocument();
  });

  it("hides tab that is in hiddenForStatuses", () => {
    tabsDataMock.value = [
      {
        name: "diagnosticData",
        label: "diagnosticData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: ["READY_FOR_DIAGNOSTIC"],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [],
        position: 4,
      },
      {
        name: "assetData",
        label: "assetData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [],
        position: 2,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("generic-section")).toBeInTheDocument();
  });

  it("renders job with on-hold state and tab content is disabled", () => {
    tabsDataMock.value = [
      {
        name: "assetData",
        label: "assetData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [],
        position: 2,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: true } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("jobOnHoldBanner")).toBeInTheDocument();
    expect(screen.getByText("generic-section")).toBeInTheDocument();
  });

  it("exercises editingSections branch - tab in edit mode has edit-mode class", () => {
    editingSectionsMock.value = new Set(["assetData"]);

    tabsDataMock.value = [
      {
        name: "assetData",
        label: "assetData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [{ name: "save", onAction: "onSaveAsset", mode: "primary", mandatoryFields: [] }],
        position: 2,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("generic-section")).toBeInTheDocument();
  });

  it("exercises diagnosticLoading branch when shouldFetchDiagnostic is true", () => {
    vi.mock("hooks/useDiagnosticData", () => ({
      useDiagnosticData: () => ({
        diagnosticData: undefined,
        diagnosticLoading: true,
        shouldFetchDiagnostic: true,
      }),
    }));

    tabsDataMock.value = [
      {
        name: "diagnosticData",
        label: "diagnosticData",
        isTab: true,
        isAccordion: false,
        isDisabled: false,
        isHidden: false,
        isMultiple: false,
        isSubSection: false,
        hiddenForStatuses: [],
        dependFieldCondition: "",
        dependentFields: [],
        areas: [],
        actions: [],
        position: 4,
      },
    ];

    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: false } },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyInformation with proServiceType recommendation", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            warrantyInformation: {
              warrantyType: null,
              evaluation: { status: "INELIGIBLE", ineligibleReason: "UNKNOWN_SERIAL_NUMBER" },
              proServiceType: "INDIVIDUAL_PRO",
            },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  it("exercises warrantyPanelInfo hasPurchaseDate branch", () => {
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: {
          jobStatus: "READY_FOR_DIAGNOSTIC",
          isOnHold: false,
          asset: {
            purchaseDate: "2024-05-10",
            warrantyInformation: {
              warrantyType: "STANDARD_WARRANTY",
              evaluation: { status: "ELIGIBLE" },
            },
          },
        },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    expect(screen.getByText("job-overview-header")).toBeInTheDocument();
  });

  describe("runAssetWarrantyCheck / syncWarrantyResultToAssetTab", () => {
    const assetTab = {
      name: "assetData",
      label: "assetData",
      isTab: true,
      isAccordion: false,
      isDisabled: false,
      isHidden: false,
      isMultiple: false,
      isSubSection: false,
      hiddenForStatuses: [],
      dependFieldCondition: "",
      dependentFields: [],
      areas: [],
      actions: [],
      position: 2,
    };

    it("does not call mutateAsync when editingSections does not contain assetData", async () => {
      tabsDataMock.value = [assetTab];
      areaChangeTrigger.enabled = true;
      areaChangeTrigger.values = {
        brand: "BOSCH",
        baretoolNumber: "BT-002",
        serialNumber: "SN-002",
        purchaseDate: "2024-06-15",
      };
      editingSectionsMock.value = new Set<string>();
      warrantyMutateAsyncMock.mockResolvedValue({ evaluationStatus: "INELIGIBLE" });

      useJobByIdMock.mockReturnValue({
        data: {
          order: { countryCode: "ZA" },
          job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
        },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);

      await new Promise<void>((r) => setTimeout(r, 50));

      expect(warrantyMutateAsyncMock).not.toHaveBeenCalled();
    });

    it("calls mutateAsync and exercises syncWarrantyResultToAssetTab with INELIGIBLE", async () => {
      tabsDataMock.value = [assetTab];
      areaChangeTrigger.enabled = true;
      areaChangeTrigger.values = {
        brand: "BOSCH",
        baretoolNumber: "BT-002",
        serialNumber: "SN-002",
        purchaseDate: "2024-06-15",
      };
      editingSectionsMock.value = new Set(["assetData"]);
      warrantyMutateAsyncMock.mockResolvedValue({
        evaluationStatus: "INELIGIBLE",
        reasonKey: "WARRANTY_EXPIRED",
        validityExpirationDate: "2023-01-01",
        usedWarrantyRepairCount: 0,
        allowedWarrantyRepairCount: 0,
        supportedWarrantyType: "STANDARD_WARRANTY",
      });

      useJobByIdMock.mockReturnValue({
        data: {
          order: { countryCode: "ZA" },
          job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
        },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);

      await waitFor(() => {
        expect(warrantyMutateAsyncMock).toHaveBeenCalledWith(
          expect.objectContaining({
            brand: "BOSCH",
            country: "ZA",
            bareToolNumber: "BT-002",
            serialNumber: "SN-002",
            purchaseDate: "2024-06-15",
          }),
        );
      });

      expect(screen.getByText("job-overview-header")).toBeInTheDocument();
    });

    it("calls mutateAsync and exercises syncWarrantyResultToAssetTab with ELIGIBLE", async () => {
      tabsDataMock.value = [assetTab];
      areaChangeTrigger.enabled = true;
      areaChangeTrigger.values = {
        brand: "BOSCH",
        baretoolNumber: "BT-003",
        serialNumber: "SN-003",
        purchaseDate: "2025-01-15",
      };
      editingSectionsMock.value = new Set(["assetData"]);
      warrantyMutateAsyncMock.mockResolvedValue({
        evaluationStatus: "ELIGIBLE",
        reasonKey: null,
        supportedWarrantyType: "STANDARD_WARRANTY",
        validityExpirationDate: "2027-01-01",
        usedWarrantyRepairCount: 0,
        allowedWarrantyRepairCount: 3,
      });

      useJobByIdMock.mockReturnValue({
        data: {
          order: { countryCode: "ZA" },
          job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
        },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);

      await waitFor(() => {
        expect(warrantyMutateAsyncMock).toHaveBeenCalledWith(
          expect.objectContaining({
            brand: "BOSCH",
            country: "ZA",
            bareToolNumber: "BT-003",
            serialNumber: "SN-003",
            purchaseDate: "2025-01-15",
          }),
        );
      });

      expect(screen.getByText("job-overview-header")).toBeInTheDocument();
    });

    it("handles mutateAsync rejection without crashing (syncWarrantyResultToAssetTab error path)", async () => {
      tabsDataMock.value = [assetTab];
      areaChangeTrigger.enabled = true;
      areaChangeTrigger.values = {
        brand: "BOSCH",
        baretoolNumber: "BT-004",
        serialNumber: "SN-004",
        purchaseDate: "2022-03-10",
      };
      editingSectionsMock.value = new Set(["assetData"]);
      warrantyMutateAsyncMock.mockRejectedValue(new Error("network error"));

      useJobByIdMock.mockReturnValue({
        data: {
          order: { countryCode: "ZA" },
          job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
        },
        isLoading: false,
        error: null,
      });

      render(<JobOverview />);

      await waitFor(() => {
        expect(screen.getByText("job-overview-header")).toBeInTheDocument();
      });

      expect(warrantyMutateAsyncMock).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Field fixtures
// ---------------------------------------------------------------------------

const makeField = (name: string, subtype: string, overrides: Partial<Field> = {}): Field =>
  ({
    name,
    label: name,
    type: "text",
    subtype,
    isDisabled: false,
    ...overrides,
  }) as Field;

beforeEach(() => {
  vi.clearAllMocks();
  locationStateMock.value = null;
  editingSectionsMock.value = new Set<string>();
  tabsDataMock.value = [
    {
      name: "assetData",
      label: "assetData",
      isTab: true,
      isAccordion: false,
      isDisabled: false,
      isHidden: false,
      isMultiple: false,
      isSubSection: false,
      hiddenForStatuses: [],
      dependFieldCondition: "",
      dependentFields: [],
      areas: [],
      actions: [],
      position: 1,
    },
  ];
  allFieldsMock.value = [];
  initialFormValuesMock.value = {};
  discountBaseMock.value = "GROSS_PRICE";
  triggerValueMock.value = 0;
  useJobByIdMock.mockReturnValue({
    data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: false } },
    isLoading: false,
    error: null,
  });
});

// ---------------------------------------------------------------------------
// Coverage: mutation callbacks, warranty tab updater, payload cache patching,
// hash-driven tab selection and analytics job-flow emission.
// ---------------------------------------------------------------------------

type TestMessage = { text: string; type: string; duration: number };

const renderWithMessages = () => {
  const setMessagesMock = vi.fn();
  const contextValue = { messages: [], setMessages: setMessagesMock };
  // A fresh element per call: re-rendering the *same* element object lets React bail out.
  const view = () => (
    <MessagesContext.Provider value={contextValue}>
      <JobOverview />
    </MessagesContext.Provider>
  );
  const utils = render(view());
  return { ...utils, setMessagesMock, rerenderView: () => utils.rerender(view()) };
};

/** Replays every functional setMessages update to get the resulting message list. */
const collectMessages = (setMessagesMock: ReturnType<typeof vi.fn>): TestMessage[] =>
  setMessagesMock.mock.calls.reduce<TestMessage[]>((acc, [update]) => {
    return typeof update === "function"
      ? (update as (prev: TestMessage[]) => TestMessage[])(acc)
      : (update as TestMessage[]);
  }, []);

const getHookOptions = (key: string): CapturedMutationOptions => {
  const options = hookOptions[key];
  if (!options) throw new Error(`Mutation hook "${key}" was not rendered`);
  return options;
};

const runOnSuccess = async (key: string, data?: unknown) => {
  await act(async () => {
    await getHookOptions(key).onSuccess?.(data);
  });
};

const runOnError = async (key: string, error: unknown = new Error("boom")) => {
  await act(async () => {
    await getHookOptions(key).onError?.(error);
  });
};

const mockJob = (jobOverrides: Record<string, unknown> = {}) => {
  useJobByIdMock.mockReturnValue({
    data: {
      order: { orderId: "O-1", countryCode: "ZA" },
      job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: false, ...jobOverrides },
    },
    isLoading: false,
    error: null,
  });
};

const makeTab = (
  name: string,
  position: number,
  hiddenForStatuses: string[] = [],
  overrides: Record<string, unknown> = {},
) => ({
  name,
  label: name,
  isTab: true,
  isAccordion: false,
  isDisabled: false,
  isHidden: false,
  isMultiple: false,
  isSubSection: false,
  hiddenForStatuses,
  dependFieldCondition: "",
  dependentFields: [],
  areas: [],
  actions: [],
  position,
  ...overrides,
});

describe("JobOverview mutation callbacks", () => {
  beforeEach(() => {
    mockJob();
  });

  describe("postMessage", () => {
    it("invalidates messages, shows success and tracks note analytics on success", async () => {
      initialFormValuesMock.value = { jobType: "REPAIR" };
      const { setMessagesMock } = renderWithMessages();

      await runOnSuccess("postMessage");

      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["messages", "J-1"],
      });
      expect(collectMessages(setMessagesMock)).toContainEqual({
        text: "successAddNote",
        type: "success",
        duration: 3000,
      });
      expect(analyticsMock.trackNoteAdded).toHaveBeenCalledWith(
        expect.objectContaining({ jobStatus: "IN_DIAGNOSTICS", jobType: "REPAIR" }),
      );
    });

    it("shows error message on failure", async () => {
      const { setMessagesMock } = renderWithMessages();

      await runOnError("postMessage");

      expect(collectMessages(setMessagesMock)).toContainEqual({
        text: "errorAddNote",
        type: "error",
        duration: 3000,
      });
    });
  });

  describe("simple invalidate-and-notify mutations", () => {
    it.each([
      {
        key: "patchJob",
        success: "successSaveAssetData",
        error: "errorSaveAssetData",
        invalidated: [["job", "J-1"]],
      },
      {
        key: "postJobStatus",
        success: "successUpdateJobStatus",
        error: "errorUpdateJobStatus",
        invalidated: [["jobs"], ["job", "J-1"]],
      },
      {
        key: "postCustomer",
        success: "successCustomerDataUpdate",
        error: "errorUpdateCustomerData",
        invalidated: [["order", "O-1"], ["job", "J-1"], ["jobs"], ["autocomplete"]],
      },
    ])("$key: invalidates queries and reports success / error", async (testCase) => {
      const { setMessagesMock } = renderWithMessages();

      await runOnSuccess(testCase.key);
      for (const queryKey of testCase.invalidated) {
        expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({ queryKey });
      }

      await runOnError(testCase.key);

      const messages = collectMessages(setMessagesMock);
      expect(messages).toContainEqual({ text: testCase.success, type: "success", duration: 3000 });
      expect(messages).toContainEqual({ text: testCase.error, type: "error", duration: 3000 });
    });
  });

  describe("toggleJobHold", () => {
    it("shows put-on-hold message when job was not on hold", async () => {
      const { setMessagesMock } = renderWithMessages();

      fireEvent.click(screen.getByRole("button", { name: "Hold" }));
      await runOnSuccess("toggleJobHold");

      expect(queryClientMock.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["jobs"] });
      expect(collectMessages(setMessagesMock)).toContainEqual({
        text: "successToggleJobHold",
        type: "success",
        duration: 3000,
      });
      expect(scrollToTopMock).toHaveBeenCalled();
    });

    it("shows resume message when job was on hold before toggling", async () => {
      mockJob({ isOnHold: true });
      const { setMessagesMock } = renderWithMessages();

      fireEvent.click(screen.getByRole("button", { name: "Hold" }));
      await runOnSuccess("toggleJobHold");

      expect(collectMessages(setMessagesMock)).toContainEqual({
        text: "successResumeJobHold",
        type: "success",
        duration: 3000,
      });
    });

    it("shows error message on failure", async () => {
      const { setMessagesMock } = renderWithMessages();

      await runOnError("toggleJobHold");

      expect(collectMessages(setMessagesMock)).toContainEqual({
        text: "errorToggleJobHold",
        type: "error",
        duration: 3000,
      });
    });
  });

  describe("approvePreApproval", () => {
    it("navigates back to approval list when no Bosch-internal approval is pending", async () => {
      queryCacheMock.value = { job: { job: { pendingApprovals: ["CUSTOMER"] } } };
      const { setMessagesMock } = renderWithMessages();

      await runOnSuccess("approvePreApproval");

      expect(queryClientMock.refetchQueries).toHaveBeenCalledWith({ queryKey: ["approvals"] });
      expect(navigateMock).toHaveBeenCalledWith("/approval-list");
      expect(scrollToTopMock).toHaveBeenCalled();
      expect(collectMessages(setMessagesMock)).toContainEqual({
        text: "successfulJobPreApprovalDecision",
        type: "success",
        duration: 3000,
      });
    });

    it("stays on the job when a Bosch-internal approval is still pending", async () => {
      queryCacheMock.value = { job: { job: { pendingApprovals: ["BOSCH_INTERNAL"] } } };
      renderWithMessages();

      await runOnSuccess("approvePreApproval");

      expect(navigateMock).not.toHaveBeenCalled();
      expect(scrollToTopMock).toHaveBeenCalled();
    });

    it("shows error message and scrolls to top on failure", async () => {
      const { setMessagesMock } = renderWithMessages();

      await runOnError("approvePreApproval");

      expect(collectMessages(setMessagesMock)).toContainEqual({
        text: "errorJobPreApprovalDecision",
        type: "error",
        duration: 3000,
      });
      expect(scrollToTopMock).toHaveBeenCalled();
    });
  });

  describe("createCostEstimate", () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    let createObjectURLMock: ReturnType<typeof vi.fn>;
    let revokeObjectURLMock: ReturnType<typeof vi.fn>;
    let openSpy: MockInstance<typeof globalThis.open> | undefined;

    beforeEach(() => {
      createObjectURLMock = vi.fn(() => "blob:cost-estimate");
      revokeObjectURLMock = vi.fn();
      URL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL;
      URL.revokeObjectURL = revokeObjectURLMock as unknown as typeof URL.revokeObjectURL;
    });

    afterEach(() => {
      vi.useRealTimers();
      // Restore only this spy: vi.restoreAllMocks() would also wipe shared vi.fn implementations.
      openSpy?.mockRestore();
      openSpy = undefined;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    });

    it("opens the generated PDF and revokes the object URL afterwards", async () => {
      vi.mocked(getCostEstimationPdf).mockResolvedValueOnce(new Blob(["pdf"]));
      openSpy = vi.spyOn(globalThis, "open").mockReturnValue({} as Window);
      const { setMessagesMock } = renderWithMessages();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      await runOnSuccess("createCostEstimate");

      expect(getCostEstimationPdf).toHaveBeenCalledWith("J-1");
      expect(openSpy).toHaveBeenCalledWith("blob:cost-estimate", "_blank");
      expect(revokeObjectURLMock).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(revokeObjectURLMock).toHaveBeenCalledWith("blob:cost-estimate");
      expect(collectMessages(setMessagesMock)).toContainEqual({
        text: "successCreateCostEstimate",
        type: "success",
        duration: 3000,
      });
    });

    it("does not schedule URL revocation when the popup is blocked", async () => {
      vi.mocked(getCostEstimationPdf).mockResolvedValueOnce(new Blob(["pdf"]));
      openSpy = vi.spyOn(globalThis, "open").mockReturnValue(null);
      renderWithMessages();
      vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

      await runOnSuccess("createCostEstimate");
      vi.advanceTimersByTime(1000);

      expect(createObjectURLMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).not.toHaveBeenCalled();
    });

    it("does not open a window when no PDF is returned", async () => {
      vi.mocked(getCostEstimationPdf).mockResolvedValueOnce(undefined as unknown as Blob);
      openSpy = vi.spyOn(globalThis, "open");
      renderWithMessages();

      await runOnSuccess("createCostEstimate");

      expect(createObjectURLMock).not.toHaveBeenCalled();
      expect(openSpy).not.toHaveBeenCalled();
    });

    it("shows error message on failure", async () => {
      const { setMessagesMock } = renderWithMessages();

      await runOnError("createCostEstimate");

      expect(collectMessages(setMessagesMock)).toContainEqual({
        text: "errorCreateCostEstimate",
        type: "error",
        duration: 3000,
      });
    });
  });

  describe("validateAndSave", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("falls back to generic simulation error when only ignored error keys are returned", async () => {
      const { setMessagesMock } = renderWithMessages();

      await runOnSuccess("validateAndSave", { errorMessages: [{ key: "2004" }] });

      expect(queryClientMock.setQueryData).not.toHaveBeenCalled();
      expect(collectMessages(setMessagesMock)).toContainEqual({
        text: "orderSimulationFailed",
        type: "error",
        duration: 5000,
      });
    });

    it("skips cache update when response carries no diagnostic data", async () => {
      renderWithMessages();

      await runOnSuccess("validateAndSave", {});

      expect(queryClientMock.setQueryData).not.toHaveBeenCalled();
      expect(markAllValidatedMock).toHaveBeenCalled();
    });

    it("shows API error message with long duration on failure", async () => {
      const { setMessagesMock } = renderWithMessages();

      await runOnError("validateAndSave");

      expect(collectMessages(setMessagesMock)).toContainEqual(
        expect.objectContaining({ type: "error", duration: 8000, text: expect.any(String) }),
      );
      expect(scrollToTopMock).toHaveBeenCalled();
    });
  });
});

describe("JobOverview updateJobOverviewWarrantyTabs (via warranty sync)", () => {
  it("rebuilds only the customerWish and warrantyDetails areas of the assetData tab", async () => {
    tabsDataMock.value = [makeTab("assetData", 2)];
    areaChangeTrigger.enabled = true;
    areaChangeTrigger.values = {
      brand: "BOSCH",
      baretoolNumber: "BT-010",
      serialNumber: "SN-010",
      purchaseDate: "2024-06-15",
    };
    editingSectionsMock.value = new Set(["assetData"]);
    warrantyMutateAsyncMock.mockResolvedValue({
      evaluationStatus: "ELIGIBLE",
      supportedWarrantyType: "STANDARD_WARRANTY",
      validityExpirationDate: "2027-01-01",
      usedWarrantyRepairCount: 0,
      allowedWarrantyRepairCount: 3,
    });
    useJobByIdMock.mockReturnValue({
      data: {
        order: { countryCode: "ZA" },
        job: { jobStatus: "READY_FOR_DIAGNOSTIC", isOnHold: false },
      },
      isLoading: false,
      error: null,
    });

    render(<JobOverview />);

    await waitFor(() => expect(setTabsMock).toHaveBeenCalled());

    type TestArea = { name: string; fields: unknown[] };
    type TestTab = { name: string; areas: TestArea[] };
    const updater = setTabsMock.mock.calls[0][0] as (prev: TestTab[]) => TestTab[];

    const otherTab: TestTab = { name: "customerAndPaymentData", areas: [] };
    const customerWishArea: TestArea = { name: "customerWish", fields: [] };
    const warrantyDetailsArea: TestArea = { name: "warrantyDetails", fields: [] };
    const unrelatedArea: TestArea = { name: "assetInfo", fields: [] };
    const assetTab: TestTab = {
      name: "assetData",
      areas: [customerWishArea, warrantyDetailsArea, unrelatedArea],
    };

    const [nextOtherTab, nextAssetTab] = updater([otherTab, assetTab]);

    expect(nextOtherTab).toBe(otherTab);
    expect(nextAssetTab).not.toBe(assetTab);
    expect(nextAssetTab.areas[0]).not.toBe(customerWishArea);
    expect(nextAssetTab.areas[0]).toEqual(
      expect.objectContaining({ name: "customerWish", fields: expect.any(Array) }),
    );
    expect(nextAssetTab.areas[1]).not.toBe(warrantyDetailsArea);
    expect(nextAssetTab.areas[1]).toEqual(
      expect.objectContaining({ name: "warrantyDetails", fields: expect.any(Array) }),
    );
    expect(nextAssetTab.areas[2]).toBe(unrelatedArea);
  });
});

describe("JobOverview tab selection from URL hash", () => {
  afterEach(() => {
    globalThis.location.hash = "";
  });

  it("selects the tab matching the hash on first render", () => {
    globalThis.location.hash = "#assetData";
    tabsDataMock.value = [makeTab("customerAndPaymentData", 1), makeTab("assetData", 2)];
    mockJob({ jobStatus: "READY_FOR_DIAGNOSTIC" });

    render(<JobOverview />);

    expect(screen.getByTestId("active-section")).toHaveTextContent("assetData");
  });

  it("falls back to the first tab, then switches once the hash tab becomes visible", () => {
    globalThis.location.hash = "#repairData";
    tabsDataMock.value = [
      makeTab("customerAndPaymentData", 1),
      makeTab("repairData", 2, ["READY_FOR_DIAGNOSTIC"]),
    ];
    mockJob({ jobStatus: "READY_FOR_DIAGNOSTIC" });

    const { rerender } = render(<JobOverview />);
    expect(screen.getByTestId("active-section")).toHaveTextContent("customerAndPaymentData");

    mockJob({ jobStatus: "IN_REPAIR" });
    rerender(<JobOverview />);

    expect(screen.getByTestId("active-section")).toHaveTextContent("repairData");
  });

  it("keeps the first tab when the hash matches no visible tab", () => {
    globalThis.location.hash = "#unknownTab";
    tabsDataMock.value = [makeTab("customerAndPaymentData", 1), makeTab("assetData", 2)];
    mockJob({ jobStatus: "READY_FOR_DIAGNOSTIC" });

    const { rerender } = render(<JobOverview />);
    rerender(<JobOverview />);

    expect(screen.getByTestId("active-section")).toHaveTextContent("customerAndPaymentData");
  });
});

// ---------------------------------------------------------------------------
// Coverage batch 2: guards, context callbacks, modal handlers, payload building,
// enable/show predicates, summary handler branches and form reset effects.
// ---------------------------------------------------------------------------

const formCtx = () => {
  if (!captured.formCtx) throw new Error("GenericFormContext not captured");
  return captured.formCtx;
};
const callbacks = () => formCtx().actionCallbacks as AnyRecord;
const lastCallArg = (mock: ReturnType<typeof vi.fn>) =>
  mock.mock.calls[mock.mock.calls.length - 1]?.[0];
const diagnosticsCtx = () => {
  if (!captured.diagnosticsCtx) throw new Error("DiagnosticsContext not captured");
  return captured.diagnosticsCtx;
};
const formikValues = () => captured.formik?.values ?? {};
const setPricesValidated = (value: boolean) => {
  act(() => {
    diagnosticsCtx().setArePricesValidated(value);
  });
};

describe("JobOverview guards when jobId is missing", () => {
  it("does not trigger any mutation or modal from actions and handlers", async () => {
    jobIdMock.value = undefined;
    tabsDataMock.value = [makeTab("assetData", 1, [], { actions: [{ name: "Edit" }] })];
    mockJob({ jobStatus: "READY_FOR_DIAGNOSTIC" });
    renderWithMessages();

    for (const name of [
      "Hold",
      "Next Step",
      "Approve Repair",
      "Request Internal",
      "Submit Review",
      "Start Repair",
      "Finish Repair",
      "Tool Delivered",
      "Create Cost",
      "Save Asset",
      "Validate",
      "Approve Pre",
      "Reject Pre",
      "Revise Pre",
    ]) {
      fireEvent.click(screen.getByRole("button", { name }));
    }
    await act(async () => {
      callbacks().onSaveNewNote({ note: "hello" });
      captured.answerModal?.onSave("REPAIR");
      captured.sectionProps?.onEdit?.();
    });

    for (const mutateMock of [
      toggleHoldMutateMock,
      startDiagnosticMutateMock,
      repairApprovalMutateMock,
      internalApprovalMutateMock,
      startReviewMutateMock,
      startRepairMutateMock,
      finishRepairMutateMock,
      toolDeliveredMutateMock,
      createCostEstimateMutateMock,
      patchJobMutateMock,
      validateAndSaveMutateMock,
      postMessageMutateMock,
      customerAnswerMutateMock,
      silentDiagnosticMutateAsyncMock,
      enableSectionEditingMock,
    ]) {
      expect(mutateMock).not.toHaveBeenCalled();
    }
    expect(screen.queryByText(/approval-decision-modal:/)).not.toBeInTheDocument();
  });
});

describe("JobOverview notes", () => {
  beforeEach(() => {
    mockJob();
  });

  it("posts a trimmed note, clears the field and leaves notes edit mode", async () => {
    renderWithMessages();
    const setFieldValue = vi.fn();

    act(() => {
      callbacks().onSaveNewNote({ note: "  hello  " }, { setFieldValue });
    });

    expect(postMessageMutateMock).toHaveBeenCalledWith({
      jobId: "J-1",
      messageId: null,
      messageType: "GENERAL",
      decision: null,
      message: "hello",
    });
    expect(setFieldValue).toHaveBeenCalledWith("note", "");
    const updater = lastCallArg(setEditingSectionsMock) as (prev: Set<string>) => Set<string>;
    expect([...updater(new Set(["notes", "assetData"]))]).toEqual(["assetData"]);
  });

  it("ignores blank notes", () => {
    renderWithMessages();

    act(() => {
      callbacks().onSaveNewNote({ note: "   " });
      callbacks().onSaveNewNote(undefined);
    });

    expect(postMessageMutateMock).not.toHaveBeenCalled();
  });

  it("cancel without helpers still exits notes edit mode", () => {
    renderWithMessages();

    act(() => {
      callbacks().onCancelNewNote();
    });

    expect(setEditingSectionsMock).toHaveBeenCalledWith(expect.any(Function));
  });
});

describe("JobOverview save customer / save asset", () => {
  beforeEach(() => {
    mockJob();
  });

  it("clears delivery address when billing address is reused and wires mutation callbacks", async () => {
    vi.mocked(mapValuesToAPI).mockReturnValueOnce({
      order: {
        customer: { useBillingAddressForDelivery: true, deliveryAddress: { street: "Main" } },
      },
    } as unknown as ReturnType<typeof mapValuesToAPI>);
    const { setMessagesMock } = renderWithMessages();

    fireEvent.click(screen.getByRole("button", { name: "Save Customer" }));

    await waitFor(() => expect(postCustomerMutateMock).toHaveBeenCalledTimes(1));
    const [variables, options] = postCustomerMutateMock.mock.calls[0] as [
      { orderId: string; payload: Record<string, unknown> },
      CapturedMutationOptions,
    ];
    expect(variables.orderId).toBe("O-1");
    expect(variables.payload.deliveryAddress).toBeNull();

    act(() => {
      options.onSuccess?.();
      options.onError?.();
    });

    expect(disableSectionEditingMock).toHaveBeenCalledWith("customerAndPaymentData");
    expect(collectMessages(setMessagesMock)).toContainEqual({
      text: "errorUpdateCustomerData",
      type: "error",
      duration: 3000,
    });
  });

  it("does not save customer without order id, form values or helpers", async () => {
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_DIAGNOSTICS", isOnHold: false } },
      isLoading: false,
      error: null,
    });
    renderWithMessages();

    await act(async () => {
      await callbacks().onSaveCustomer({}, {});
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Customer" }));

    expect(postCustomerMutateMock).not.toHaveBeenCalled();
  });

  it("saves asset without validation helpers and nulls accessories when none are selected", async () => {
    vi.mocked(mapValuesToAPI).mockReturnValueOnce(
      {} as unknown as ReturnType<typeof mapValuesToAPI>,
    );
    renderWithMessages();

    await act(async () => {
      await callbacks().onSaveAsset({ serialNumber: "SN" });
    });

    expect(actionWithValidationMock).not.toHaveBeenCalled();
    expect(patchJobMutateMock).toHaveBeenCalledWith(
      { jobId: "J-1", data: { asset: { accessories: null } } },
      expect.any(Object),
    );
    const options = patchJobMutateMock.mock.calls[0][1] as CapturedMutationOptions;
    act(() => {
      options.onSuccess?.();
    });
    expect(disableSectionEditingMock).toHaveBeenCalledWith("assetData", true);
  });

  it("does not save asset without form values", async () => {
    renderWithMessages();

    await act(async () => {
      await callbacks().onSaveAsset(undefined);
    });

    expect(patchJobMutateMock).not.toHaveBeenCalled();
  });

  it("passes working Formik helpers to the validation wrapper", async () => {
    actionWithValidationMock.mockImplementationOnce(
      async (
        _action: string,
        _values: unknown,
        helpers: unknown,
        onValid: () => void,
      ): Promise<void> => {
        const h = helpers as {
          setErrors: (e: Record<string, unknown>) => void;
          setTouched: (t: Record<string, boolean>) => Promise<unknown>;
          setFieldValue: (f: string, v: unknown) => void;
        };
        h.setErrors({ serialNumber: "required" });
        await h.setTouched({ serialNumber: true });
        h.setFieldValue("serialNumber", "set-by-helper");
        onValid();
      },
    );
    renderWithMessages();

    fireEvent.click(screen.getByRole("button", { name: "Save Asset" }));

    await waitFor(() => expect(formikValues().serialNumber).toBe("set-by-helper"));
    expect(patchJobMutateMock).toHaveBeenCalled();
  });
});

describe("JobOverview generic action dispatch", () => {
  beforeEach(() => {
    mockJob();
  });

  it("ignores empty and unknown action names", () => {
    renderWithMessages();

    act(() => {
      captured.onActionClick?.(undefined);
      captured.onActionClick?.("notAnAction");
    });

    expect(toggleHoldMutateMock).not.toHaveBeenCalled();
  });

  it("exposes action callbacks to the dependency evaluator", () => {
    renderWithMessages();

    const dependencyCallbacks = captured.dependencyCtx?.actionCallbacks ?? {};
    expect(dependencyCallbacks.enableHold?.()).toBe(true);
    expect(dependencyCallbacks.showAddRow?.()).toBe(true);
  });

  it("renders without UI configuration and treats missing hold flag as not on hold", async () => {
    uiConfigEnabledMock.value = false;
    useJobByIdMock.mockReturnValue({
      data: { job: { jobStatus: "IN_REPAIR" } },
      isLoading: false,
      error: null,
    });
    const { setMessagesMock } = renderWithMessages();

    expect(screen.queryByRole("button", { name: "Hold" })).not.toBeInTheDocument();

    act(() => {
      callbacks().onHold();
    });
    await runOnSuccess("toggleJobHold");

    expect(toggleHoldMutateMock).toHaveBeenCalledWith({ jobId: "J-1" });
    expect(collectMessages(setMessagesMock)).toContainEqual({
      text: "successToggleJobHold",
      type: "success",
      duration: 3000,
    });
  });

  it("enables section editing through the tab edit handler", () => {
    tabsDataMock.value = [makeTab("assetData", 1, [], { actions: [{ name: "Edit" }] })];
    mockJob({ jobStatus: "READY_FOR_DIAGNOSTIC" });
    renderWithMessages();

    act(() => {
      captured.sectionProps?.onEdit?.();
    });

    expect(enableSectionEditingMock).toHaveBeenCalledWith("assetData");
  });
});

describe("JobOverview special materials and explosion drawing", () => {
  beforeEach(() => {
    mockJob();
  });

  it("warns and does nothing when special materials are not allowed", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithMessages();

    fireEvent.click(screen.getByRole("button", { name: "Add Special" }));

    expect(warnSpy).toHaveBeenCalled();
    expect(captured.specialModal?.isOpen).toBe(false);
    warnSpy.mockRestore();
  });

  it("does nothing without form values even when allowed", () => {
    addSpecialMaterialsAllowedMock.value = true;
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderWithMessages();

    act(() => {
      callbacks().onAddSpecialMaterials(undefined);
    });

    expect(warnSpy).not.toHaveBeenCalled();
    expect(captured.specialModal?.isOpen).toBe(false);
    warnSpy.mockRestore();
  });

  it("opens the modal with existing part numbers and adds selected special materials", () => {
    addSpecialMaterialsAllowedMock.value = true;
    initialFormValuesMock.value = { jobType: "REPAIR" };
    renderWithMessages();

    fireEvent.click(screen.getByRole("button", { name: "Add Special" }));
    expect(captured.specialModal?.isOpen).toBe(true);
    expect(captured.specialModal?.existingPartNumbers).toEqual(new Set(["PN-X"]));

    act(() => {
      captured.specialModal?.onAddMaterials([
        { partNumber: "SM-1", partName: "Special", unitPrice: 12 },
      ]);
    });

    expect(onAddMaterialsMock).toHaveBeenCalledWith([
      {
        position: "SP",
        partNumber: "SM-1",
        description: "Special",
        type: "REPAIR",
        quantity: 1,
        unitPrice: 12,
        origin: "specialMaterial",
      },
    ]);
  });

  it("defaults material type to empty string when job type is not set", () => {
    renderWithMessages();

    act(() => {
      captured.specialModal?.onAddMaterials([{ partNumber: "SM-2", partName: "S2", unitPrice: 1 }]);
    });

    expect(onAddMaterialsMock).toHaveBeenCalledWith([expect.objectContaining({ type: "" })]);
  });

  it("syncs materials, opens explosion drawing and adds submitted positions", () => {
    initialFormValuesMock.value = { jobType: "WARRANTY" };
    renderWithMessages();

    fireEvent.click(screen.getByRole("button", { name: "Product Details" }));
    expect(setMaterialsMock).toHaveBeenCalled();

    act(() => {
      captured.explosionModal?.onSubmitParts([
        { partNumber: "EX-1", partName: "Gear", quantity: 3 },
      ]);
    });

    expect(onAddMaterialsMock).toHaveBeenCalledWith([
      {
        position: "SP",
        partNumber: "EX-1",
        notBelongsToTool: false,
        description: "Gear",
        type: "WARRANTY",
        quantity: 3,
        unitPrice: null,
        origin: "explosionDrawing",
      },
    ]);
  });

  it("maps existing materials to explosion drawing position items", () => {
    materialsMock.value = [
      {
        position: "SP",
        partNumber: "PN-1",
        description: "Motor",
        type: "CHARGEABLE",
        quantity: 2,
        unitPrice: 5,
      },
    ];
    renderWithMessages();

    expect(diagnosticsCtx().getExistingMaterialsAsPositionItems()).toEqual([
      {
        position: "SP",
        partNumber: "PN-1",
        partName: "Motor",
        type: "CHARGEABLE",
        positionType: "",
        quantity: 2,
        unitPrice: 5,
      },
    ]);
  });

  it("marks explosion-drawing materials as belonging to the tool", () => {
    allFieldsMock.value = [
      makeField("row0_partNumber", "diagnosticPartNumber"),
      makeField("row1_partNumber", "diagnosticPartNumber"),
    ];
    materialsMock.value = [
      { origin: "explosionDrawing" },
      { origin: "manual" },
      { origin: "explosionDrawing" },
    ];
    renderWithMessages();

    expect(formCtx().sparePartNotBelongsToTool.current).toEqual({ row0_partNumber: false });
  });
});

describe("JobOverview finish repair upload validation", () => {
  const uploadField = {
    name: "job_asset_upload",
    label: "upload",
    type: "upload",
    fieldMapping: { originalName: "upload" },
  } as unknown as Field;

  it("finishes repair when an invoice is attached for a warranty item", () => {
    allFieldsMock.value = [
      uploadField,
      { name: "row0_type", label: "type", type: "dropdown", subtype: "diagnosticType" } as Field,
    ];
    initialFormValuesMock.value = { purchaseDate: "2024-06-15", row0_type: "WARRANTY" };
    mockJob({ asset: { attachments: [{ type: "Invoice" }] } });
    renderWithMessages();

    fireEvent.click(screen.getByRole("button", { name: "Finish Repair" }));

    expect(finishRepairMutateMock).toHaveBeenCalledWith({ jobId: "J-1" });
  });

  it("blocks finish repair and reports upload field errors", () => {
    allFieldsMock.value = [uploadField];
    vi.mocked(getUploadFieldErrors).mockReturnValueOnce(["uploadRequired"]);
    mockJob();
    const { setMessagesMock } = renderWithMessages();

    fireEvent.click(screen.getByRole("button", { name: "Finish Repair" }));

    expect(finishRepairMutateMock).not.toHaveBeenCalled();
    expect(collectMessages(setMessagesMock)).toEqual([
      { text: "uploadRequired", type: "error", duration: 3000 },
    ]);
    expect(scrollToTopMock).toHaveBeenCalled();
  });
});

describe("JobOverview pre-approval decision", () => {
  beforeEach(() => {
    allFieldsMock.value = [
      {
        name: "row0_preApprovalCheckbox",
        label: "pre",
        type: "checkbox",
        fieldMapping: { originalName: "preApprovalCheckbox" },
      } as unknown as Field,
      {
        name: "row1_preApprovalCheckbox",
        label: "pre",
        type: "checkbox",
        fieldMapping: { originalName: "preApprovalCheckbox" },
      } as unknown as Field,
    ];
    initialFormValuesMock.value = {
      jobType: "REPAIR",
      row0_preApprovalCheckbox: true,
      row0_materialId: "M-0",
      row1_preApprovalCheckbox: false,
      row1_materialId: "M-1",
    };
    mockJob({ jobStatus: "WAITING_FOR_APPROVAL" });
  });

  it.each([
    { button: "Approve Pre", status: "APPROVED", title: "approvePreApproval" },
    { button: "Reject Pre", status: "REJECTED", title: "rejectPreApproval" },
    { button: "Revise Pre", status: "REVISED", title: "revisePreApproval" },
  ])("$button submits $status for checked materials and tracks the review", (testCase) => {
    queryCacheMock.value = { job: { job: { jobStatus: "WAITING_FOR_APPROVAL" } } };
    renderWithMessages();

    fireEvent.click(screen.getByRole("button", { name: testCase.button }));
    expect(screen.getByTestId("approval-modal-title")).toHaveTextContent(testCase.title);

    act(() => {
      captured.approvalModal?.onConfirm("looks good");
    });

    expect(approvePreApprovalMutateMock).toHaveBeenCalledWith(
      {
        jobId: "J-1",
        materialIds: ["M-0"],
        approvalStatus: testCase.status,
        message: "looks good",
      },
      expect.any(Object),
    );
    expect(screen.queryByText(/approval-decision-modal:/)).not.toBeInTheDocument();

    const options = approvePreApprovalMutateMock.mock.calls[0][1] as CapturedMutationOptions;
    options.onSuccess?.();
    expect(analyticsMock.trackPreApprovalReviewed).toHaveBeenCalledWith({
      jobType: "REPAIR",
      jobStatus: "WAITING_FOR_APPROVAL",
      preApprovalAction: testCase.status,
    });
  });

  it("sends null message for empty comment and skips analytics without job status", () => {
    renderWithMessages();

    fireEvent.click(screen.getByRole("button", { name: "Approve Pre" }));
    act(() => {
      captured.approvalModal?.onConfirm("");
    });

    expect(approvePreApprovalMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ message: null }),
      expect.any(Object),
    );
    const options = approvePreApprovalMutateMock.mock.calls[0][1] as CapturedMutationOptions;
    options.onSuccess?.();
    expect(analyticsMock.trackPreApprovalReviewed).not.toHaveBeenCalled();
  });

  it("ignores confirm without a decision and closes the modal on cancel", () => {
    renderWithMessages();

    expect(screen.getByTestId("approval-modal-title")).toBeEmptyDOMElement();
    act(() => {
      captured.approvalModal?.onConfirm("ignored");
    });
    expect(approvePreApprovalMutateMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Reject Pre" }));
    expect(screen.getByText("approval-decision-modal:rejected")).toBeInTheDocument();
    act(() => {
      captured.approvalModal?.onClose();
    });
    expect(screen.queryByText(/approval-decision-modal:/)).not.toBeInTheDocument();
  });
});

describe("JobOverview customer answer modal", () => {
  it("submits the selected answer and closes on success or cancel", () => {
    mockJob({ jobStatus: "CUSTOMER_APPROVAL_PENDING" });
    renderWithMessages();

    fireEvent.click(screen.getByRole("button", { name: "Customer Answer" }));
    expect(screen.getByTestId("answer-modal-open")).toHaveTextContent("true");

    act(() => {
      captured.answerModal?.onSave("EXCHANGE");
    });
    expect(customerAnswerMutateMock).toHaveBeenCalledWith(
      { jobId: "J-1", answer: "EXCHANGE" },
      expect.any(Object),
    );

    const options = customerAnswerMutateMock.mock.calls[0][1] as CapturedMutationOptions;
    act(() => {
      options.onSuccess?.();
    });
    expect(screen.getByTestId("answer-modal-open")).toHaveTextContent("false");

    fireEvent.click(screen.getByRole("button", { name: "Customer Answer" }));
    act(() => {
      captured.answerModal?.onClose();
    });
    expect(screen.getByTestId("answer-modal-open")).toHaveTextContent("false");
  });
});

describe("JobOverview buildDiagnosticPayload branches (validate)", () => {
  const getValidatePayload = () =>
    (validateAndSaveMutateMock.mock.calls[0][0] as { payload: AnyRecord }).payload;

  beforeEach(() => {
    hasExistingDiagnosticMock.value = false;
    mockJob();
  });

  it("applies the not-belongs-to-tool flag from the matching part number field", async () => {
    allFieldsMock.value = [
      makeField("row0_partNumber", "diagnosticPartNumber"),
      makeField("row1_partNumber", "diagnosticPartNumber"),
    ];
    vi.mocked(mapValuesToAPI).mockReturnValueOnce({
      diagnostic: {
        status: "SUBMITTED",
        materials: [
          { id: "M-1", order: 1, partNumber: "PN-1", price: { unitPrice: 1 } },
          { id: "M-2", order: 2, partNumber: "PN-2", price: { unitPrice: 2 } },
        ],
      },
    } as unknown as ReturnType<typeof mapValuesToAPI>);
    renderWithMessages();
    formCtx().sparePartNotBelongsToTool.current.row0_partNumber = true;

    fireEvent.click(screen.getByRole("button", { name: "Validate" }));

    await waitFor(() => expect(validateAndSaveMutateMock).toHaveBeenCalledTimes(1));
    const payload = getValidatePayload();
    expect(payload.materials[0].notBelongsToTool).toBe(true);
    expect(payload.materials[1]).not.toHaveProperty("notBelongsToTool");
  });

  it("validates directly when called without helpers and skips without form values", async () => {
    renderWithMessages();

    await act(async () => {
      await callbacks().onValidate(undefined);
    });
    expect(validateAndSaveMutateMock).not.toHaveBeenCalled();

    await act(async () => {
      await callbacks().onValidate({});
    });
    expect(actionWithValidationMock).not.toHaveBeenCalled();
    expect(validateAndSaveMutateMock).toHaveBeenCalledWith({
      jobId: "J-1",
      payload: expect.any(Object),
    });
  });
});

describe("JobOverview enable/show predicates", () => {
  const typeField = makeField("row0_type", "diagnosticType");
  const positionFields = [
    makeField("row0_position", "diagnosticPosition"),
    makeField("row1_position", "diagnosticPosition"),
  ];

  it("enableValidate reflects approval status, pending rows and manager state", () => {
    pendingMock.chargeable = {
      pendingTypeFields: [{ name: "row0_type" }],
      hasChargeablePending: true,
    };
    mockJob();
    renderWithMessages();

    expect(callbacks().enableValidate()).toBe(false);
    managerEnableValidateMock.mockImplementation(() => true);
    expect(callbacks().enableValidate()).toBe(true);

    pendingMock.chargeable = { pendingTypeFields: [], hasChargeablePending: false };
    expect(callbacks().enableValidate()).toBe(false);
  });

  it("enableValidate is false while customer approval is pending", () => {
    managerEnableValidateMock.mockImplementation(() => true);
    pendingMock.chargeable = {
      pendingTypeFields: [{ name: "row0_type" }],
      hasChargeablePending: true,
    };
    mockJob({ jobStatus: "CUSTOMER_APPROVAL_PENDING" });
    renderWithMessages();

    expect(callbacks().enableValidate()).toBe(false);
  });

  it("enableAddingSparePart and enableProductDetails respect position limits", () => {
    allFieldsMock.value = positionFields;
    initialFormValuesMock.value = { row0_position: "SP", row1_position: "" };
    mockJob();

    allowedPositionsMock.value = [];
    const { rerenderView } = renderWithMessages();
    expect(callbacks().enableAddingSparePart()).toBe(false);
    expect(callbacks().enableProductDetails()).toBe(false);

    allowedPositionsMock.value = [{ position: "SP", maxCount: 1 }];
    rerenderView();
    expect(callbacks().enableAddingSparePart()).toBe(false);
    expect(callbacks().enableProductDetails()).toBe(false);

    allowedPositionsMock.value = [{ position: "SP", maxCount: 2 }];
    rerenderView();
    expect(callbacks().enableAddingSparePart()).toBe(true);
    expect(callbacks().enableProductDetails()).toBe(true);
    expect(callbacks().enableAddingSpecialMaterials()).toBe(false);
    expect(callbacks().showProductDetails()).toBe(true);
  });

  it("showStartRepair depends on pending rows, permission and row types", () => {
    allFieldsMock.value = [typeField];
    initialFormValuesMock.value = { row0_type: "CHARGEABLE" };
    mockJob();
    renderWithMessages();

    expect(callbacks().showStartRepair()).toBe(true);

    pendingMock.chargeable = {
      pendingTypeFields: [{ name: "row0_type" }],
      hasChargeablePending: true,
    };
    expect(callbacks().showStartRepair()).toBe(true);
  });

  it("showStartRepair without send-for-review permission requires warranty/service rows", () => {
    permissionMock.value = false;
    pendingMock.chargeable = {
      pendingTypeFields: [{ name: "row0_type" }],
      hasChargeablePending: true,
    };
    initialFormValuesMock.value = { row0_type: "CHARGEABLE" };
    mockJob();
    const { unmount } = renderWithMessages();
    expect(callbacks().showStartRepair()).toBe(false);
    unmount();

    initialFormValuesMock.value = { row0_type: "SERVICE_OFFERING" };
    renderWithMessages();
    expect(callbacks().showStartRepair()).toBe(true);
  });

  it("request approval / approve for repair / cost estimate predicates follow price validation", () => {
    mockJob({ pendingApprovals: [] });
    renderWithMessages();

    expect(callbacks().enableRequestApproval()).toBe(false);
    expect(callbacks().enableApproveForRepair()).toBe(true);
    expect(callbacks().enableCreateCostEstimate()).toBe(false);

    setPricesValidated(true);
    expect(callbacks().enableRequestApproval()).toBe(false);
    expect(callbacks().enableApproveForRepair()).toBe(true);
    expect(callbacks().showApproveForRepair()).toBe(true);
    expect(callbacks().showRequestApproval()).toBe(false);
    expect(callbacks().showCreateCostEstimate()).toBe(false);
    expect(callbacks().enableCreateCostEstimate()).toBe(false);

    pendingMock.bosch = { pendingTypeFields: [], hasBoschInternalPending: true };
    pendingMock.chargeable = { pendingTypeFields: [], hasChargeablePending: true };
    expect(callbacks().enableRequestApproval()).toBe(true);
    expect(callbacks().showApproveForRepair()).toBe(false);
    expect(callbacks().enableApproveForRepair()).toBe(true);
    expect(callbacks().showRequestApproval()).toBe(true);
    expect(callbacks().showCreateCostEstimate()).toBe(true);
    expect(callbacks().enableCreateCostEstimate()).toBe(true);
    expect(callbacks().enableSubmitForReview()).toBe(true);
  });

  it("request approval is blocked when Bosch internal or customer approval is already pending", () => {
    pendingMock.bosch = { pendingTypeFields: [], hasBoschInternalPending: true };
    pendingMock.chargeable = { pendingTypeFields: [], hasChargeablePending: true };
    mockJob({ pendingApprovals: ["BOSCH_INTERNAL", "CUSTOMER"] });
    renderWithMessages();
    setPricesValidated(true);

    expect(callbacks().enableRequestApproval()).toBe(false);
    expect(callbacks().showRequestApproval()).toBe(false);
    expect(callbacks().showCreateCostEstimate()).toBe(false);
    expect(callbacks().enableCreateCostEstimate()).toBe(false);
    expect(callbacks().showCustomerAnswer()).toBe(true);
    expect(callbacks().enableCustomerAnswer()).toBe(true);
  });

  it("request approval is blocked while materials are revised or rejected", () => {
    materialsMock.value = [{ status: "REVISED" }];
    pendingMock.bosch = { pendingTypeFields: [], hasBoschInternalPending: true };
    mockJob();
    renderWithMessages();
    setPricesValidated(true);

    expect(callbacks().enableRequestApproval()).toBe(false);
  });

  it.each(["REVISED", "REJECTED"])(
    "request approval in %s status depends on Bosch internal pending rows",
    (status) => {
      mockJob({ jobStatus: status });
      renderWithMessages();
      setPricesValidated(true);

      expect(callbacks().enableRequestApproval()).toBe(false);
      expect(callbacks().showRequestApproval()).toBe(false);

      pendingMock.bosch = { pendingTypeFields: [], hasBoschInternalPending: true };
      expect(callbacks().enableRequestApproval()).toBe(true);
      expect(callbacks().showRequestApproval()).toBe(true);
    },
  );

  it.each([
    { status: "CUSTOMER_APPROVAL_PENDING", fromApprovalList: false, expected: true },
    { status: "MULTIPLE_APPROVAL_PENDING", fromApprovalList: false, expected: true },
    { status: "MULTIPLE_APPROVAL_PENDING", fromApprovalList: true, expected: false },
    { status: "IN_DIAGNOSTICS", fromApprovalList: false, expected: false },
  ])(
    "customer answer in $status (from approval list: $fromApprovalList) -> $expected",
    ({ status, fromApprovalList, expected }) => {
      locationStateMock.value = fromApprovalList ? { from: "approval-list" } : null;
      mockJob({ jobStatus: status });
      renderWithMessages();

      expect(callbacks().showCustomerAnswer()).toBe(expected);
      expect(callbacks().enableCustomerAnswer()).toBe(expected);
    },
  );

  it("simple pending-state enablers return true when nothing is pending", () => {
    mockJob();
    renderWithMessages();

    for (const name of [
      "enableGoToNextStep",
      "enableHold",
      "enableStartRepair",
      "enableFinishRepair",
      "enableToolDelivered",
      "enableSaveCustomer",
      "enableSaveAsset",
      "enableSaveNote",
    ]) {
      expect(callbacks()[name]()).toBe(true);
    }
    expect(callbacks().enableSubmitForReview()).toBe(false);
  });
});

describe("JobOverview form context wiring", () => {
  beforeEach(() => {
    mockJob();
  });

  it("invalidates validated prices only for diagnostic area changes", () => {
    renderWithMessages();
    setPricesValidated(true);

    act(() => {
      formCtx().onAreaValueChange("customerData");
    });
    expect(diagnosticsCtx().arePricesValidated).toBe(true);

    act(() => {
      formCtx().onAreaValueChange("diagnosticData_rows");
    });
    expect(diagnosticsCtx().arePricesValidated).toBe(false);
  });

  it("forwards setAllFields values and updaters", () => {
    renderWithMessages();
    const nextFields = [makeField("a", "x")];
    const updater = vi.fn((prev: Field[]) => [...prev, ...nextFields]);

    formCtx().setAllFields(nextFields);
    formCtx().setAllFields(updater);

    expect(setAllFieldsMock).toHaveBeenCalledWith(nextFields);
    const wrapped = lastCallArg(setAllFieldsMock) as (prev: Field[] | null) => Field[];
    expect(wrapped(null)).toEqual(nextFields);
    expect(updater).toHaveBeenCalledWith([]);
  });

  it("exposes summary type options and delete lifecycle handlers", () => {
    renderWithMessages();

    expect(formCtx().radioSourceCallbacks.getRadioButtonsForSummaryType()).toEqual([
      { value: "totalSummary", label: "totalSummary" },
    ]);
    act(() => {
      formCtx().onDeleteStart();
    });
    act(() => {
      formCtx().onDeleteEnd();
    });
    expect(screen.getByText("generic-action")).toBeInTheDocument();
  });
});

describe("JobOverview form reset and resync effects", () => {
  it("maps job data into initial values and mirrors fault code into its dropdown", () => {
    // Set explicitly: a module-level beforeEach later in this file defaults it to GROSS_PRICE.
    discountBaseMock.value = "NET_PRICE";
    allFieldsMock.value = [makeField("faultCode", "faultCode")];
    vi.mocked(convertAPIDataToFormValues).mockReturnValueOnce({ faultCode: "F-1" });
    mockJob();
    renderWithMessages();

    const updater = setInitialFormValuesMock.mock.calls[0][0] as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;
    expect(updater({ existing: true })).toEqual({
      existing: true,
      faultCode: "F-1",
      faultCodeDropdown: "F-1",
      discountBase: "NET_PRICE",
    });
  });

  it("does not add a fault code dropdown when there is no fault code", () => {
    allFieldsMock.value = [makeField("faultCode", "faultCode")];
    vi.mocked(convertAPIDataToFormValues).mockReturnValueOnce({});
    mockJob();
    renderWithMessages();

    const updater = setInitialFormValuesMock.mock.calls[0][0] as (
      prev: Record<string, unknown>,
    ) => Record<string, unknown>;
    expect(updater({})).not.toHaveProperty("faultCodeDropdown");
  });
});
