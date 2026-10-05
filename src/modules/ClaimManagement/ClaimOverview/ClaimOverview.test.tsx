/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { useContext } from "react";
import ClaimOverview from "./ClaimOverview";
import { ClaimContext } from "./ClaimContext";
import { GenericFormContext } from "components/generics/Form/GenericForm.context";
import { DiagnosticsContext } from "modules/JobManagement/JobOverview/DiagnosticsContext";
import { MessagesContext } from "contexts/messagescontext";

// ---------------------------------------------------------------------------
// Shared, mutable test state. Everything the mocked collaborators return is
// driven from here so individual tests can shape the claim, tabs and manager.
// ---------------------------------------------------------------------------
const h = vi.hoisted(() => ({
  userCountry: "PL",
  claimInCache: { jobId: "J-1" } as Record<string, unknown> | undefined,
  mutationOptions: undefined as
    | { onSuccess?: () => void; onError?: (error: unknown) => void }
    | undefined,
  postMessageMutate: vi.fn(),
  updatePrices: vi.fn(),
  updatePricesOptions: undefined as any,
  refetchQueries: vi.fn(),
  uiConfig: { isLoading: false, isError: false },
  uiConfigCountry: undefined as string | undefined,
  requestApproval: vi.fn(),
  invalidateQueries: vi.fn(),
  trackNoteAdded: vi.fn(),
  scrollToTop: vi.fn(),
  setMessages: vi.fn(),
  useClaimById: vi.fn(),
  useClaimMaterialsManager: vi.fn(),
  useDiagnosticsManager: vi.fn(),
  setInitialFormValues: vi.fn(),
  setAllFields: vi.fn(),
  setTabs: vi.fn(),
  setEditingSections: vi.fn(),
  editingSections: new Set<string>(),
  handleActionWithValidation: vi.fn(),
  areAllActionsDisabled: vi.fn(),
  setSectionDisabledState: vi.fn(),
  convertAPIDataToFormValues: vi.fn(),
  claimDecisionPermissions: { canChangeClaimDecision: true },
  formInit: {
    initialFormValues: {} as Record<string, unknown>,
    allFields: [] as any[],
    tabs: [] as any[],
  },
  mgr: {} as Record<string, any>,
  captured: {
    generic: undefined as any,
    claim: undefined as any,
    diag: undefined as any,
    sections: [] as any[],
    onTabSelect: undefined as undefined | ((e: unknown, data: { value: string }) => void),
    tabsSelectedValue: undefined as string | undefined,
  },
}));

vi.mock("@/analytics", () => ({
  useAnalytics: () => ({ trackNoteAdded: h.trackNoteAdded }),
  toClaimStatus: (status: string) => status,
  NoteContext: { CLAIM: "CLAIM" },
}));

vi.mock("utils/scrollToError", () => ({ scrollToTop: h.scrollToTop }));

vi.mock("@bosch/react-frok", () => ({
  TabNavigation: ({
    children,
    onTabSelect,
    selectedValue,
  }: {
    children: React.ReactNode;
    onTabSelect: (e: unknown, data: { value: string }) => void;
    selectedValue?: string;
  }) => {
    h.captured.onTabSelect = onTabSelect;
    h.captured.tabsSelectedValue = selectedValue;
    return <div data-testid="tab-navigation">{children}</div>;
  },
  Tab: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <a data-testid={`tab-${value}`}>{children}</a>
  ),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useParams: () => ({ claimId: "C-1" }) };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const ACTION_NAMES = [
  "onSaveNewNote",
  "onCancelNewNote",
  "onRevise",
  "onReject",
  "onApprove",
  "onEditClaim",
  "onAddRow",
  "onAddSpecialMaterials",
  "onProductDetails",
  "onValidate",
  "onRequestApproval",
  "unmappedAction",
];

const uiConfiguration = () => ({
  forms: [
    {
      name: "ClaimOverview",
      actions: [...ACTION_NAMES.map((name) => ({ name, onAction: name })), { name: "noOnAction" }],
      sections: [],
    },
  ],
});

const queryClientMock = {
  getQueryData: vi.fn((key: unknown) => {
    if (Array.isArray(key) && key[0] === "user") {
      return { countryCode: h.userCountry, permissions: [], roles: [] };
    }
    if (Array.isArray(key) && key[0] === "claim") {
      return h.claimInCache;
    }
    return undefined;
  }),
  invalidateQueries: h.invalidateQueries,
  refetchQueries: h.refetchQueries,
};

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => queryClientMock,
  useMutation: (options: { onSuccess?: () => void; onError?: (error: unknown) => void }) => {
    h.mutationOptions = options;
    return { mutate: h.postMessageMutate, mutateAsync: vi.fn(), isPending: false };
  },
}));

vi.mock("hooks/useUIConfiguration", () => ({
  useResourceUIConfiguration: (countryCode?: string | null) => {
    h.uiConfigCountry = countryCode ?? undefined;
    const unavailable = h.uiConfig.isLoading || h.uiConfig.isError;
    return {
      uiConfiguration: unavailable ? undefined : uiConfiguration(),
      countryCode: countryCode ?? undefined,
      isLoading: h.uiConfig.isLoading,
      isError: h.uiConfig.isError,
    };
  },
}));

vi.mock("hooks/useBreadcrumbs", () => ({ useBreadcrumbs: vi.fn() }));
vi.mock("hooks/useFormInitialization", () => ({
  useFormInitialization: () => ({
    initialFormValues: h.formInit.initialFormValues,
    setInitialFormValues: h.setInitialFormValues,
    allFields: h.formInit.allFields,
    setAllFields: h.setAllFields,
    mandatoryFields: null,
    tabs: h.formInit.tabs,
    setTabs: h.setTabs,
  }),
}));
vi.mock("hooks/useActionWithValidation", () => ({
  useActionWithValidation: () => h.handleActionWithValidation,
}));
vi.mock("hooks/useSectionEditing", () => ({
  useSectionEditing: () => ({
    editingSections: h.editingSections,
    setEditingSections: h.setEditingSections,
  }),
}));
vi.mock("hooks/useClaimDecisionPermissions", () => ({
  useClaimDecisionPermissions: () => h.claimDecisionPermissions,
}));
vi.mock("hooks/useDiagnosticsManager", () => ({
  useDiagnosticsManager: (args: unknown) => h.useDiagnosticsManager(args),
}));
vi.mock("hooks/useClaimMaterialsManager", () => ({
  useClaimMaterialsManager: (args: unknown) => h.useClaimMaterialsManager(args),
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
  convertAPIDataToFormValues: (...args: unknown[]) => h.convertAPIDataToFormValues(...args),
  setSectionDisabledState: (...args: unknown[]) => h.setSectionDisabledState(...args),
}));
vi.mock("components/generics/Action/actionDependency", () => ({
  areAllActionsDisabled: (...args: unknown[]) => h.areAllActionsDisabled(...args),
}));

vi.mock("components/generics/Section/GenericSection", () => ({
  default: function MockGenericSection(props: {
    section: { name: string; isDisabled?: boolean };
    onEdit?: () => void;
    currentMode?: string;
    currentStatus?: string;
  }) {
    h.captured.generic = useContext(GenericFormContext);
    h.captured.claim = useContext(ClaimContext);
    h.captured.diag = useContext(DiagnosticsContext);
    h.captured.sections.push(props);
    return (
      <div
        data-testid="generic-section"
        data-name={props.section.name}
        data-mode={props.currentMode}
      >
        {props.onEdit && (
          <button type="button" onClick={props.onEdit}>
            edit-section
          </button>
        )}
      </div>
    );
  },
}));
vi.mock("components/generics/Action/GenericAction", () => ({
  default: ({
    actions,
    onActionClick,
    isGloballyDisabled,
  }: {
    actions: Array<{ name?: string; onAction?: string }>;
    onActionClick: (action: string | undefined) => void;
    isGloballyDisabled?: boolean;
  }) => (
    <div data-testid="generic-action" data-globally-disabled={String(Boolean(isGloballyDisabled))}>
      {actions.map((action) => (
        <button
          key={action.name}
          type="button"
          onClick={() => onActionClick(action.onAction)}
        >
          {action.name}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("./ClaimOverviewHeader/ClaimOverviewHeader", () => ({
  default: () => <div>claim-overview-header</div>,
}));
vi.mock("./ClaimNoteModal/ClaimNoteModal", () => ({
  default: ({ action, isOpen, jobId }: { action: string; isOpen: boolean; jobId?: string }) => (
    <div data-testid="claim-note-modal" data-action={action} data-open={String(isOpen)}>
      {jobId}
    </div>
  ),
}));
vi.mock(
  "modules/JobManagement/JobOverview/AddSpecialMaterialModal/AddSpecialMaterialModal",
  () => ({
    default: ({
      isOpen,
      existingPartNumbers,
      onAddMaterials,
    }: {
      isOpen: boolean;
      existingPartNumbers: Set<string>;
      onAddMaterials: (items: unknown[]) => void;
    }) => (
      <div
        data-testid="special-material-modal"
        data-open={String(isOpen)}
        data-existing={[...existingPartNumbers].join(",")}
      >
        <button type="button" onClick={() => onAddMaterials([{ partNumber: "SM-1" }])}>
          confirm-special-materials
        </button>
      </div>
    ),
  }),
);
vi.mock("modules/JobManagement/JobOverview/ExplosionDiagram/ExplosionDrawingModal", () => ({
  default: ({
    onSubmitParts,
    setIsOpen,
  }: {
    onSubmitParts: (items: unknown[]) => void;
    setIsOpen: (open: boolean) => void;
  }) => (
    <div data-testid="explosion-drawing-modal">
      <button
        type="button"
        onClick={() =>
          onSubmitParts([
            { partNumber: "EX-1", partName: "Part one", quantity: 2 },
            { partNumber: "", partName: "No number", quantity: 1 },
          ])
        }
      >
        submit-explosion-parts
      </button>
      <button type="button" onClick={() => setIsOpen(false)}>
        close-explosion
      </button>
    </div>
  ),
}));
vi.mock("../../../components/ui/ActivityIndicatorWithDelay/ActivityIndicatorWithDelay", () => ({
  default: () => <div>loading-indicator</div>,
}));

vi.mock("api/services/claims/hooks", () => ({
  useClaimById: (...args: unknown[]) => h.useClaimById(...args),
  useUpdateClaimPrices: (options?: unknown) => {
    h.updatePricesOptions = options;
    return { mutate: h.updatePrices, mutateAsync: h.updatePrices, isPending: false };
  },
  useClaimRequestApproval: () => ({
    mutate: h.requestApproval,
    mutateAsync: h.requestApproval,
    isPending: false,
  }),
}));

vi.mock("api/services/jobs/action", async () => {
  const actual = await vi.importActual<object>("api/services/jobs/action");
  return { ...actual, postMessage: vi.fn() };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const SPARE_PART_SUBTYPES = [
  "diagnosticPosition",
  "diagnosticPartNumber",
  "diagnosticDescription",
  "diagnosticType",
  "diagnosticQuantity",
  "diagnosticOrder",
  "diagnosticUnitPrice",
  "diagnosticSuggestedNetPrice",
  "diagnosticNetAmount",
  "diagnosticTax",
  "diagnosticTaxAmount",
  "diagnosticGrossAmount",
  "diagnosticTotalAmount",
];

const makeSparePartArea = (prefix: string, name = `claimSpareParts_${prefix}`) => ({
  name,
  label: name,
  position: 1,
  isMultiple: true,
  dependFieldCondition: "",
  dependentFields: [],
  actions: null,
  isSubArea: false,
  fields: SPARE_PART_SUBTYPES.map((subtype) => ({ name: `${prefix}_${subtype}`, subtype })),
});

const makeSimpleArea = (name: string, actions: unknown[] | null = null) => ({
  name,
  label: name,
  position: 1,
  dependFieldCondition: "",
  dependentFields: [],
  actions,
  isSubArea: false,
  fields: [{ name: `${name}_field`, subtype: "text" }],
});

const makeTab = (name: string, overrides: Record<string, unknown> = {}) => ({
  name,
  label: name,
  position: 1,
  isHidden: false,
  dependFieldCondition: "",
  areas: [],
  actions: null,
  isSubSection: false,
  isAccordion: false,
  isTab: true,
  ...overrides,
});

const makeClaim = (overrides: Record<string, unknown> = {}) => ({
  id: "C-1",
  jobId: "J-1",
  ascId: "ASC-1",
  customerId: "CUS-1",
  ascName: "ASC name",
  diagnosticId: "D-1",
  countryCode: "PL",
  actionType: "REPAIR",
  jobType: "WARRANTY",
  typeOfUsage: "HOME",
  faultCode: "F-1",
  faultCodeDescription: "fault",
  faultCodeLabourQuantity: 1,
  exchangeReason: "",
  claimStatus: "OPEN",
  claimNotes: [],
  customer: { name: "John" },
  job: { id: "J-1" },
  materials: [
    {
      position: "ORIG-POS",
      partNumber: "ORIG-PN",
      description: "orig",
      jobType: "WARRANTY",
      quantity: 1,
      order: 1,
      price: { tax: 19, discount: 5 },
    },
  ],
  archivedMaterials: [],
  claimPriceSummary: { netAmount: 150 },
  jobDiagnostic: { id: "DIAG-1" },
  ...overrides,
});

const makeManager = (overrides: Record<string, any> = {}) => ({
  materials: [],
  setMaterials: vi.fn(),
  archivedMaterials: [],
  positionDropdownOptions: [],
  allowedPositions: [],
  automaticRows: [],
  addSpecialMaterialsAllowed: false,
  markAllValidated: vi.fn(),
  markRowDirty: vi.fn(),
  discountBase: "NET_PRICE",
  onAddRow: vi.fn(),
  onDeleteRow: vi.fn(),
  onDeleteArchivedRow: vi.fn(),
  onRestoreRow: vi.fn(),
  onAddMaterials: vi.fn(),
  getExistingPartNumbers: vi.fn(() => new Set<string>()),
  forceRebuildRef: { current: false },
  hasSyncedRef: { current: false },
  ...overrides,
});

const claimsTab = () =>
  makeTab("claims", {
    label: "claimDetails",
    areas: [
      makeSparePartArea("a0"),
      makeSparePartArea("a1"),
      makeSparePartArea("arch", "claimSpareParts_claimArchivedSpareParts_0"),
      makeSimpleArea("claimData"),
      makeSimpleArea("claimDiagnosticsSummary"),
      makeSimpleArea("otherArea"),
    ],
  });

const setClaim = (data: Record<string, unknown> | undefined, extra: Record<string, unknown> = {}) =>
  h.useClaimById.mockReturnValue({ data, isLoading: false, error: null, ...extra });

const renderClaim = () =>
  render(
    <MessagesContext.Provider value={{ messages: [], setMessages: h.setMessages }}>
      <ClaimOverview />
    </MessagesContext.Provider>,
  );

const clickAction = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

const selectTab = (value: string) => act(() => h.captured.onTabSelect?.({}, { value }));

const messagesFromSetMessages = () =>
  h.setMessages.mock.calls.reduce(
    (acc: any[], [update]: any[]) => (typeof update === "function" ? update(acc) : update),
    [],
  );

const lastSection = () => h.captured.sections.at(-1);

beforeEach(() => {
  vi.clearAllMocks();
  window.location.hash = "";
  h.userCountry = "PL";
  h.claimInCache = { jobId: "J-1" };
  h.mutationOptions = undefined;
  h.editingSections = new Set<string>();
  h.formInit.initialFormValues = {};
  h.formInit.allFields = [];
  h.formInit.tabs = [claimsTab(), makeTab("notes"), makeTab("diagnosticData")];
  h.mgr = makeManager();
  h.captured.generic = undefined;
  h.captured.claim = undefined;
  h.captured.diag = undefined;
  h.captured.sections = [];
  h.captured.onTabSelect = undefined;
  h.captured.tabsSelectedValue = undefined;
  h.claimDecisionPermissions = { canChangeClaimDecision: true };
  h.useClaimMaterialsManager.mockImplementation(() => h.mgr);
  h.handleActionWithValidation.mockImplementation(
    async (_a: string, _b: unknown, _c: unknown, onValid: () => unknown) => onValid(),
  );
  h.updatePrices.mockResolvedValue(undefined);
  h.updatePricesOptions = undefined;
  h.refetchQueries.mockResolvedValue(undefined);
  h.uiConfig = { isLoading: false, isError: false };
  h.uiConfigCountry = undefined;
  h.requestApproval.mockResolvedValue(undefined);
  h.areAllActionsDisabled.mockReturnValue(false);
  h.setSectionDisabledState.mockImplementation((section: any, disabled?: boolean) => ({
    ...section,
    isDisabled: disabled,
  }));
  h.convertAPIDataToFormValues.mockImplementation(() => ({
    faultCode: "F-1",
    claimFaultCode: "CF-1",
    header: "H",
    claims_claimSpareParts_0_x: 1,
    diagnosticData_diagnosticsSpareParts_0_x: 2,
  }));
  setClaim(makeClaim());
});

afterEach(() => {
  window.location.hash = "";
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("ClaimOverview basics", () => {
  it("renders loading state", () => {
    setClaim(undefined, { isLoading: true });

    renderClaim();

    expect(screen.getByText("loading-indicator")).toBeInTheDocument();
  });

  it("renders error state", () => {
    setClaim(undefined, { error: new Error("failed claim") });

    renderClaim();

    expect(screen.getByText(/error/i)).toBeInTheDocument();
    expect(screen.getByText(/failed claim/i)).toBeInTheDocument();
  });

  it("renders no claim found state", () => {
    setClaim(undefined);

    renderClaim();

    expect(screen.getByText("noClaimFound")).toBeInTheDocument();
  });

  it("shows the loading indicator while the UI configuration loads", () => {
    h.uiConfig.isLoading = true;

    renderClaim();

    expect(screen.getByText("loading-indicator")).toBeInTheDocument();
  });

  it("renders an error when the UI configuration cannot be resolved", () => {
    h.uiConfig.isError = true;

    renderClaim();

    expect(screen.getByText("error")).toBeInTheDocument();
    expect(screen.queryByText("claim-overview-header")).not.toBeInTheDocument();
  });

  it("resolves the UI configuration with the country of the claim", () => {
    setClaim(makeClaim({ countryCode: "TR" }));

    renderClaim();

    expect(h.uiConfigCountry).toBe("TR");
  });

  it("renders main layout when claim data exists", () => {
    renderClaim();

    expect(screen.getByText("claim-overview-header")).toBeInTheDocument();
    expect(screen.getByTestId("generic-action")).toBeInTheDocument();
  });

  it("triggers onAddRow action callback", () => {
    renderClaim();

    clickAction("onAddRow");

    expect(h.mgr.onAddRow).toHaveBeenCalledTimes(1);
  });

  it("executes validate and request-approval actions", async () => {
    renderClaim();

    ACTION_NAMES.forEach((name) => clickAction(name));

    await waitFor(() => expect(h.updatePrices).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(h.requestApproval).toHaveBeenCalledTimes(1));
  });
});

describe("ClaimOverview post message mutation", () => {
  it("invalidates messages and tracks the note on success", () => {
    renderClaim();

    act(() => h.mutationOptions?.onSuccess?.());

    expect(h.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["messages", "J-1"] });
    expect(h.trackNoteAdded).toHaveBeenCalledWith({ noteContext: "CLAIM", claimStatus: "OPEN" });
  });

  it("does not invalidate messages when the cached claim has no job id", () => {
    h.claimInCache = undefined;
    renderClaim();

    act(() => h.mutationOptions?.onSuccess?.());

    expect(h.invalidateQueries).not.toHaveBeenCalled();
    expect(h.trackNoteAdded).toHaveBeenCalled();
  });

  it("logs the error when posting fails", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderClaim();
    const error = new Error("nope");

    act(() => h.mutationOptions?.onError?.(error));

    expect(errorSpy).toHaveBeenCalledWith("Failed to post message:", error);
    errorSpy.mockRestore();
  });
});

describe("ClaimOverview tabs", () => {
  it("renders a tab per visible entry and maps the claimDetails label", () => {
    renderClaim();

    expect(screen.getByTestId("tab-claims")).toHaveTextContent("claims");
    expect(screen.getByTestId("tab-notes")).toHaveTextContent("notes");
    expect(screen.getByTestId("tab-diagnosticData")).toHaveTextContent("diagnosticData");
    expect(screen.getByTestId("generic-section")).toHaveAttribute("data-name", "claims");
  });

  it("hides tabs that are hidden for the current claim status", () => {
    h.formInit.tabs = [claimsTab(), makeTab("notes", { hiddenForStatuses: ["OPEN"] })];

    renderClaim();

    expect(screen.queryByTestId("tab-notes")).not.toBeInTheDocument();
  });

  it("selects the tab from the URL hash when it is visible", () => {
    window.location.hash = "#notes";

    renderClaim();

    expect(screen.getByTestId("generic-section")).toHaveAttribute("data-name", "notes");
  });

  it("falls back to the first tab when the hash matches no visible tab", () => {
    window.location.hash = "#doesNotExist";

    renderClaim();

    expect(screen.getByTestId("generic-section")).toHaveAttribute("data-name", "claims");
  });

  it("switches the rendered section when another tab is selected", () => {
    renderClaim();

    selectTab("diagnosticData");

    expect(screen.getByTestId("generic-section")).toHaveAttribute("data-name", "diagnosticData");
  });

  it("renders nothing for a selected tab that does not exist", () => {
    renderClaim();

    selectTab("missing");

    expect(screen.queryByTestId("generic-section")).not.toBeInTheDocument();
  });
});

describe("ClaimOverview manager wiring", () => {
  it("passes claim materials, archived materials and read-only flag to the managers", () => {
    renderClaim();

    expect(h.useClaimMaterialsManager).toHaveBeenLastCalledWith(
      expect.objectContaining({
        claimId: "C-1",
        claimMaterials: makeClaim().materials,
        claimArchivedMaterials: [],
        readOnly: true,
      }),
    );
    expect(h.useDiagnosticsManager).toHaveBeenLastCalledWith(
      expect.objectContaining({ diagnosticData: { id: "DIAG-1" }, readOnly: true }),
    );
  });

  it("withholds claim data from the managers until tabs are ready", () => {
    h.formInit.tabs = [];

    renderClaim();

    expect(h.useClaimMaterialsManager).toHaveBeenLastCalledWith(
      expect.objectContaining({ claimMaterials: undefined, claimArchivedMaterials: undefined }),
    );
    expect(h.useDiagnosticsManager).toHaveBeenLastCalledWith(
      expect.objectContaining({ diagnosticData: undefined }),
    );
  });

  it("syncs action type and job type from form values into the manager", () => {
    h.formInit.initialFormValues = { actionType: "EXCHANGE", jobType: "SERVICE" };

    renderClaim();

    expect(h.useClaimMaterialsManager).toHaveBeenLastCalledWith(
      expect.objectContaining({ currentActionType: "EXCHANGE", currentJobType: "SERVICE" }),
    );
  });

  it("switches the manager to editable after the edit claim action", () => {
    renderClaim();

    clickAction("onEditClaim");

    expect(h.useClaimMaterialsManager).toHaveBeenLastCalledWith(
      expect.objectContaining({ readOnly: false }),
    );
  });
});

describe("ClaimOverview notes", () => {
  const fillNote = (note: string) => {
    h.formInit.initialFormValues = { note };
  };

  it("posts a trimmed note, clears the field and leaves notes edit mode", async () => {
    fillNote("  hello  ");
    renderClaim();

    clickAction("onSaveNewNote");

    await waitFor(() =>
      expect(h.postMessageMutate).toHaveBeenCalledWith({
        jobId: "J-1",
        claimId: "C-1",
        messageId: null,
        messageType: "GENERAL_CLAIM",
        decision: null,
        message: "hello",
      }),
    );
    const updater = h.setEditingSections.mock.calls.at(-1)?.[0];
    expect(updater(new Set(["notes", "other"]))).toEqual(new Set(["other"]));
  });

  it("ignores blank notes", async () => {
    fillNote("   ");
    renderClaim();

    clickAction("onSaveNewNote");

    await waitFor(() => expect(h.handleActionWithValidation).toHaveBeenCalled());
    expect(h.postMessageMutate).not.toHaveBeenCalled();
    expect(h.setEditingSections).not.toHaveBeenCalled();
  });

  it("does not post when validation does not pass", async () => {
    fillNote("hello");
    h.handleActionWithValidation.mockImplementation(async () => undefined);
    renderClaim();

    clickAction("onSaveNewNote");

    await waitFor(() => expect(h.handleActionWithValidation).toHaveBeenCalled());
    expect(h.postMessageMutate).not.toHaveBeenCalled();
  });

  it("does not save a note when the claim has no job id", async () => {
    fillNote("hello");
    setClaim(makeClaim({ jobId: undefined }));
    renderClaim();

    clickAction("onSaveNewNote");

    await act(async () => {});
    expect(h.handleActionWithValidation).not.toHaveBeenCalled();
    expect(h.postMessageMutate).not.toHaveBeenCalled();
  });

  it("cancels a new note by clearing it and leaving notes edit mode", () => {
    renderClaim();

    clickAction("onCancelNewNote");

    const updater = h.setEditingSections.mock.calls.at(-1)?.[0];
    expect(updater(new Set(["notes", "other"]))).toEqual(new Set(["other"]));
  });

  it("cancel callback works without helpers", () => {
    renderClaim();

    act(() => h.captured.generic.actionCallbacks.onCancelNewNote());

    expect(h.setEditingSections).toHaveBeenCalledTimes(1);
  });

  it("save callback exposed through the form context returns early without arguments", async () => {
    renderClaim();

    await act(async () => {
      await h.captured.generic.actionCallbacks.onSaveNewNote();
    });

    expect(h.handleActionWithValidation).not.toHaveBeenCalled();
  });
});

describe("ClaimOverview claim note modal", () => {
  it.each([
    ["onRevise", "Revise"],
    ["onReject", "Reject"],
    ["onApprove", "Approve"],
  ])("%s opens the note modal for %s", (actionName, modalAction) => {
    renderClaim();

    expect(screen.getByTestId("claim-note-modal")).toHaveAttribute("data-open", "false");
    clickAction(actionName);

    const modal = screen.getByTestId("claim-note-modal");
    expect(modal).toHaveAttribute("data-open", "true");
    expect(modal).toHaveAttribute("data-action", modalAction);
    expect(modal).toHaveTextContent("J-1");
  });
});

describe("ClaimOverview generic action dispatch", () => {
  it("ignores unmapped actions and actions without a name", () => {
    renderClaim();

    clickAction("unmappedAction");
    clickAction("noOnAction");

    expect(h.mgr.onAddRow).not.toHaveBeenCalled();
    expect(h.handleActionWithValidation).not.toHaveBeenCalled();
  });

  it("adds a spare part row and invalidates validated prices", async () => {
    renderClaim();

    await validateSuccessfully();
    expect(h.captured.generic.actionCallbacks.enableRequestApproval()).toBe(true);

    clickAction("onAddRow");

    expect(h.mgr.onAddRow).toHaveBeenCalledTimes(1);
    expect(h.captured.generic.actionCallbacks.enableRequestApproval()).toBe(false);
  });

  it("opens the product details modal and closes it again", () => {
    renderClaim();

    expect(screen.queryByTestId("explosion-drawing-modal")).not.toBeInTheDocument();
    clickAction("onProductDetails");
    expect(screen.getByTestId("explosion-drawing-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "close-explosion" }));
    expect(screen.queryByTestId("explosion-drawing-modal")).not.toBeInTheDocument();
  });

  it("adds explosion drawing parts as warranty rows and ignores parts without a number", () => {
    renderClaim();
    clickAction("onProductDetails");

    fireEvent.click(screen.getByRole("button", { name: "submit-explosion-parts" }));

    expect(h.mgr.onAddMaterials).toHaveBeenCalledWith([
      {
        position: "SP",
        partNumber: "EX-1",
        description: "Part one",
        type: "WARRANTY",
        quantity: 2,
        unitPrice: null,
        origin: "explosionDrawing",
      },
    ]);
  });

  it("disables all actions while a file delete is in progress", () => {
    renderClaim();
    expect(screen.getByTestId("generic-action")).toHaveAttribute("data-globally-disabled", "false");

    act(() => h.captured.generic.onDeleteStart());
    expect(screen.getByTestId("generic-action")).toHaveAttribute("data-globally-disabled", "true");

    act(() => h.captured.generic.onDeleteEnd());
    expect(screen.getByTestId("generic-action")).toHaveAttribute("data-globally-disabled", "false");
  });
});

describe("ClaimOverview special materials", () => {
  it("does not open the modal when special materials are not allowed", () => {
    renderClaim();

    clickAction("onAddSpecialMaterials");

    expect(screen.getByTestId("special-material-modal")).toHaveAttribute("data-open", "false");
    expect(h.mgr.getExistingPartNumbers).not.toHaveBeenCalled();
  });

  it("opens the modal with existing part numbers and adds confirmed materials", async () => {
    h.mgr = makeManager({
      addSpecialMaterialsAllowed: true,
      getExistingPartNumbers: vi.fn(() => new Set(["PN-1", "PN-2"])),
    });
    renderClaim();
    await validateSuccessfully();

    clickAction("onAddSpecialMaterials");

    const modal = screen.getByTestId("special-material-modal");
    expect(modal).toHaveAttribute("data-open", "true");
    expect(modal).toHaveAttribute("data-existing", "PN-1,PN-2");

    fireEvent.click(screen.getByRole("button", { name: "confirm-special-materials" }));

    expect(h.mgr.onAddMaterials).toHaveBeenCalledWith([{ partNumber: "SM-1" }]);
    expect(h.captured.generic.actionCallbacks.enableRequestApproval()).toBe(false);
  });
});

describe("ClaimOverview validate action", () => {
  const setValues = () => {
    h.formInit.initialFormValues = {
      a0_diagnosticPosition: "SP",
      a0_diagnosticPartNumber: "PN-A",
      a0_diagnosticDescription: "Desc A",
      a0_diagnosticType: "SERVICE",
      a0_diagnosticQuantity: "3",
      a0_diagnosticOrder: "2",
      a0_diagnosticUnitPrice: "40",
      a0_diagnosticSuggestedNetPrice: "35",
      a0_diagnosticNetAmount: "100",
      a0_diagnosticTaxAmount: "19",
      a0_diagnosticGrossAmount: "119",
      a0_diagnosticTotalAmount: "110",
      a1_diagnosticOrder: "1",
      a1_diagnosticNetAmount: "50",
    };
    h.mgr = makeManager({
      archivedMaterials: [{ partNumber: "ARCH-1" }, { partNumber: "" }],
    });
  };

  it("sends the claim payload built from form values", async () => {
    setValues();
    renderClaim();

    await validateSuccessfully();

    const arg = h.updatePrices.mock.calls[0][0];
    expect(arg.claimId).toBe("C-1");
    expect(arg.payload).toEqual(
      expect.objectContaining({
        id: "C-1",
        jobId: "J-1",
        ascId: "ASC-1",
        claimStatus: "OPEN",
        jobDiagnostic: { id: "DIAG-1" },
        archivedMaterials: [{ partNumber: "ARCH-1" }],
      }),
    );
    // Materials are sorted by their order value (a1 -> 1, a0 -> 2).
    expect(arg.payload.materials.map((m: any) => m.order)).toEqual([1, 2]);
    expect(arg.payload.materials[1]).toEqual(
      expect.objectContaining({
        position: "SP",
        partNumber: "PN-A",
        description: "Desc A",
        jobType: "SERVICE",
        quantity: 3,
        isPriceSetManually: false,
        price: expect.objectContaining({
          unitPrice: 40,
          suggestedNetPrice: 35,
          netAmount: 100,
          tax: 19,
          taxAmount: 19,
          grossAmount: 119,
          discount: 5,
          totalAmount: 110,
        }),
      }),
    );
    // The second row has no original material and falls back to defaults.
    expect(arg.payload.materials[0]).toEqual(
      expect.objectContaining({ position: "", partNumber: "", description: "", quantity: 1 }),
    );
    // The claim only had a plain summary, so the detailed total is derived from it.
    expect(arg.payload.claimPriceSummary).toEqual({ netAmount: 150 });
    expect(arg.payload.claimPriceSummaryDetailed).toEqual({ total: { netAmount: 150 } });
  });

  it("derives the plain claim summary from the detailed total when only that exists", async () => {
    setClaim(
      makeClaim({
        claimPriceSummary: undefined,
        claimPriceSummaryDetailed: { total: { netAmount: 9 } },
      }),
    );
    renderClaim();

    clickAction("onValidate");

    await waitFor(() => expect(h.updatePrices).toHaveBeenCalledTimes(1));
    const { payload } = h.updatePrices.mock.calls[0][0];
    expect(payload.claimPriceSummary).toEqual({ netAmount: 9 });
    expect(payload.claimPriceSummaryDetailed).toEqual({ total: { netAmount: 9 } });
  });

  it("fills the diagnostic price summary from its detailed total", async () => {
    setClaim(
      makeClaim({
        jobDiagnostic: { id: "DIAG-1", priceSummaryDetailed: { total: { netAmount: 7 } } },
      }),
    );
    renderClaim();

    clickAction("onValidate");

    await waitFor(() => expect(h.updatePrices).toHaveBeenCalledTimes(1));
    const { payload } = h.updatePrices.mock.calls[0][0];
    expect(payload.jobDiagnostic.priceSummary).toEqual({ netAmount: 7 });
  });

  it("resets rebuild flags before sending the validation request", async () => {
    h.mgr = makeManager({ hasSyncedRef: { current: true } });
    renderClaim();

    clickAction("onValidate");

    await waitFor(() => expect(h.updatePrices).toHaveBeenCalledTimes(1));
    expect(h.mgr.forceRebuildRef.current).toBe(true);
    expect(h.mgr.hasSyncedRef.current).toBe(false);
  });

  it("marks everything validated, refetches the claim and shows a success message", async () => {
    setValues();
    renderClaim();

    await validateSuccessfully();

    expect(h.mgr.markAllValidated).toHaveBeenCalled();
    expect(h.scrollToTop).toHaveBeenCalled();
    expect(h.refetchQueries).toHaveBeenCalledWith({ queryKey: ["claim", "C-1"] });
    expect(messagesFromSetMessages()).toContainEqual({
      text: "claimPricesValidateSuccess",
      type: "success",
      duration: 3000,
    });
    expect(h.captured.generic.actionCallbacks.arePricesValidated()).toBe(true);
  });

  it("merges the server response into the form after a successful validation", async () => {
    h.formInit.allFields = [{ name: "header", subtype: "text" }];
    renderClaim();
    h.convertAPIDataToFormValues.mockClear();

    await validateSuccessfully({ ascName: "From server" });

    expect(h.convertAPIDataToFormValues).toHaveBeenCalledWith(
      expect.objectContaining({ id: "C-1", ascName: "From server" }),
      h.formInit.allFields,
      expect.anything(),
    );
  });

  it("reports an error when the price update fails", async () => {
    renderClaim();

    act(() => h.updatePricesOptions.onError(new Error("fail")));

    expect(messagesFromSetMessages()).toContainEqual({
      text: "claimPricesValidateError",
      type: "error",
      duration: 8000,
    });
    expect(h.scrollToTop).toHaveBeenCalled();
    expect(h.mgr.markAllValidated).not.toHaveBeenCalled();
  });

  it("does not send the request when validation rejects the form", async () => {
    h.handleActionWithValidation.mockImplementation(async () => undefined);
    renderClaim();

    clickAction("onValidate");

    await waitFor(() => expect(h.handleActionWithValidation).toHaveBeenCalled());
    expect(h.updatePrices).not.toHaveBeenCalled();
  });

  it("is triggered through the form context callback with helpers", async () => {
    renderClaim();

    await act(async () => {
      h.captured.generic.actionCallbacks.onValidate(
        {},
        { setErrors: vi.fn(), setTouched: vi.fn(), setFieldValue: vi.fn() },
      );
    });

    await waitFor(() => expect(h.updatePrices).toHaveBeenCalledTimes(1));
  });

  it("sends the request directly when the form context callback has no helpers", async () => {
    renderClaim();

    await act(async () => {
      h.captured.generic.actionCallbacks.onValidate({});
    });

    expect(h.handleActionWithValidation).not.toHaveBeenCalled();
    expect(h.updatePrices).toHaveBeenCalledTimes(1);
  });

  it("only merges non-row form values after a validate (skip form reset branch)", async () => {
    h.formInit.allFields = [{ name: "header", subtype: "text" }];
    h.convertAPIDataToFormValues.mockImplementation(() => ({
      header: "H",
      "claims#0_row": 1,
    }));
    renderClaim();
    clickAction("onValidate");
    await waitFor(() => expect(h.updatePrices).toHaveBeenCalledTimes(1));
    h.setInitialFormValues.mockClear();

    await act(async () => {
      await h.updatePricesOptions.onSuccess({});
    });

    const updater = h.setInitialFormValues.mock.calls[0][0];
    expect(updater({ existing: "keep" })).toEqual({
      existing: "keep",
      header: "H",
      discountBase: "NET_PRICE",
    });
  });
});

describe("ClaimOverview request approval", () => {
  it("requests approval and reports success", async () => {
    renderClaim();

    clickAction("onRequestApproval");

    await waitFor(() =>
      expect(h.requestApproval).toHaveBeenCalledWith({ claimId: "C-1", jobId: "J-1" }),
    );
    await waitFor(() =>
      expect(messagesFromSetMessages()).toContainEqual({
        text: "claimRequestApprovalSuccess",
        type: "success",
        duration: 3000,
      }),
    );
    expect(h.scrollToTop).toHaveBeenCalled();
  });

  it("reports an error when requesting approval fails", async () => {
    h.requestApproval.mockRejectedValueOnce(new Error("fail"));
    renderClaim();

    clickAction("onRequestApproval");

    await waitFor(() =>
      expect(messagesFromSetMessages()).toContainEqual({
        text: "claimRequestApprovalError",
        type: "error",
        duration: 3000,
      }),
    );
  });

  it("is triggered through the form context callback", async () => {
    renderClaim();

    await act(async () => {
      h.captured.generic.actionCallbacks.onRequestApproval(
        {},
        { setErrors: vi.fn(), setTouched: vi.fn(), setFieldValue: vi.fn() },
      );
    });

    await waitFor(() => expect(h.requestApproval).toHaveBeenCalledTimes(1));
  });
});

describe("ClaimOverview form context callbacks", () => {
  it("exposes callbacks that delegate to the managers and edit mode", () => {
    h.mgr = makeManager({ addSpecialMaterialsAllowed: true });
    renderClaim();
    const callbacks = () => h.captured.generic.actionCallbacks;
    const values = { some: "value" };

    act(() => callbacks().onAddRow(values));
    expect(h.mgr.onAddRow).toHaveBeenCalledWith(values);

    act(() => callbacks().onAddSpecialMaterials(values));
    expect(h.mgr.getExistingPartNumbers).toHaveBeenCalledWith(values);
    expect(screen.getByTestId("special-material-modal")).toHaveAttribute("data-open", "true");

    act(() => callbacks().onProductDetails());
    expect(screen.getByTestId("explosion-drawing-modal")).toBeInTheDocument();

    act(() => callbacks().onEditClaim());
    expect(lastSection().currentMode).toBe("edit");

    expect(callbacks().canChangeClaimDecision).toBe(true);
    expect(callbacks().enableValidate()).toBe(true);
    expect(callbacks().enableAddingSpecialMaterials()).toBe(true);
    expect(() => {
      callbacks().onSummaryDiscountChange();
      callbacks().onSummaryTotalAmountChange();
      h.captured.generic.setMandatoryFields();
    }).not.toThrow();
  });

  it("wraps action callbacks for the dependency evaluator with the current form values", async () => {
    renderClaim();
    const ctx = h.areAllActionsDisabled.mock.calls.at(-1)?.[1];

    expect(ctx.actionCallbacks.enableValidate()).toBe(true);
    expect(ctx.actionCallbacks.canChangeClaimDecision()).toBeUndefined();

    act(() => {
      ctx.actionCallbacks.onEditClaim();
    });
    expect(lastSection().currentMode).toBe("edit");

    act(() => {
      ctx.actionCallbacks.onCancelNewNote();
    });
    expect(h.setEditingSections).toHaveBeenCalled();

    await act(async () => {
      ctx.actionCallbacks.onValidate();
    });
    const helpers = h.handleActionWithValidation.mock.calls.at(-1)?.[2];
    expect(() =>
      act(() => {
        helpers.setErrors({ a: "x" });
        helpers.setTouched({ a: true });
        helpers.setFieldValue("a", "b");
      }),
    ).not.toThrow();
  });

  it("forwards setAllFields values and updater functions", () => {
    renderClaim();

    h.captured.generic.setAllFields([{ name: "direct" }]);
    expect(h.setAllFields).toHaveBeenLastCalledWith([{ name: "direct" }]);

    h.captured.generic.setAllFields((prev: unknown[]) => [...prev, { name: "added" }]);
    const updater = h.setAllFields.mock.calls.at(-1)?.[0];
    expect(updater(undefined)).toEqual([{ name: "added" }]);
    expect(updater([{ name: "old" }])).toEqual([{ name: "old" }, { name: "added" }]);
  });

  it("provides summary type options that can be replaced by the claim context", () => {
    renderClaim();
    const getOptions = () =>
      h.captured.generic.radioSourceCallbacks.getRadioButtonsForSummaryType();
    expect(getOptions()).toEqual([{ value: "totalSummary", label: "totalSummary" }]);

    act(() => h.captured.claim.setSummaryTypeOptions([{ value: "net", label: "net" }]));

    expect(getOptions()).toEqual([{ value: "net", label: "net" }]);
    expect(h.captured.claim.summaryTypeOptions).toEqual([{ value: "net", label: "net" }]);
  });

  it("passes the claim decision permission to the form context", () => {
    h.claimDecisionPermissions = { canChangeClaimDecision: false };

    renderClaim();

    expect(h.captured.generic.actionCallbacks.canChangeClaimDecision).toBe(false);
  });
});

describe("ClaimOverview position enablers", () => {
  const withPositions = (positionValue: string, maxCount: number, position = "SP") => {
    h.formInit.allFields = [{ name: "row0_pos", subtype: "diagnosticPosition" }];
    h.formInit.initialFormValues = { row0_pos: positionValue };
    h.mgr = makeManager({ allowedPositions: [{ position, maxCount }] });
  };

  it("enableAddingSparePart is false without allowed positions", () => {
    renderClaim();

    expect(h.captured.generic.actionCallbacks.enableAddingSparePart()).toBe(false);
  });

  it("enableAddingSparePart is true while a position is below its max count", () => {
    withPositions("", 1);
    renderClaim();

    expect(h.captured.generic.actionCallbacks.enableAddingSparePart()).toBe(true);
  });

  it("enableAddingSparePart is false once all positions reach their max count", () => {
    withPositions("SP", 1);
    renderClaim();

    expect(h.captured.generic.actionCallbacks.enableAddingSparePart()).toBe(false);
  });

  it("enableProductDetails requires an SP position with remaining capacity", () => {
    withPositions("", 1, "OTHER");
    renderClaim();
    expect(h.captured.generic.actionCallbacks.enableProductDetails()).toBe(false);
  });

  it("enableProductDetails is true when SP is below its max count", () => {
    withPositions("", 2);
    renderClaim();
    expect(h.captured.generic.actionCallbacks.enableProductDetails()).toBe(true);
  });

  it("enableProductDetails is false when SP reached its max count", () => {
    withPositions("SP", 1);
    renderClaim();
    expect(h.captured.generic.actionCallbacks.enableProductDetails()).toBe(false);
  });
});

describe("ClaimOverview explosion drawing parts", () => {
  it("marks explosion drawing rows as belonging to the tool", () => {
    h.mgr = makeManager({
      materials: [
        { origin: "explosionDrawing" },
        { origin: "manual" },
        { origin: "explosionDrawing" },
        { origin: "explosionDrawing" },
      ],
    });
    // Row 1 is not from the drawing; rows 2 and 3 have no matching spare part area (only a0, a1).
    renderClaim();

    const flags = h.captured.generic.sparePartNotBelongsToTool.current;
    expect(flags).toEqual({ a0_diagnosticPartNumber: false });
  });

  it("skips rows whose area has no part number field", () => {
    h.formInit.tabs = [
      makeTab("claims", { areas: [{ ...makeSparePartArea("a0"), fields: [] }] }),
      makeTab("notes"),
    ];
    h.mgr = makeManager({ materials: [{ origin: "explosionDrawing" }] });

    renderClaim();

    expect(h.captured.generic.sparePartNotBelongsToTool.current).toEqual({});
  });
});

describe("ClaimOverview claim context", () => {
  it("uses no-op handlers until edit mode is enabled", () => {
    renderClaim();

    expect(h.captured.claim.onAddRow).not.toBe(h.mgr.onAddRow);
    expect(h.captured.claim.canDeleteRows).toBe(false);
    expect(() => {
      h.captured.claim.onAddRow({});
      h.captured.claim.onAddMaterials([]);
      h.captured.claim.onDeleteRow("area");
      h.captured.claim.onDeleteArchivedRow("area");
      h.captured.claim.onRestoreRow("area");
    }).not.toThrow();
    expect(h.mgr.onDeleteRow).not.toHaveBeenCalled();
    expect(h.mgr.onRestoreRow).not.toHaveBeenCalled();
  });

  it("wires manager handlers in edit mode and invalidates validated prices on row changes", async () => {
    renderClaim();
    await validateSuccessfully();
    clickAction("onEditClaim");

    expect(h.captured.claim.onAddRow).toBe(h.mgr.onAddRow);
    expect(h.captured.claim.onAddMaterials).toBe(h.mgr.onAddMaterials);
    expect(h.captured.claim.onDeleteArchivedRow).toBe(h.mgr.onDeleteArchivedRow);

    h.captured.claim.onDeleteRow("claimSpareParts_0");
    expect(h.mgr.onDeleteRow).toHaveBeenCalledWith("claimSpareParts_0");
    expect(h.captured.generic.actionCallbacks.enableRequestApproval()).toBe(false);

    await validateSuccessfully();
    expect(h.captured.generic.actionCallbacks.enableRequestApproval()).toBe(true);

    h.captured.claim.onRestoreRow("claimSpareParts_0");
    expect(h.mgr.onRestoreRow).toHaveBeenCalledWith("claimSpareParts_0");
    expect(h.captured.generic.actionCallbacks.enableRequestApproval()).toBe(false);
  });

  it("allows deleting rows only for revised claims in edit mode", () => {
    setClaim(makeClaim({ claimStatus: "REVISED" }));
    renderClaim();
    expect(h.captured.claim.canDeleteRows).toBe(false);

    clickAction("onEditClaim");

    expect(h.captured.claim.canDeleteRows).toBe(true);
  });

  it("flags pending claims", () => {
    setClaim(makeClaim({ claimStatus: "PENDING" }));

    renderClaim();

    expect(h.captured.claim.isClaimPending).toBe(true);
  });

  it("marks rows dirty and invalidates validated prices", async () => {
    renderClaim();

    act(() => h.captured.claim.markRowDirty(2));

    expect(h.mgr.markRowDirty).toHaveBeenCalledWith(2);
    expect(h.captured.generic.actionCallbacks.arePricesValidated()).toBe(false);
  });

  it("detects populated prices from materials", () => {
    h.mgr = makeManager({
      materials: [{ unitPrice: 0, netAmount: 0, grossAmount: 0, totalAmount: 0 }],
    });
    const view = renderClaim();
    expect(h.captured.claim.hasPricesPopulated).toBe(false);
    view.unmount();

    h.mgr = makeManager({
      materials: [{ unitPrice: 0, netAmount: 0, grossAmount: 5, totalAmount: 0 }],
    });
    renderClaim();
    expect(h.captured.claim.hasPricesPopulated).toBe(true);
  });

  it("auto-expands the archived section when archived materials exist", async () => {
    h.mgr = makeManager({ archivedMaterials: [{ partNumber: "ARCH-1" }] });

    renderClaim();

    await waitFor(() => expect(h.captured.claim.isArchivedExpanded).toBe(true));
    expect(h.captured.claim.archivedMaterials).toEqual([{ partNumber: "ARCH-1" }]);
  });

  it("keeps the archived section collapsed without archived materials", () => {
    renderClaim();

    expect(h.captured.claim.isArchivedExpanded).toBe(false);
    act(() => h.captured.claim.setIsArchivedExpanded(true));
    expect(h.captured.claim.isArchivedExpanded).toBe(true);
  });
});

describe("ClaimOverview diagnostics context", () => {
  it("provides read-only stubs for the diagnostic data tab", () => {
    h.mgr = makeManager({ discountBase: "GROSS_PRICE" });
    renderClaim();
    const diag = h.captured.diag;

    expect(diag.discountBase).toBe("GROSS_PRICE");
    expect(diag.materials).toEqual([]);
    expect(diag.addSpecialMaterialsAllowed).toBe(false);
    expect(diag.getExistingPartNumbers()).toEqual(new Set());
    expect(() => {
      Object.values(diag).forEach((value) => {
        if (typeof value === "function") (value as () => unknown)();
      });
    }).not.toThrow();
  });
});

describe("ClaimOverview form data mapping", () => {
  it("maps claim data to form values and mirrors fault codes into dropdowns", async () => {
    h.formInit.allFields = [{ name: "faultCode", subtype: "text" }];
    h.convertAPIDataToFormValues.mockImplementation(() => ({
      faultCode: "F-1",
      claimFaultCode: "CF-1",
      header: "H",
      "claims#0_row": 1,
    }));

    renderClaim();

    await waitFor(() => expect(h.setInitialFormValues).toHaveBeenCalled());
    const [mappedClaim, mappedFields] = h.convertAPIDataToFormValues.mock.calls[0];
    expect(mappedClaim).toEqual(expect.objectContaining({ id: "C-1" }));
    expect(mappedFields).toBe(h.formInit.allFields);
    const updater = h.setInitialFormValues.mock.calls[0][0];
    expect(updater({ existing: "keep" })).toEqual({
      existing: "keep",
      faultCode: "F-1",
      faultCodeDropdown: "F-1",
      claimFaultCode: "CF-1",
      claimFaultCodeDropdown: "CF-1",
      header: "H",
      "claims#0_row": 1,
      discountBase: "NET_PRICE",
    });
  });

  it("does not add fault code dropdowns when no fault code is mapped", async () => {
    h.formInit.allFields = [{ name: "x", subtype: "text" }];
    h.convertAPIDataToFormValues.mockImplementation(() => ({ header: "H" }));

    renderClaim();

    await waitFor(() => expect(h.setInitialFormValues).toHaveBeenCalled());
    const result = h.setInitialFormValues.mock.calls[0][0]({});
    expect(result).not.toHaveProperty("faultCodeDropdown");
    expect(result).not.toHaveProperty("claimFaultCodeDropdown");
  });

  it("does not map form values before fields are available", () => {
    renderClaim();

    expect(h.convertAPIDataToFormValues).not.toHaveBeenCalled();
    expect(h.setInitialFormValues).not.toHaveBeenCalled();
  });
});

describe("ClaimOverview tab content states", () => {
  it("keeps the claims section editable and gates field disabling on edit mode", () => {
    renderClaim();

    expect(h.setSectionDisabledState).toHaveBeenCalledWith(
      expect.objectContaining({ name: "claims" }),
      true,
    );
    expect(lastSection().section.isDisabled).toBe(false);
    expect(lastSection().currentMode).toBe("view");

    clickAction("onEditClaim");

    expect(h.setSectionDisabledState).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "claims" }),
      false,
    );
    expect(lastSection().currentMode).toBe("edit");
  });

  it.each(["TR", "ZA"])(
    "disables claim data and summary areas in edit mode for %s",
    (country) => {
      h.userCountry = country;
      renderClaim();

      clickAction("onEditClaim");

      const areas = lastSection().section.areas as any[];
      const byName = (name: string) => areas.find((a) => a.name === name);
      expect(byName("claimData").isDisabled).toBe(true);
      expect(byName("claimData").fields.every((f: any) => f.isDisabled)).toBe(true);
      expect(byName("claimDiagnosticsSummary").isDisabled).toBe(true);
      expect(byName("otherArea").isDisabled).toBeUndefined();
    },
  );

  it("leaves all areas untouched in edit mode for other countries", () => {
    renderClaim();

    clickAction("onEditClaim");

    const areas = lastSection().section.areas as any[];
    expect(areas.find((a) => a.name === "claimData").isDisabled).toBeUndefined();
  });

  it("disables non-notes tabs when every action is disabled", () => {
    h.areAllActionsDisabled.mockReturnValue(true);
    renderClaim();

    selectTab("diagnosticData");

    expect(h.setSectionDisabledState).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "diagnosticData" }),
      true,
    );
  });

  it("does not force-disable the notes tab when every action is disabled", () => {
    h.areAllActionsDisabled.mockReturnValue(true);
    renderClaim();

    selectTab("notes");

    expect(h.setSectionDisabledState).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "notes" }),
    );
  });

  it("enables the notes tab while it is being edited", () => {
    h.editingSections = new Set(["notes"]);
    renderClaim();

    selectTab("notes");

    expect(h.setSectionDisabledState).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "notes" }),
      false,
    );
    expect(lastSection().currentMode).toBe("edit");
  });

  it("uses default disabled state for tabs that are not being edited", () => {
    renderClaim();

    selectTab("diagnosticData");

    expect(h.setSectionDisabledState).toHaveBeenLastCalledWith(
      expect.objectContaining({ name: "diagnosticData" }),
    );
    expect(lastSection().currentMode).toBe("view");
  });

  it("does not offer an edit handler for tabs other than notes", () => {
    renderClaim();

    expect(screen.queryByRole("button", { name: "edit-section" })).not.toBeInTheDocument();
    selectTab("diagnosticData");
    expect(screen.queryByRole("button", { name: "edit-section" })).not.toBeInTheDocument();
  });

  it("does not offer an edit handler for notes without editable actions", () => {
    renderClaim();

    selectTab("notes");

    expect(screen.queryByRole("button", { name: "edit-section" })).not.toBeInTheDocument();
  });

  it.each([
    ["section actions", { actions: [{ name: "save" }] }],
    ["area actions", { areas: [makeSimpleArea("notesArea", [{ name: "save" }])] }],
  ])("puts notes into edit mode through the edit handler with %s", (_label, overrides) => {
    h.formInit.tabs = [claimsTab(), makeTab("notes", overrides)];
    renderClaim();
    selectTab("notes");

    fireEvent.click(screen.getByRole("button", { name: "edit-section" }));

    const updater = h.setEditingSections.mock.calls.at(-1)?.[0];
    expect(updater(new Set(["other"]))).toEqual(new Set(["other", "notes"]));
  });

  it("keeps notes without any area actions read-only when areas exist but have none", () => {
    h.formInit.tabs = [
      claimsTab(),
      makeTab("notes", { areas: [makeSimpleArea("notesArea", [])] }),
    ];
    renderClaim();

    selectTab("notes");

    expect(screen.queryByRole("button", { name: "edit-section" })).not.toBeInTheDocument();
  });
});

// Runs the Validate action and completes the mutation the way react-query would,
// by invoking the onSuccess option captured from useUpdateClaimPrices.
async function validateSuccessfully(responseData: Record<string, unknown> = {}) {
  const before = h.updatePrices.mock.calls.length;
  clickAction("onValidate");
  await waitFor(() => expect(h.updatePrices.mock.calls.length).toBe(before + 1));
  await act(async () => {
    await h.updatePricesOptions.onSuccess(responseData);
  });
  expect(h.captured.generic.actionCallbacks.arePricesValidated()).toBe(true);
}
